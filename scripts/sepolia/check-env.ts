import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== "sepolia") throw new Error("Run with --network sepolia");
  const [signer] = await ethers.getSigners();
  const provider = signer.provider;
  if (!provider) throw new Error("Signer has no provider");
  const [chain, balance, block] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(signer.address),
    provider.getBlockNumber(),
  ]);
  if (chain.chainId !== 11155111n)
    throw new Error(`Expected Sepolia (11155111), got ${chain.chainId}`);
  console.log("Network: Ethereum Sepolia");
  console.log(`Chain ID: ${chain.chainId}`);
  console.log(`Deployer: ${signer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Latest block: ${block}`);
  console.log("RPC: CONNECTED");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
