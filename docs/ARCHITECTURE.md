# Eclipse architecture proposal

```text
user wallet ─ encrypted ERC-7984 amount ─► EclipseVault
                                         │ encrypted principal handles
                                         ▼
                                  EclipseDraw (state machine)
                                  │ FHE random [0, capacity)
                                  │ batched encrypted ranges
                                  ▼
                       encrypted user prize allocations / Shadow
                                         │
                     PrizeReserve ◄── yield only ── IYieldAdapter
                                         ▲
                              SepoliaYieldSimulator (testnet only)
```

## Contract responsibilities

- `EclipseVault`: token ingress/egress; per-user encrypted principal; encrypted aggregate principal; public participant registry; draw lock coordination. It never transfers principal to the reserve.
- `PrizeReserve`: custody/accounting of yield-derived prize liquidity only. It exposes exactly one draw allocation path and cannot source vault principal.
- `EclipseDraw`: public lifecycle `OPEN → LOCKED → RANDOMNESS_CREATED → PROCESSING → FINALIZED`; stores encrypted random handle, encrypted cumulative total, encrypted winner flags and round-scoped processing cursor.
- `IYieldAdapter`: production boundary. It returns only yield available to sweep; it cannot instruct the vault to spend principal.
- `SepoliaYieldSimulator`: explicit testnet component that transfers prefunded test liquidity into `PrizeReserve`; it does not simulate an APY or claim real yield.

## Exact state model

```text
Vault
  token: IERC7984 (immutable)
  draw: EclipseDraw (set once before activation)
  capacity: uint64 (immutable for an epoch)
  principalOf[user]: euint64
  totalPrincipal: euint64
  participants[]: address                 // public membership limitation
  active[user]: bool                      // public
  pendingDeposit[user]: encrypted request // epoch admission model

Draw Round
  state: enum
  prize: euint64
  random: euint64
  cumulative: euint64
  cursor: uint32
  processed[round][user]: bool
  won[round][user]: ebool
  allocatedPrize[round][user]: euint64
  finalized: bool

Reserve
  committedYield: encrypted/accounted asset balance
  allocatedForRound[round]
  claimed[round][user]: bool
```

`totalPrincipal` is only used for encrypted comparisons. It is not exposed, emitted, or converted to a plaintext branch. Explicit checked-add patterns are mandatory because FHE arithmetic is wrapping.

## FHE permission/decryption model

| Handle                            | Contract ACL                             | User ACL                       | Purpose                              |
| --------------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------ |
| principal balance                 | Vault; Draw while a locked draw needs it | owner                          | withdraw and private balance display |
| total principal/cumulative/random | Draw; Vault when needed                  | none                           | protocol-only computation            |
| winner flag/prize allocation      | Draw; Reserve/claim path as required     | corresponding participant only | private result and claim             |

All state writes call `FHE.allowThis`. `FHE.allow(value, account)` is least-privilege and is never granted to indexers, analytics, admins, or every participant. The frontend asks a wallet to authorize user decryption and never stores a plaintext beyond active in-memory UI state.

## Security gates before Phase 3

1. Verify the exact ERC-7984 confidential transfer/callback flow and prove token custody equals vault principal liability.
2. Test ACL propagation for every encrypted value crossing Vault/Draw/Reserve.
3. Implement a test-only deterministic random seam, completely absent from Sepolia constructors.
4. Implement bounded batches and assert `cursor` monotonically advances exactly once per participant.
5. Design confidential withdrawal failure semantics so insufficient balance cannot be converted into a public oracle.
