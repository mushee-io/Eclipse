# ECLIPSE

**Zero-Disclosure Prize Savings** — save privately, win invisibly, verify everything.

Eclipse is a confidential no-loss prize-savings dApp built on the Zama Protocol and Ethereum Sepolia. Users deposit confidential cUSDT into a shared pool, keep ownership of principal, participate in deposit-weighted prize draws computed over encrypted balances, privately decrypt their own result, claim through a uniform confidential path, and withdraw principal.

> **Core idea:** Eclipse does not just hide who won. It also hides the pool size that determined the odds.

## Live app

https://eclipse-rho-seven.vercel.app

Network: **Ethereum Sepolia (chain ID 11155111)**

## Judge quick start

1. Open the live app and select **Launch App**.
2. Connect MetaMask and switch to **Ethereum Sepolia**. You need a small amount of Sepolia ETH for gas.
3. In **Pool**, mint 100 test USDT.
4. Wrap 100 test USDT into confidential **cUSDT**. The wrap is the ERC-20 approval → ERC-7984 confidential-token ingress used by the demo.
5. Enter an amount and select **Encrypt & Deposit**. The browser encrypts the amount with the Zama Relayer SDK before submitting the confidential transfer-and-call.
6. Select **Unlock Private Data** and sign the EIP-712 privacy request to decrypt only your own pool balance.
7. Open **Draws → Draw #1** and select **Run / Advance Draw**. The permissionless keeper flow advances the onchain draw state. Each stage is a Sepolia transaction, so MetaMask may request multiple confirmations.
8. After finalization, select **Unlock Result** and sign the EIP-712 request. Your wallet privately learns its encrypted win predicate and prize allocation.
9. Select **Claim Result**. Winners and losers use the same public claim function; a losing allocation is encrypted zero.
10. Return to **Pool**, enter an amount and select **Encrypt & Withdraw** to redeem principal.

The live draw controller is permissionless. If a previous caller stopped part-way through a draw, **Run / Advance Draw** resumes from the current state instead of requiring an admin reset.

## How the confidential pool works

### Deposits and balances

The demo uses a test ERC-20 USDT mock and an ERC-7984 confidential cUSDT token. Users mint test USDT, approve/wrap it into cUSDT, then submit an encrypted `euint64` amount to the vault through ERC-7984 `confidentialTransferAndCall`.

The vault keeps each participant's principal as encrypted FHE state. It also keeps encrypted aggregate principal for capacity enforcement. Individual deposit sizes, balances and aggregate TVL are never intentionally publicly decrypted by Eclipse.

### Dark Capacity Draw

Eclipse uses a fixed public maximum draw capacity rather than public TVL:

- capacity `C = 2^30 = 1,073,741,824` atomic cUSDT units
- with 6 decimals, this is `1,073.741824 cUSDT`
- each saver occupies an encrypted cumulative interval proportional to their encrypted balance
- `FHE.randEuint64(C)` creates the encrypted random position onchain
- encrypted comparisons determine whether the random position lies inside each participant's encrypted interval
- the unused encrypted region is **The Shadow**

For saver `i` with encrypted balance `B_i`:

`P(i wins) = B_i / C`

If total encrypted deposits are `T`, the probability of the Shadow is:

`P(Shadow) = 1 - T / C`

Conditioned on the draw landing on a saver:

`P(i | saver wins) = B_i / T`

This preserves deposit weighting without decrypting `T`. If the encrypted random position lands in the Shadow, no saver receives the prize and the locked prize rolls forward.

The capacity is a power of two because Zama's bounded `FHE.randEuint64` requires a power-of-two upper bound. Eclipse does not use plaintext TVL as the random modulus and does not use an offchain RNG.

## Draw lifecycle

`EclipseDraw` has four public states:

1. `OPEN` — deposits/withdrawals operate normally.
2. `RANDOMNESS_CREATED` — `startDraw()` briefly locks withdrawals, locks the available prize and creates encrypted FHE randomness.
3. `PROCESSING` — participant balances are processed in bounded batches (maximum 16) using encrypted cumulative ranges and comparisons.
4. `FINALIZED` — the encrypted Shadow predicate is evaluated, rollover is applied when necessary, withdrawals reopen and participant results can be authorized/decrypted/claimed.

