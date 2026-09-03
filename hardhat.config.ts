import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

const mnemonic =
  process.env.MNEMONIC ??
  "test test test test test test test test test test test junk";
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "";

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
    hardhat: { chainId: 31337, accounts: { mnemonic } },
    ...(sepoliaRpcUrl
      ? {
          sepolia: {
            chainId: 11155111,
            url: sepoliaRpcUrl,
            accounts: { mnemonic },
          },
        }
      : {}),
  },
  typechain: { outDir: "types", target: "ethers-v6" },
};

export default config;
