import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EclipseDraw", function () {
  it("rejects a non-power-of-two capacity at construction", async function () {
    if (!fhevm.isMock) this.skip();
    const [owner] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockCUSDT", [
      owner.address,
    ]);
    const vault: any = await ethers.deployContract("EclipseVault", [
      await token.getAddress(),
      1000,
      owner.address,
    ]);
    const reserve: any = await ethers.deployContract("PrizeReserve", [
      await token.getAddress(),
      owner.address,
    ]);
    const drawFactory = await ethers.getContractFactory("EclipseDraw");
    await expect(
      drawFactory.deploy(await vault.getAddress(), await reserve.getAddress()),
    )
      .to.be.revertedWithCustomError(drawFactory, "CapacityMustBePowerOfTwo")
      .withArgs(1000);
  });

  async function deployFixture(this: Mocha.Context) {
    if (!fhevm.isMock) this.skip();
    const [owner, alice, bob, funder] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockCUSDT", [
      owner.address,
    ]);
    const vault: any = await ethers.deployContract("EclipseVault", [
      await token.getAddress(),
      1024,
      owner.address,
    ]);
    const reserve: any = await ethers.deployContract("PrizeReserve", [
      await token.getAddress(),
      owner.address,
    ]);
    const draw: any = await ethers.deployContract("EclipseDraw", [
      await vault.getAddress(),
      await reserve.getAddress(),
    ]);
    const simulator: any = await ethers.deployContract(
      "SepoliaYieldSimulator",
      [await token.getAddress(), await reserve.getAddress()],
    );
    await vault.connect(owner).setDrawController(await draw.getAddress());
    await reserve.connect(owner).setDraw(await draw.getAddress());
    await reserve.connect(owner).setYieldAdapter(await simulator.getAddress());
    await token.connect(owner).mint(alice.address, 300_000_000);
    await token.connect(owner).mint(bob.address, 200_000_000);
    await token.connect(owner).mint(funder.address, 50_000_000);
    return { alice, bob, funder, token, vault, reserve, draw, simulator };
  }

  async function deposit(token: any, vault: any, signer: any, amount: bigint) {
    const encrypted = await fhevm
      .createEncryptedInput(await token.getAddress(), signer.address)
      .add64(amount)
      .encrypt();
    return token
      .connect(signer)
      [
        "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
      ](await vault.getAddress(), encrypted.handles[0], encrypted.inputProof, "0x");
  }

  it("runs an encrypted, resumable fixed-capacity sweep and finalizes once", async function () {
    const { alice, bob, funder, token, vault, draw, simulator } =
      await deployFixture.call(this);
    await deposit(token, vault, alice, 300_000_000n);
    await deposit(token, vault, bob, 200_000_000n);
    await token
      .connect(funder)
      .setOperator(await simulator.getAddress(), 2 ** 32);
    const yieldInput = await fhevm
      .createEncryptedInput(await simulator.getAddress(), funder.address)
      .add64(50_000_000)
      .encrypt();
    await simulator
      .connect(funder)
      .contributeYield(yieldInput.handles[0], yieldInput.inputProof);

    await draw.startDraw();
    expect(await vault.withdrawalsLocked()).to.equal(true);
    await draw.beginProcessing();
    await expect(draw.finalizeDraw()).to.be.revertedWithCustomError(
      draw,
      "ProcessingIncomplete",
    );
    await draw.processDrawBatch(1);
    await expect(draw.processDrawBatch(0)).to.be.revertedWithCustomError(
      draw,
      "BatchTooLarge",
    );
    await draw.processDrawBatch(1);
    await draw.finalizeDraw();
    expect(await draw.state()).to.equal(3);
    expect(await vault.withdrawalsLocked()).to.equal(false);
    await expect(draw.finalizeDraw()).to.be.revertedWithCustomError(
      draw,
      "InvalidState",
    );
    await draw.connect(alice).authorizeMyResult(1);
    await draw.connect(bob).authorizeMyResult(1);
    await draw.connect(alice).claimPrize(1);
    await draw.connect(bob).claimPrize(1);
    await expect(
      draw.connect(alice).claimPrize(1),
    ).to.be.revertedWithCustomError(draw, "AlreadyClaimed");
    await draw.openNextDraw();
    await draw.connect(alice).authorizeMyResult(1);
  });
});
