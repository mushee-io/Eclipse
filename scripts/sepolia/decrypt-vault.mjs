import "dotenv/config";
import { readFile } from "node:fs/promises";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const VAULT_ADDRESS = process.env.ECLIPSE_SEPOLIA_VAULT_ADDRESS;
if (!RPC_URL || !PRIVATE_KEY || !VAULT_ADDRESS) {
  throw new Error("SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, and ECLIPSE_SEPOLIA_VAULT_ADDRESS must be configured in .env");
}

const artifact = JSON.parse(
  await readFile("artifacts/contracts/EclipseVault.sol/EclipseVault.json", "utf8"),
);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const vault = new ethers.Contract(VAULT_ADDRESS, artifact.abi, provider);
const handle = await vault.principalOf(signer.address);
if (handle === ethers.ZeroHash) throw new Error("Vault returned an uninitialized encrypted principal handle");

const instance = await createInstance({ ...SepoliaConfig, network: RPC_URL });
const keypair = instance.generateKeypair();
const start = Math.floor(Date.now() / 1000);
const days = 10;
const contracts = [VAULT_ADDRESS];
const typed = instance.createEIP712(keypair.publicKey, contracts, start, days);
const signature = await signer.signTypedData(
  typed.domain,
  { UserDecryptRequestVerification: typed.types.UserDecryptRequestVerification },
  typed.message,
);
const result = await instance.userDecrypt(
  [{ handle, contractAddress: VAULT_ADDRESS }],
  keypair.privateKey,
  keypair.publicKey,
  signature.slice(2),
  contracts,
  signer.address,
  start,
  days,
);
const value = BigInt(result[handle]);
console.log("ENCRYPTED PRINCIPAL: YES");
console.log("USER DECRYPTION: YES");
console.log(`RECOVERED PRINCIPAL: ${value}`);
