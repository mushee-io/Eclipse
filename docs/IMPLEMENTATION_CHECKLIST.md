# Eclipse implementation checklist

- [x] Phase 0: research current FHE API, toolchain and constraints.
- [x] Phase 1: create source layout, Hardhat configuration, environment template, FHE configuration compile probe and frontend boundary.
- [x] Install the pinned dependency graph and compile the probe.
- [x] Phase 2: select and compile the official ERC-7984 `confidentialTransferAndCall` ingress primitive; write token/ACL tests.
- [~] Phase 3: vault encrypted principal accounting, immediate encrypted capacity admission and confidential withdrawals. Production queue/epoch admission remains a privacy-hardening task.
- [x] Phase 4: reserve, adapter interface and clearly-labelled yield simulator.
- [~] Phase 5: encrypted fixed-capacity draw, Shadow rollover and bounded batch sweep. Private prize claiming remains to be implemented.
- [ ] Phase 6: batch/HCU measurements, resumability and adversarial cursor tests.
- [ ] Phase 7: Relayer SDK user-decryption UI and authorization negative tests.
- [ ] Phase 8: accessible Next.js product UI connected to deployed ABIs only.
- [ ] Phase 9: integration flow and privacy-leak audit.
- [ ] Phase 10: Sepolia deployment, interface validation, explorer verification and recorded addresses.
- [ ] Phase 11: security review and threat model.
- [ ] Phase 12: demonstration guide, screenshots, submission copy and video script.
