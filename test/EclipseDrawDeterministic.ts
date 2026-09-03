import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EclipseDraw deterministic test seam", function () {
  async function fixture(this: Mocha.Context, randomPosition: number) {
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
    const draw: any = await ethers.deployContract("EclipseDrawHarness", [
      await vault.getAddress(),
      await reserve.getAddress(),
      randomPosition,
    ]);
    const simulator: any = await ethers.deployContract(
      "SepoliaYieldSimulator",
      [await token.getAddress(), await reserve.getAddress()],
    );
    await vault.setDrawController(await draw.getAddress());
    await reserve.setDraw(await draw.getAddress());
    await reserve.setYieldAdapter(await simulator.getAddress());
    await token.mint(alice.address, 300);
    await token.mint(bob.address, 200);
    await token.mint(funder.address, 50);
    return { alice, bob, funder, token, vault, draw, simulator };
  }

  async function deposit(token: any, vault: any, user: any, amount: number) {
    const input = await fhevm
      .createEncryptedInput(await token.getAddress(), user.address)
      .add64(amount)
      .encrypt();
    await token
      .connect(user)
      [
        "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
      ](await vault.getAddress(), input.handles[0], input.inputProof, "0x");
  }

  async function fundYield(token: any, simulator: any, funder: any) {
    await token
      .connect(funder)
      .setOperator(await simulator.getAddress(), 2 ** 32);
    const input = await fhevm
      .createEncryptedInput(await simulator.getAddress(), funder.address)
      .add64(50)
      .encrypt();
    await simulator
      .connect(funder)
      .contributeYield(input.handles[0], input.inputProof);
  }

  async function run(draw: any) {
    await draw.startDraw();
    await draw.beginProcessing();
    await draw.processDrawBatch(16);
    await draw.finalizeDraw();
  }

  it("allocates the locked prize only to the encrypted interval containing random position", async function () {
    const { alice, bob, funder, token, vault, draw, simulator } =
      await fixture.call(this, 100);
    await deposit(token, vault, alice, 300);
    await deposit(token, vault, bob, 200);
    await fundYield(token, simulator, funder);
    await run(draw);
    await draw.connect(alice).authorizeMyResult(1);
    await draw.connect(bob).authorizeMyResult(1);
    const [aliceWon, alicePrize] = await draw.encryptedResultOf(
      1,
      alice.address,
    );
    const [bobWon, bobPrize] = await draw.encryptedResultOf(1, bob.address);
    expect(
      await fhevm.userDecryptEbool(aliceWon, await draw.getAddress(), alice),
    ).to.equal(true);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        alicePrize,
        await draw.getAddress(),
        alice,
      ),
    ).to.equal(50n);
    expect(
      await fhevm.userDecryptEbool(bobWon, await draw.getAddress(), bob),
    ).to.equal(false);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobPrize,
        await draw.getAddress(),
        bob,
      ),
    ).to.equal(0n);
  });

  it("keeps all user prizes at zero when The Shadow is selected", async function () {
    const { alice, bob, funder, token, vault, draw, simulator } =
      await fixture.call(this, 800);
    await deposit(token, vault, alice, 300);
    await deposit(token, vault, bob, 200);
    await fundYield(token, simulator, funder);
    await run(draw);
    await draw.connect(alice).authorizeMyResult(1);
    await draw.connect(bob).authorizeMyResult(1);
    const [aliceWon, alicePrize] = await draw.encryptedResultOf(
      1,
      alice.address,
    );
    const [bobWon, bobPrize] = await draw.encryptedResultOf(1, bob.address);
    expect(
      await fhevm.userDecryptEbool(aliceWon, await draw.getAddress(), alice),
    ).to.equal(false);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        alicePrize,
        await draw.getAddress(),
        alice,
      ),
    ).to.equal(0n);
    expect(
      await fhevm.userDecryptEbool(bobWon, await draw.getAddress(), bob),
    ).to.equal(false);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobPrize,
        await draw.getAddress(),
        bob,
      ),
    ).to.equal(0n);
  });
});
