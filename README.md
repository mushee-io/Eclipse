# ECLIPSE

**Zero-Disclosure Prize Savings** — save privately, win invisibly, verify everything.

Eclipse is a Zama FHE-powered, confidential no-loss prize-savings architecture. It samples encrypted randomness across a fixed public pool capacity instead of public TVL. Depositors occupy encrypted cumulative ranges; unused capacity is **The Shadow**. A Shadow draw rolls yield forward without spending principal.

> Status: local FHE baseline. Confidential ERC-7984 ingress and encrypted vault deposit/withdraw tests pass locally. Draw, prize reserve, frontend flow, and Sepolia deployment are not yet claimed as complete.

Start with [the architecture](docs/ARCHITECTURE.md), [Zama research baseline](docs/ZAMA_RESEARCH.md), and [implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md).
Read [SECURITY.md](SECURITY.md) before treating any contract as production-ready.
The current local and future Sepolia demonstration boundary is documented in [docs/DEMO.md](docs/DEMO.md).

## Local setup

Requires Node 20+. Copy `.env.example` to `.env`, install dependencies, then run:

```bash
npm install
npm run compile
npm test
npm run deploy:local
```

No private key, mnemonic, or token address is included in this repository. Sepolia deployment remains deliberately unavailable until Phase 2 validates the official ERC-7984 transfer path.
