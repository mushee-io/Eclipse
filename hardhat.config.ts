import "dotenv/config";
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

const localMnemonic =
  process.env.MNEMONIC ??
  "test test test test test test test test test test test junk";
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL?.trim() ?? "";
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY?.trim() ?? "";
const sepoliaRequested = process.argv.includes("sepolia");

if (sepoliaRequested) {
  if (!sepoliaRpcUrl) {
    throw new Error("SEPOLIA_RPC_URL is required when using --network sepolia");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(sepoliaPrivateKey)) {
    throw new Error("SEPOLIA_PRIVATE_KEY must be a 32-byte 0x-prefixed private key");
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
      metadata: { bytecodeHash: "none" },
    },
  },
  networks: {
    hardhat: { chainId: 31337, accounts: { mnemonic: localMnemonic } },
    ...(sepoliaRpcUrl && sepoliaPrivateKey
      ? {
          sepolia: {
            chainId: 11155111,
            url: sepoliaRpcUrl,
            accounts: [sepoliaPrivateKey],
          },
        }
      : {}),
  },
  typechain: { outDir: "types", target: "ethers-v6" },
};

export default config;
