import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("PrizeReserve and SepoliaYieldSimulator", function () {
  async function deployFixture(this: Mocha.Context) {
    if (!fhevm.isMock) this.skip();
    const [owner, funder, attacker] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockCUSDT", [
      owner.address,
    ]);
    const reserve: any = await ethers.deployContract("PrizeReserve", [
      await token.getAddress(),
      owner.address,
    ]);
    const simulator: any = await ethers.deployContract(
      "SepoliaYieldSimulator",
      [await token.getAddress(), await reserve.getAddress()],
    );
    await reserve.connect(owner).setYieldAdapter(await simulator.getAddress());
    await token.connect(owner).mint(funder.address, 100_000_000);
    return { owner, funder, attacker, token, reserve, simulator };
  }

  it("accepts simulated yield only through the configured adapter", async function () {
    const { funder, token, reserve, simulator } =
      await deployFixture.call(this);
    await token
      .connect(funder)
      .setOperator(await simulator.getAddress(), 2 ** 32);

    const encrypted = await fhevm
      .createEncryptedInput(await simulator.getAddress(), funder.address)
      .add64(25_000_000)
      .encrypt();
    await expect(
      simulator
        .connect(funder)
        .contributeYield(encrypted.handles[0], encrypted.inputProof),
    )
      .to.emit(reserve, "YieldContributed")
      .withArgs(funder.address);
  });

  it("rejects a direct token callback even if an account transfers confidential tokens", async function () {
    const { funder, token, reserve } = await deployFixture.call(this);
    const encrypted = await fhevm
      .createEncryptedInput(await token.getAddress(), funder.address)
      .add64(25_000_000)
      .encrypt();

    await expect(
      token
        .connect(funder)
        [
          "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
        ](await reserve.getAddress(), encrypted.handles[0], encrypted.inputProof, "0x"),
    ).to.be.revertedWithCustomError(reserve, "OnlyYieldAdapter");
  });

  it("allows neither a random account nor the adapter to lock prize liquidity", async function () {
    const { attacker, reserve, simulator } = await deployFixture.call(this);
    await expect(
      reserve.connect(attacker).lockPrize(),
    ).to.be.revertedWithCustomError(reserve, "OnlyDraw");
    await expect(
      reserve.connect(attacker).rollOver(ethers.ZeroHash),
    ).to.be.revertedWithCustomError(reserve, "OnlyDraw");
    expect(await reserve.yieldAdapter()).to.equal(await simulator.getAddress());
  });
});