The progression functions are permissionless: `startDraw`, `beginProcessing`, `processDrawBatch`, `finalizeDraw`, and `openNextDraw`. The frontend provides **Run / Advance Draw** as the keeper UX.

## Prize and no-loss design

Principal and prize liquidity are isolated:

- `EclipseVault` holds/account for saver principal.
- `PrizeReserve` holds only prize liquidity.
- `EclipseDraw` can lock and allocate the reserve's encrypted prize but cannot spend saver principal as a prize.
- users can withdraw principal before/after draws; withdrawals are only briefly locked while a draw snapshot is being processed/finalized.

This is the no-loss property: the prize comes from the prize reserve/yield path, not from another user's principal.

## Sepolia yield-source mock

`SepoliaYieldSimulator` is **testnet simulation only**. It does not claim to generate real interest. A pre-funded account supplies confidential cUSDT as simulated yield, and the configured adapter transfers that encrypted amount into `PrizeReserve`.

A production deployment would replace the simulator with an `IYieldAdapter` implementation connected to a real yield-bearing strategy. The reserve/draw interface remains the same: yield enters the isolated reserve, then the draw locks the currently available encrypted prize.

## EIP-712 user decryption

The frontend integrates `@zama-fhe/relayer-sdk` in the browser. For private reads it:

1. initializes the Zama Sepolia SDK,
2. generates a temporary encryption keypair,
3. builds the SDK EIP-712 user-decryption request,
4. asks the connected wallet to sign it,
5. sends the authorized ciphertext handles to `userDecrypt`, and
6. displays the decrypted value only in frontend memory.

The same mechanism is used for the connected wallet's principal and draw result. Eclipse does not publicly decrypt these ciphertexts.

## Claim confidentiality

After a draw is finalized, `authorizeMyResult(drawId)` grants only the caller ACL access to that caller's encrypted win predicate and prize allocation. `claimPrize(drawId)` is the same public path for every participant. A losing participant's allocation is encrypted zero; a winner's allocation is the encrypted locked prize. The claimant address and claim transaction are public, but the amount/outcome is not intentionally published by Eclipse.

## What stays encrypted

- individual deposit amounts after confidential ingress
- individual vault principal balances
- aggregate principal / TVL
- random draw position
- cumulative weighted ranges
- per-participant winner predicate
- per-participant prize allocation
- Shadow outcome
- available/locked prize accounting

## What is public / leakage

Eclipse is confidential finance, **not address anonymity**. The following remain public:

- wallet addresses interacting with the contracts
- participant address registry and historical participants
- transaction sender, timing, gas and contract calls
- fixed maximum capacity
- draw ID and state transitions
- participant count / batch progress
- draw start/finalization events
- claim and withdrawal transactions
- the fact that an address called result authorization or claim

The protocol does not intentionally expose deposit size, current balance, aggregate TVL, random position, winner, prize amount or Shadow result. Timing/activity can still create side channels. The current participant registry also retains historical zero-balance participants; a production version should optimize registry lifecycle/scaling.

## Error handling and supported assets

The live frontend:

- detects injected wallets using EIP-6963 and prefers MetaMask when available,
- detects Ethereum Sepolia mismatch and provides a switch-network path,
- validates positive 6-decimal `euint64` amounts before encryption,
- reports insufficient gas/token failures,
- prevents withdrawal while a draw is being finalized,
- reports non-participation and already-claimed results,
- retries Zama SDK initialization after an initialization failure.

The Sepolia demo intentionally supports only the deployed test USDT/cUSDT pair. Arbitrary or unsupported tokens are not accepted by the vault.

## Deployed Sepolia contracts

