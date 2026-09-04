import "dotenv/config";
import { readFile } from "node:fs/promises";
import { ethers } from "ethers";

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const CUSDT_MOCK = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const MAX_POOL_CAPACITY = 1_073_741_824n; // 2^30 atomic units; required by bounded FHE RNG.

if (!RPC_URL || !PRIVATE_KEY) {
  throw new Error("SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY must be configured in .env");
}
if (
  MAX_POOL_CAPACITY === 0n ||
  (MAX_POOL_CAPACITY & (MAX_POOL_CAPACITY - 1n)) !== 0n
) {
  throw new Error("Vault draw capacity must be a positive power of two");
}

const artifact = JSON.parse(
  await readFile("artifacts/contracts/EclipseVault.sol/EclipseVault.json", "utf8"),
);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
const vault = await factory.deploy(CUSDT_MOCK, MAX_POOL_CAPACITY, signer.address);
const deploymentTx = vault.deploymentTransaction();
if (!deploymentTx) throw new Error("Vault deployment transaction was not created");
const receipt = await deploymentTx.wait();
if (!receipt || receipt.status !== 1) throw new Error("Vault deployment reverted");

console.log(`VAULT CONTRACT: ${await vault.getAddress()}`);
console.log(`DEPLOYMENT TX: ${deploymentTx.hash}`);
console.log(`BLOCK: ${receipt.blockNumber}`);
console.log(`ASSET: ${CUSDT_MOCK}`);
console.log(`DEPLOYER: ${signer.address}`);
