import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EclipseTokenIngress", function () {
  async function deployFixture(this: Mocha.Context) {
    if (!fhevm.isMock) this.skip();

    const [owner, alice, bob] = await ethers.getSigners();
    const token: any = await ethers.deployContract("MockCUSDT", [
      owner.address,
    ]);
    const ingress: any = await ethers.deployContract("EclipseTokenIngress", [
      await token.getAddress(),
    ]);

    await token.mint(alice.address, 500_000_000); // 500 cUSDT at six decimals
    return { owner, alice, bob, token, ingress };
  }

  async function confidentialDeposit(
    token: any,
    ingress: any,
    signer: any,
    amount: bigint,
  ) {
    const encrypted = await fhevm
      .createEncryptedInput(await token.getAddress(), signer.address)
      .add64(amount)
      .encrypt();

    return token
      .connect(signer)
      [
        "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
      ](await ingress.getAddress(), encrypted.handles[0], encrypted.inputProof, "0x");
  }

  it("atomically credits the token's actual encrypted transfer amount", async function () {
    const { alice, token, ingress } = await deployFixture.call(this);
    await confidentialDeposit(token, ingress, alice, 125_000_000n);

    const credited = await ingress.creditedBalanceOf(alice.address);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        credited,
        await ingress.getAddress(),
        alice,
      ),
    ).to.equal(125_000_000n);

    const tokenBalance = await token.confidentialBalanceOf(alice.address);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        tokenBalance,
        await token.getAddress(),
        alice,
      ),
    ).to.equal(375_000_000n);
  });

  it("accumulates deposits without exposing a plaintext amount in ingress events", async function () {
    const { alice, token, ingress } = await deployFixture.call(this);
    await confidentialDeposit(token, ingress, alice, 100_000_000n);
    await confidentialDeposit(token, ingress, alice, 50_000_000n);

    const credited = await ingress.creditedBalanceOf(alice.address);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        credited,
        await ingress.getAddress(),
        alice,
      ),
    ).to.equal(150_000_000n);
  });

  it("rejects a forged callback from an account other than the configured token", async function () {
    const { alice, ingress } = await deployFixture.call(this);
    await expect(
      ingress
        .connect(alice)
        .onConfidentialTransferReceived(
          alice.address,
          alice.address,
          ethers.ZeroHash,
          "0x",
        ),
    )
      .to.be.revertedWithCustomError(ingress, "OnlyConfiguredToken")
      .withArgs(alice.address);
  });
});