| Component | Address |
| --- | --- |
| EclipseVault | `0x7eE4B6dE21e14ab3a4A0c14d7430742667Ba703f` |
| EclipseDraw | `0x60c5bb2c218aD32415A69368d681B36A33ef7d3e` |
| PrizeReserve | `0x9287C4cc8c45e4beFe7B86a24735dd9fd0ee3744` |
| SepoliaYieldSimulator | `0x863d0b6D8D76744C60Cc805E26FE83F0616691D8` |
| Confidential cUSDT | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| Test USDT | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |

## Recorded live Sepolia proof

A complete Dark Capacity Draw has already been executed on Sepolia with three participants. Useful transaction hashes:

| Action | Transaction |
| --- | --- |
| confidential deposit | `0x2787978b973ab1005a0003b8351d00c381062710f8c5656f4b770154e9861542` |
| confidential deposit | `0xb1f562a6aee3a07996acca45967b3f8d64e1feab53a937f29636b0afaa86e27a` |
| simulated yield | `0x56d805ecd10bf2c820f5e76745125168a0186fb32c6b13c07b51f5b8d0393a21` |
| start draw | `0xca2a6197cb220d272475742cbed1d04a92d280218d1605efbfd74b49b198e46e` |
| begin processing | `0xa50367847b1a75fa556991ce9ada0ad2e777cf4048ab2c109bd7ef8a2562e9ea` |
| encrypted batch | `0xc01220efe3b2f8eb95e99e872949f6841096e66b033136d69963fb4b42e31647` |
| finalize | `0x9472f38a61caceca4ee29544b8ce29d6f9463adc088bb076b3bd85e61c5b1d28` |
| principal withdrawal | `0x754a8fe6a18ae08df00a13ddf2556b739ef19b717c4c14c0c140dec2215f2fa1` |

These transaction hashes prove public execution/state progression. They do not reveal the encrypted TVL, random position, winner or prize.

## Repository structure

- `contracts/EclipseVault.sol` — confidential principal custody/accounting
- `contracts/EclipseDraw.sol` — FHE randomness and encrypted weighted draw
- `contracts/PrizeReserve.sol` — isolated confidential prize liquidity
- `contracts/SepoliaYieldSimulator.sol` — testnet-only simulated yield adapter
- `frontend/` — Next.js live dApp and Zama Relayer SDK integration
- `scripts/` — local/Sepolia deployment and proof scripts
- `test/` — contract tests
- `docs/` — architecture, demo, security and research notes

## Local development

Requires Node.js 20+.

```bash
npm install
npm run compile
npm run typecheck
npm test
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Copy `.env.example` to `.env` only for scripts that require Sepolia credentials. **Never put a private key, mnemonic or privileged RPC credential in `frontend/`, `NEXT_PUBLIC_*`, or a public deployment environment variable.** The live frontend uses a public Sepolia RPC and wallet-signed transactions.

Useful deployment/proof scripts are exposed through the root `package.json`, including `deploy:sepolia`, `check:sepolia`, `deploy:sepolia:probe`, `deploy:sepolia:vault`, `deploy:sepolia:draw-system`, and the Sepolia deposit/decrypt/migration scripts.

## Security / production boundary

Eclipse is a Sepolia bounty demonstration, not an audited mainnet product. The cryptographic confidentiality boundary is provided by Zama FHEVM, but the application contracts themselves have not been represented as externally audited. See `SECURITY.md` and `docs/` for design notes and known limitations.

## Bounty requirement mapping

- Web dApp / public URL: **implemented**
- confidential deposit / ERC-7984 flow: **implemented**
- encrypted balances: **implemented**
- onchain FHE randomness: **implemented**
- encrypted deposit-weighted selection: **implemented**
- no offchain RNG / plaintext balance draw: **implemented**
- confidential prize reserve/distribution: **implemented**
- EIP-712 user decryption: **implemented**
- principal withdrawal / no-loss separation: **implemented**
- test-token faucet: **implemented in the Pool UI**
- draw automation/keeper: **permissionless Run / Advance Draw UI**
- confidentiality/leakage documentation: **this README + docs**
- public source: **this repository**

## License

See `LICENSE`.
