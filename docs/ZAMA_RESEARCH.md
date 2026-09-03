# Zama integration research — 3 September 2026

This note records the implementation baseline before Eclipse core contracts are written. It is intentionally conservative: APIs are pinned to the version pairing used by Zama's maintained `dapps` Hardhat template, not merely the highest version visible on npm.

## Chosen baseline

| Layer              | Selected version / choice                                      | Reason                                                                                    |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Solidity           | 0.8.27, Cancun EVM                                             | Current OpenZeppelin confidential-contracts examples use `^0.8.27`.                       |
| FHE Solidity       | `@fhevm/solidity` 0.11.1                                       | Pairing used by Zama's current public Hardhat dapp template.                              |
| FHE Hardhat plugin | `@fhevm/hardhat-plugin` 0.4.2                                  | Compatible with the selected Solidity/template baseline.                                  |
| Relayer            | `@zama-fhe/relayer-sdk` 0.4.1                                  | Template pairing; user decryption is a client-side re-encryption flow.                    |
| Confidential asset | ERC-7984 interface / OpenZeppelin confidential-contracts 0.5.3 | The vault must interact with a real confidential token, not mimic encryption with `uint`. |
| Network            | Ethereum Sepolia (11155111)                                    | `ZamaEthereumConfig` configures the Zama Ethereum/Sepolia coprocessor addresses.          |

`@fhevm/solidity` 0.13.3 and later packages were visible during research, but the official Hardhat template was still pinned to 0.11.1/plugin 0.4.2. Eclipse will upgrade only after a clean compilation plus local mock-FHE and Sepolia smoke test against a verified official compatibility matrix.

## Current API facts used by the design

- Use `FHE` and `externalEuint64`, not legacy `TFHE` and `einput`.
- Ingest user ciphertext with `FHE.fromExternal(externalEuint64, inputProof)`. The proof binds encrypted input to the intended caller/contract context.
- Use `euint64` for cUSDT atomic units and all draw ranges. Capacity is public `1_024 * 10^6` units, safely below `uint64` limits.
- `FHE.add`, `FHE.sub`, `FHE.lt`, `FHE.ge`, `FHE.and`, and `FHE.select` operate over ciphertexts. Arithmetic is unchecked and wraps, so Eclipse must select a safe result rather than rely on revert-on-overflow.
- Bounded encrypted randomness is available as `FHE.randEuint64(uint64 upperBound)`, producing a hidden value in `[0, upperBound)`. The public upper bound is `MAX_POOL_CAPACITY`, never encrypted TVL.
- Every ciphertext persisted for future computation needs `FHE.allowThis(value)`. A user-returned handle needs `FHE.allow(value, user)`. Cross-contract execution requires explicit grants to each receiving contract, with the final interface verified against the chosen ERC-7984 release.
- User decryption is not public decryption. The browser fetches an authorized ciphertext handle, creates a NaCl keypair, signs the relayer's EIP-712 authorization with the user's wallet, then calls `instance.userDecrypt(...)`. Plaintext stays in volatile browser state.
- FHE operations consume a per-transaction operation budget (the prior per-block model is obsolete). Eclipse therefore uses a fixed upper bound per `processDrawBatch`, records progress, and never uses an unbounded loop.

## Sepolia deployment facts

- Inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol`; it covers Ethereum mainnet and Sepolia. Do not hard-code coprocessor, ACL, or KMS addresses in Eclipse.
- No current official `cUSDTMock` address was treated as a source of truth during bootstrap. The deployment scripts will require an explicitly configured, verified ERC-7984 token address and validate ERC-165/interface support before wiring production-candidate contracts. A locally deployed mock is test-only.

## Dark Capacity Draw feasibility

The core algorithm is supported: a fixed public capacity can bound FHE randomness, and encrypted comparisons plus selections can evaluate encrypted cumulative ranges without decryption. An encrypted `isWinner` bit is maintained for every processed participant; the selected prize is `FHE.select(isWinner, drawPrize, zero)`.

**Important current limitation:** the deployed/mock FHE runtime rejects `randEuint64(upperBound)` unless `upperBound` is a power of two (`NotPowerOfTwo`). Eclipse therefore uses a power-of-two public atomic-unit capacity (the bootstrap probe uses `2^30 = 1,073,741,824` atomic units, or `1,073.741824 cUSDT` at six decimals). This retains exact uniform selection without modulo bias. A displayed `1,024 cUSDT` product capacity requires a ticket/share denomination layer; it cannot be passed directly as `1,024,000,000` to the current bounded RNG without reverting. The Draw constructor enforces this constraint.

Two design constraints matter:

1. **A single designated winner is still required.** Intervals are disjoint if balances and the running total are maintained correctly; this will be asserted through a test-only decrypt seam. Finalization must preserve the encrypted winner result without revealing it.
2. **ERC-7984 transfer composition is an integration gate.** The official Zama example performs `FHE.fromExternal`, grants the token `FHE.allowTransient(amount, token)`, and then calls `confidentialTransferFrom`, which returns an encrypted transferred amount. Eclipse will adopt this same returned handle as the only input to principal accounting; it will not invent a parallel amount or a transfer-and-call primitive that the token does not provide. Phase 2 must prove token custody, returned-handle permissions, and ledger liability remain aligned.

## Privacy boundaries and honest claims

Protected: encrypted balance, cumulative boundaries, random position, winner flag, draw prize allocation, and user-visible prize value. Public: contracts, capacity, state transitions, participant-registration transactions and addresses, timing, transaction hashes, batch count and draw number.

Eclipse does **not** claim participant anonymity: an account that deposits/withdraws is visible at the Ethereum transaction layer. It protects financial positions, not network metadata. A public ERC-7984 transfer event may also reveal endpoints, even when the amount handle is encrypted.

Claiming an externally transferable prize can also reveal that the claimant is interacting with the claim function. Eclipse's private-result path therefore protects winner determination and amount, while a later public claim transaction is an unavoidable metadata limitation. Private auto-compounding (when safely implemented) avoids that additional transfer signal.

## Capacity-admission policy

Immediate accept/reject on an encrypted capacity predicate is a capacity oracle: repeated deposits can bracket remaining capacity. The current vault baseline uses atomic ERC-7984 callback/refund because it is the safest custody-preserving primitive to validate first; it does not expose a plaintext result but a depositor can privately infer acceptance from their own balances. The production-candidate design must add fixed-denomination deposits in public epochs plus a queued, batched encrypted admission sweep. The contract will emit only a generic processed status; an accepted/rejected amount is visible solely to the submitting wallet through user decryption. This reduces but does not eliminate an active user's ability to infer aggregate headroom from their own repeated attempts. Rate limits/one pending request per address and conservative headroom are documented residual mitigations, not claims of perfect protection.

## References

- [Zama Protocol overview](https://docs.zama.org/protocol)
- [FHE on blockchain architecture](https://docs.zama.org/protocol/protocol)
- [Encrypted inputs](https://docs.zama.ai/fhevm/smart-contract/inputs)
- [FHE operations and encrypted comparisons/select](https://docs.zama.ai/fhevm/smart-contract/operations)
- [Encrypted bounded randomness](https://docs.zama.ai/fhevm/smart-contract/random)
- [User decryption guide](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/decryption/user-decryption)
- [Zama maintained dapp examples](https://github.com/zama-ai/dapps)
- [OpenZeppelin ERC-7984 interface](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/blob/master/contracts/interfaces/IERC7984.sol)
