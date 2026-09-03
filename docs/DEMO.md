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
