import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== "sepolia") throw new Error("Run with --network sepolia");
  const [deployer] = await ethers.getSigners();
  if ((await deployer.provider!.getBalance(deployer.address)) === 0n) throw new Error("Deployer needs Sepolia ETH");
  const probe = await ethers.deployContract("EclipseSepoliaProbe");
  await probe.waitForDeployment();
  console.log(`EclipseSepoliaProbe: ${await probe.getAddress()}`);
  console.log(`Deployer: ${deployer.address}`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
