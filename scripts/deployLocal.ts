import { ethers } from "hardhat";

/**
 * Deploys a complete mock-FHE local topology. This script is intentionally not
 * a Sepolia deployment path: MockCUSDT and the local runtime are test-only.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.deployContract("MockCUSDT", [deployer.address]);
  const vault = await ethers.deployContract("EclipseVault", [
    await token.getAddress(),
    1_073_741_824,
    deployer.address,
  ]);
  const reserve = await ethers.deployContract("PrizeReserve", [
    await token.getAddress(),
    deployer.address,
  ]);
  const draw = await ethers.deployContract("EclipseDraw", [
    await vault.getAddress(),
    await reserve.getAddress(),
  ]);
  const simulator = await ethers.deployContract("SepoliaYieldSimulator", [
    await token.getAddress(),
    await reserve.getAddress(),
  ]);

  await vault.setDrawController(await draw.getAddress());
  await reserve.setDraw(await draw.getAddress());
  await reserve.setYieldAdapter(await simulator.getAddress());

  console.log(
    JSON.stringify(
      {
        network: "hardhat-local",
        token: await token.getAddress(),
        vault: await vault.getAddress(),
        reserve: await reserve.getAddress(),
        draw: await draw.getAddress(),
        yieldSimulator: await simulator.getAddress(),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
