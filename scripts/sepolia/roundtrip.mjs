import "dotenv/config";
import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { SepoliaConfig, createInstance } from "@zama-fhe/relayer-sdk/node";

const probeAddress = process.env.ECLIPSE_SEPOLIA_PROBE_ADDRESS;
if (!probeAddress) throw new Error("Set ECLIPSE_SEPOLIA_PROBE_ADDRESS in local .env");
if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_PRIVATE_KEY) throw new Error("Missing Sepolia RPC or signer configuration");

const artifact = JSON.parse(readFileSync("artifacts/contracts/EclipseSepoliaProbe.sol/EclipseSepoliaProbe.json", "utf8"));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
const probe = new Contract(probeAddress, artifact.abi, signer);
const network = await provider.getNetwork();
if (network.chainId !== 11155111n) throw new Error(`Expected Sepolia, got ${network.chainId}`);

const instance = await createInstance({ ...SepoliaConfig, network: process.env.SEPOLIA_RPC_URL });
const encryptedInput = await instance.createEncryptedInput(probeAddress, signer.address).add64(42).encrypt();
console.log("ENCRYPTED INPUT CREATED: YES");
console.log("INPUT PROOF CREATED: YES");

const write = await probe.storeEncryptedAmount(encryptedInput.handles[0], encryptedInput.inputProof);
console.log(`ENCRYPTED WRITE TX: ${write.hash}`);
await write.wait();
console.log("SEPOLIA CONFIRMED: YES");

const handle = await probe.getEncryptedAmountHandle(signer.address);
if (handle === "0x".padEnd(66, "0")) throw new Error("Probe returned an uninitialized handle");

const keypair = instance.generateKeypair();
const startTimestamp = Math.floor(Date.now() / 1000);
const durationDays = 10;
const contracts = [probeAddress];
const eip712 = instance.createEIP712(keypair.publicKey, contracts, startTimestamp, durationDays);
const signature = await signer.signTypedData(eip712.domain, { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, eip712.message);
const result = await instance.userDecrypt([{ handle, contractAddress: probeAddress }], keypair.privateKey, keypair.publicKey, signature.slice(2), contracts, signer.address, startTimestamp, durationDays);
const value = result[handle];
if (BigInt(value) !== 42n) throw new Error(`Unexpected recovered value: ${value}`);
console.log("ACL configured: YES");
console.log("User decryption: YES");
console.log(`Recovered value: ${value}`);
