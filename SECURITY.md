# Eclipse security status

## Current scope

The contracts are local mock-FHE prototypes, not audited production deployments. No Sepolia addresses are published. `MockCUSDT` and `EclipseDrawHarness` are explicitly test-only.

## Enforced boundaries

- `EclipseVault` only credits ERC-7984 transfer-and-call callbacks from its configured asset.
- The reserve only accepts callbacks whose ERC-7984 operation was initiated by its configured yield adapter.
- Vault principal and reserve liquidity are separate token custodians; the Draw has no vault-principal transfer path.
- Draw operations are state-gated, batch-bounded, and finalization requires a complete participant sweep.
- User balances, result flags, prize allocations, cumulative total, and random position remain FHE ciphertexts. No plaintext values are emitted.
- Encrypted withdrawals settle excess requests to zero rather than reverting on an encrypted balance predicate.
- Draw results require explicit, per-user FHE ACL authorization before user decryption.

## Known limitations before Sepolia

- Participant addresses and transaction timing are public metadata. Eclipse does not provide participant anonymity.
- Atomic capacity callback/refund lets a depositor privately infer whether their own deposit fit. Queued epoch admission is required to reduce active capacity probing.
- Current bounded FHE randomness requires a power-of-two capacity. Eclipse rejects incompatible Draw configurations rather than introducing modulo bias.
- Prize claims reveal that an address invoked a common claim path. They do not reveal the encrypted amount or winner flag, but auto-compounding is needed to reduce this metadata.
- The reserve trusts the immutable Draw wiring for payout requests. A full review must validate that all future Draw claim/rollover paths preserve one-prize-per-round accounting.
- No external audit, gas/HCU measurement on Sepolia, fuzzing, invariant campaign, or formal verification has been completed.

## Required gates

Before any live deployment: complete queued admission, full claim accounting review, Sepolia ERC-7984 integration tests, Relayer SDK user-decryption tests, static analysis, fuzz/invariant tests, HCU batch measurements, and independent audit.
