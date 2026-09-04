import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("EclipseSepoliaProbe", function () {
  it("stores an encrypted value for its author and denies another user decryption access", async function () {
    if (!fhevm.isMock) this.skip();
    const [, alice, bob] = await ethers.getSigners();
    const probe: any = await ethers.deployContract("EclipseSepoliaProbe");
    const input = await fhevm
      .createEncryptedInput(await probe.getAddress(), alice.address)
      .add64(37)
      .encrypt();
    await probe
      .connect(alice)
      .storeEncryptedAmount(input.handles[0], input.inputProof);

    const handle = await probe.getEncryptedAmountHandle(alice.address);
    expect(
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        handle,
        await probe.getAddress(),
        alice,
      ),
    ).to.equal(37n);

    let denied = false;
    try {
      await fhevm.userDecryptEuint(
        FhevmType.euint64,
        handle,
        await probe.getAddress(),
        bob,
      );
    } catch {
      denied = true;
    }
    expect(denied).to.equal(true);
  });
});
