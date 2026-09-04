import "dotenv/config";
import { readFile } from "node:fs/promises";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const OLD_VAULT = "0xb8671991D0CF8bF445A14Dbe02558263D943396c";
const NEW_VAULT = process.env.ECLIPSE_SEPOLIA_VAULT_ADDRESS;
const CUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const AMOUNT = 84_000_000n;
if (!RPC_URL || !PRIVATE_KEY || !NEW_VAULT) throw new Error("Missing local Sepolia configuration");

const artifact = JSON.parse(await readFile("artifacts/contracts/EclipseVault.sol/EclipseVault.json", "utf8"));
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const oldVault = new ethers.Contract(OLD_VAULT, artifact.abi, signer);
const newVault = new ethers.Contract(NEW_VAULT, artifact.abi, signer);
const token = new ethers.Contract(CUSDT, ["function confidentialTransferAndCall(address,bytes32,bytes,bytes) external returns (bytes32)"], signer);
const instance = await createInstance({ ...SepoliaConfig, network: RPC_URL });

async function decryptPrincipal(vault, label) {
  const handle = await vault.principalOf(signer.address);
  const keypair = instance.generateKeypair();
  const start = Math.floor(Date.now() / 1000);
  const days = 10;
  const contracts = [await vault.getAddress()];
  const typed = instance.createEIP712(keypair.publicKey, contracts, start, days);
  const signature = await signer.signTypedData(typed.domain, { UserDecryptRequestVerification: typed.types.UserDecryptRequestVerification }, typed.message);
  const values = await instance.userDecrypt([{ handle, contractAddress: await vault.getAddress() }], keypair.privateKey, keypair.publicKey, signature.slice(2), contracts, signer.address, start, days);
  const value = BigInt(values[handle]);
  console.log(`${label}: ${value}`);
  return value;
}

if ((await decryptPrincipal(oldVault, "OLD VAULT PRINCIPAL BEFORE MIGRATION")) !== AMOUNT) throw new Error("Bootstrap vault principal does not equal the authorized migration amount");
const withdrawal = await instance.createEncryptedInput(OLD_VAULT, signer.address).add64(AMOUNT).encrypt();
const withdrawTx = await oldVault.withdraw(withdrawal.handles[0], withdrawal.inputProof);
const withdrawReceipt = await withdrawTx.wait();
if (!withdrawReceipt || withdrawReceipt.status !== 1) throw new Error("Bootstrap vault withdrawal reverted");
if ((await decryptPrincipal(oldVault, "OLD VAULT PRINCIPAL AFTER MIGRATION")) !== 0n) throw new Error("Bootstrap vault was not fully withdrawn");
const deposit = await instance.createEncryptedInput(CUSDT, signer.address).add64(AMOUNT).encrypt();
const depositTx = await token.confidentialTransferAndCall(NEW_VAULT, deposit.handles[0], deposit.inputProof, "0x");
const depositReceipt = await depositTx.wait();
if (!depositReceipt || depositReceipt.status !== 1) throw new Error("Canonical vault deposit reverted");
if ((await decryptPrincipal(newVault, "NEW VAULT PRINCIPAL AFTER MIGRATION")) !== AMOUNT) throw new Error("Canonical vault principal does not equal the migrated amount");
console.log(`MIGRATION WITHDRAW TX: ${withdrawTx.hash}`);
console.log(`MIGRATION DEPOSIT TX: ${depositTx.hash}`);
console.log("MIGRATION: PASS");
