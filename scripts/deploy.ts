import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("EclipseConfigProbe");
  const probe = await factory.deploy();
  await probe.waitForDeployment();
  console.log(`EclipseConfigProbe: ${await probe.getAddress()}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
