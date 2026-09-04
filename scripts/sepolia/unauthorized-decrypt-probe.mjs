import "dotenv/config";
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { SepoliaConfig, createInstance } from "@zama-fhe/relayer-sdk/node";

const address = process.env.ECLIPSE_SEPOLIA_PROBE_ADDRESS;
if (!address || !process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_PRIVATE_KEY) throw new Error("Missing local Sepolia configuration");
const artifact = JSON.parse(readFileSync("artifacts/contracts/EclipseSepoliaProbe.sol/EclipseSepoliaProbe.json", "utf8"));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const owner = new Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
const unauthorized = Wallet.createRandom().connect(provider);
const probe = new Contract(address, artifact.abi, provider);
const instance = await createInstance({ ...SepoliaConfig, network: process.env.SEPOLIA_RPC_URL });
const handle = await probe.getEncryptedAmountHandle(owner.address);
const keypair = instance.generateKeypair();
const start = Math.floor(Date.now() / 1000);
const days = 10;
const contracts = [address];
const typed = instance.createEIP712(keypair.publicKey, contracts, start, days);
const signature = await unauthorized.signTypedData(typed.domain, { UserDecryptRequestVerification: typed.types.UserDecryptRequestVerification }, typed.message);
try {
  await instance.userDecrypt([{ handle, contractAddress: address }], keypair.privateKey, keypair.publicKey, signature.slice(2), contracts, unauthorized.address, start, days);
  throw new Error("Unauthorized wallet unexpectedly decrypted the ciphertext");
} catch (error) {
  if (error instanceof Error && error.message.includes("unexpectedly decrypted")) throw error;
  console.log("UNAUTHORIZED USER DECRYPTION: REJECTED");
}
