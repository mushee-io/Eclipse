# Eclipse demo flow

## Current local proof

Run the local topology:

```bash
npm run deploy:local
npm test
```

The automated suite demonstrates the same core story a live demo will use:

1. Mint test-only `MockCUSDT` to Alice, Bob, and the yield funder.
2. Alice and Bob submit encrypted ERC-7984 transfer-and-call deposits.
3. The Vault privately credits principal, enforces capacity, and keeps its principal custody distinct from the reserve.
4. The funder approves the simulator as a confidential-token operator and contributes encrypted test yield.
5. A draw locks withdrawals briefly, generates encrypted fixed-capacity randomness, and processes encrypted participant ranges in batches.
6. A winner receives an encrypted allocation, or The Shadow receives the outcome and the prize rolls forward.
7. Each participant follows the identical private result-authorization path.
8. A claim sends only the caller's encrypted allocation and rejects repeats.

`EclipseDrawHarness` proves forced winner and Shadow positions only in local tests. It is under `contracts/test` and is not part of the production deployment path.

## Sepolia demo gate

Do not claim a Sepolia demo until all of the following are complete:

- configure and validate a verified ERC-7984 asset address;
- replace `MockCUSDT` and local mock runtime;
- validate Relayer SDK user decryption against wallet signatures;
- deploy the non-harness Draw, Vault, Reserve, and simulator;
- record transaction hashes and explorer links;
- complete queued admission and HCU measurements.

This separation prevents a deterministic local proof from being presented as a live on-chain demonstration.

## Real confidential vault deposit

Completed on Ethereum Sepolia with Zama's canonical test asset deployment.

| Item                   | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confidential asset     | [`cUSDTMock`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491) (ERC-7984 wrapper)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Underlying             | [`USDTMock`](https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| EclipseVault           | [`0xb8671991D0CF8bF445A14Dbe02558263D943396c`](https://sepolia.etherscan.io/address/0xb8671991D0CF8bF445A14Dbe02558263D943396c)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Vault deployment       | [`0x14c5da2205733b6801ef7f1169c7e9940b040f89cc9f7434f894227051bd4360`](https://sepolia.etherscan.io/tx/0x14c5da2205733b6801ef7f1169c7e9940b040f89cc9f7434f894227051bd4360) at block `11633110`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Confidential callbacks | [`0x76ef01549225cfae20b2a9db64269478db608107b3dd56520bfc9d08a91a0609`](https://sepolia.etherscan.io/tx/0x76ef01549225cfae20b2a9db64269478db608107b3dd56520bfc9d08a91a0609), [`0xfdfdb605dd6218baff247c174fbd52d838c9332668f389cb9b291ea731b5167a`](https://sepolia.etherscan.io/tx/0xfdfdb605dd6218baff247c174fbd52d838c9332668f389cb9b291ea731b5167a), [`0x66554cc23ea787619795645e2e9b34b0c15ddb099d836291eb2b9a77636811f0`](https://sepolia.etherscan.io/tx/0x66554cc23ea787619795645e2e9b34b0c15ddb099d836291eb2b9a77636811f0), [`0xf3c3828c371f8389bf4b435da3b72711e95f8924b8f0a829ed430d71164b92f7`](https://sepolia.etherscan.io/tx/0xf3c3828c371f8389bf4b435da3b72711e95f8924b8f0a829ed430d71164b92f7) |

The dedicated wallet publicly minted and wrapped test USDT only to fund the test. It then used the Relayer SDK to encrypt cUSDT amounts and called the real `confidentialTransferAndCall` path into `EclipseVault`. The vault's authorized EIP-712 `userDecrypt` flow recovered an encrypted principal of `84,000,000` six-decimal units (`84 cUSDT`). No plaintext principal is emitted by the vault.

The four callback transactions are retained as complete execution evidence. Two redundant calls settled with the wrapper's encrypted zero-transfer behavior after the available funded balance had already been consumed; they did not increase the recovered principal. The final read-only verifier can be rerun without sending funds:

```bash
npm run decrypt:sepolia:vault
```

## Real Zama Sepolia Proof

Completed on Ethereum Sepolia (chain ID `11155111`) on 4 September 2026.

| Item                   | Evidence                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Probe contract         | [`0xaaEe1F794dFF5758543083a515741825c7deE6AE`](https://sepolia.etherscan.io/address/0xaaEe1F794dFF5758543083a515741825c7deE6AE)                                            |
| Deployment transaction | [`0x1615c4fc40b17b3201acb929976bfb1a99794f6c7b1c274d1285f63fbbf6589e`](https://sepolia.etherscan.io/tx/0x1615c4fc40b17b3201acb929976bfb1a99794f6c7b1c274d1285f63fbbf6589e) |
| Deployment block       | `11633084`                                                                                                                                                                 |
| Encrypted write        | [`0xc7ccc266857912245bebca86343d04fa6ebc8504b5db0c77fda15cf4c4173116`](https://sepolia.etherscan.io/tx/0xc7ccc266857912245bebca86343d04fa6ebc8504b5db0c77fda15cf4c4173116) |
| Write block            | `11633089`                                                                                                                                                                 |
| SDK                    | `@zama-fhe/relayer-sdk` 0.4.1 with `SepoliaConfig`                                                                                                                         |

The dedicated test wallet encrypted `42` with `createEncryptedInput(probeAddress, deployerAddress).add64(42).encrypt()`. The probe validated it with `FHE.fromExternal`, persisted the ciphertext, granted itself `FHE.allowThis`, and granted only the originating wallet `FHE.allow`.

The wallet completed the signed EIP-712 `userDecrypt` flow and recovered `42`. An unrelated ephemeral wallet followed the same signed request path and was rejected. The contract has no public-decryption function. The write event contains the caller address only; it does not emit the plaintext amount.

Reproduce using a local, uncommitted `.env` containing `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and `ECLIPSE_SEPOLIA_PROBE_ADDRESS`:

```bash
npm run compile
npm run check:sepolia
npm run deploy:sepolia:probe
node scripts/sepolia/roundtrip.mjs
node scripts/sepolia/unauthorized-decrypt-probe.mjs
```
