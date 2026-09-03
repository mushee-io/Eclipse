import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EclipseVault", function () {
  async function deployFixture(this: Mocha.Context) {
    if (!fhevm.isMock) this.skip();
    const [owner, alice, bob] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockCUSDT", [
      owner.address,
    ]);
    const vault: any = await ethers.deployContract("EclipseVault", [
      await token.getAddress(),
      1_024_000_000,
      owner.address,
    ]);
    await token.mint(alice.address, 2_000_000_000);
    await token.mint(bob.address, 2_000_000_000);
    return { owner, alice, bob, token, vault };
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

  async function withdraw(vault: any, signer: any, amount: bigint) {
    const encrypted = await fhevm
      .createEncryptedInput(await vault.getAddress(), signer.address)
      .add64(amount)
      .encrypt();
    return vault
      .connect(signer)
      .withdraw(encrypted.handles[0], encrypted.inputProof);
  }

  async function decryptVaultBalance(vault: any, account: any) {
    return fhevm.userDecryptEuint(
      FhevmType.euint64,
      await vault.principalOf(account.address),
      await vault.getAddress(),
      account,
    );
  }

  it("credits encrypted principal and keeps it separate from the token user's balance", async function () {
    const { alice, token, vault } = await deployFixture.call(this);
    await deposit(token, vault, alice, 250_000_000n);
    expect(await decryptVaultBalance(vault, alice)).to.equal(250_000_000n);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(alice.address),
        await token.getAddress(),
        alice,
      ),
    ).to.equal(1_750_000_000n);
  });

  it("does not grant another wallet permission to decrypt a user's principal", async function () {
    const { alice, bob, token, vault } = await deployFixture.call(this);
    await deposit(token, vault, alice, 250_000_000n);
    const handle = await vault.principalOf(alice.address);
    let denied = false;
    try {
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        handle,
        await vault.getAddress(),
        bob,
      );
    } catch {
      denied = true;
    }
    expect(denied).to.equal(true);
  });

  it("refunds an over-capacity deposit without crediting principal", async function () {
    const { alice, bob, token, vault } = await deployFixture.call(this);
    await deposit(token, vault, alice, 800_000_000n);
    await deposit(token, vault, bob, 300_000_000n);

    expect(await decryptVaultBalance(vault, alice)).to.equal(800_000_000n);
    expect(await decryptVaultBalance(vault, bob)).to.equal(0n);
    expect(
      await fhevm.userDecryptEbool(
        await vault.lastDepositAccepted(bob.address),
        await vault.getAddress(),
        bob,
      ),
    ).to.equal(false);
  });

  it("supports partial withdrawal and resolves an excessive request to zero", async function () {
    const { alice, token, vault } = await deployFixture.call(this);
    await deposit(token, vault, alice, 500_000_000n);
    await withdraw(vault, alice, 125_000_000n);
    expect(await decryptVaultBalance(vault, alice)).to.equal(375_000_000n);

    await withdraw(vault, alice, 400_000_000n);
    expect(await decryptVaultBalance(vault, alice)).to.equal(375_000_000n);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(alice.address),
        await token.getAddress(),
        alice,
      ),
    ).to.equal(1_625_000_000n);
  });

  it("permits only the configured draw controller to set a temporary withdrawal lock", async function () {
    const { owner, alice, bob, vault } = await deployFixture.call(this);
    await vault.connect(owner).setDrawController(bob.address);
    await expect(
      vault.connect(alice).setWithdrawalsLocked(true),
    ).to.be.revertedWithCustomError(vault, "OnlyDrawController");
    await vault.connect(bob).setWithdrawalsLocked(true);
    expect(await vault.withdrawalsLocked()).to.equal(true);
  });
});
