import "dotenv/config";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const VAULT_ADDRESS = process.env.ECLIPSE_SEPOLIA_VAULT_ADDRESS;
const CUSDT_MOCK = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const USDT_MOCK = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0";
const DEPOSIT_AMOUNT = 42_000_000n; // 42 cUSDT at the wrapper's six-decimal precision.

if (!RPC_URL || !PRIVATE_KEY || !VAULT_ADDRESS) {
  throw new Error(
    "SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, and ECLIPSE_SEPOLIA_VAULT_ADDRESS must be configured in .env",
  );
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const erc20 = new ethers.Contract(
  USDT_MOCK,
  [
    "function mint(address to, uint256 amount) external",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ],
  signer,
);
const wrapper = new ethers.Contract(
  CUSDT_MOCK,
  [
    "function rate() view returns (uint256)",
    "function wrap(address to, uint256 amount) external returns (bytes32)",
    "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes inputProof, bytes data) external returns (bytes32)",
  ],
  signer,
);
const vault = new ethers.Contract(
  VAULT_ADDRESS,
  ["function principalOf(address account) view returns (bytes32)"],
  signer,
);

const rate = await wrapper.rate();
const underlyingAmount = DEPOSIT_AMOUNT * rate;

let receipt;
if (process.env.ECLIPSE_SEPOLIA_SKIP_WRAP !== "1") {
  console.log("MINTING UNDERLYING: STARTED");
  receipt = await (await erc20.mint(signer.address, underlyingAmount)).wait();
  if (!receipt || receipt.status !== 1)
    throw new Error("Underlying USDTMock mint reverted");
  console.log("APPROVING WRAPPER: STARTED");
  receipt = await (await erc20.approve(CUSDT_MOCK, underlyingAmount)).wait();
  if (!receipt || receipt.status !== 1) throw new Error("USDTMock approval reverted");
  console.log("WRAPPING CONFIDENTIAL USDT: STARTED");
  receipt = await (await wrapper.wrap(signer.address, underlyingAmount)).wait();
  if (!receipt || receipt.status !== 1) throw new Error("cUSDTMock wrap reverted");
}

console.log("CREATING ENCRYPTED DEPOSIT INPUT: STARTED");
const instance = await createInstance({ ...SepoliaConfig, network: RPC_URL });
const encrypted = await instance
  .createEncryptedInput(CUSDT_MOCK, signer.address)
  .add64(DEPOSIT_AMOUNT)
  .encrypt();
const writeTx = await wrapper.confidentialTransferAndCall(
  VAULT_ADDRESS,
  encrypted.handles[0],
  encrypted.inputProof,
  "0x",
);
receipt = await writeTx.wait();
if (!receipt || receipt.status !== 1) throw new Error("Confidential vault deposit reverted");

const handle = await vault.principalOf(signer.address);
if (handle === ethers.ZeroHash) throw new Error("Vault did not store an encrypted principal handle");
const start = Math.floor(Date.now() / 1000);
const keypair = instance.generateKeypair();
const eip712 = instance.createEIP712(
  keypair.publicKey,
  [VAULT_ADDRESS],
  start,
  10,
);
const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);
const result = await instance.userDecrypt(
  [{ handle, contractAddress: VAULT_ADDRESS }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace(/^0x/, ""),
  [VAULT_ADDRESS],
  signer.address,
  start,
  10,
);
const recovered = result[handle];
if (recovered !== DEPOSIT_AMOUNT) {
  throw new Error(`Unexpected decrypted principal: ${String(recovered)}`);
}

console.log("CONFIDENTIAL USDT: VERIFIED");
console.log("VAULT DEPOSIT: CONFIRMED");
console.log(`DEPOSIT TX: ${writeTx.hash}`);
console.log(`BLOCK: ${receipt.blockNumber}`);
console.log("ENCRYPTED PRINCIPAL: YES");
console.log(`RECOVERED PRINCIPAL: ${recovered.toString()}`);
