# QoreStamp — a post-quantum notary on QoreChain

Stamp the SHA-256 hash of any document on the QoreChain testnet to prove it
existed at a given time. The document never leaves your machine — only its
32-byte hash is stored on-chain. Anyone can verify a stamp later by hashing
the document and looking it up.

Built for the **QoreChain Developer Fest ("Build Before Q-Day")**, Quantum
Pass category (4 November – 2 December 2026).

## Why QoreChain?

Every stamp is sent through QoreChain's EVM lane, which only admits
transactions covered by a **post-quantum (ML-DSA-87) authorisation window**.
So each stamp is backed by a hybrid classical + post-quantum signature — a
notary whose authorisation itself survives the quantum threat it timestamps
against.

## Testnet deployment

Network: `qorechain-diana` testnet (EVM chain ID 9800).
Explorer: <https://explore.qore.network> (switch to Testnet).

<!-- DEPLOYMENT EVIDENCE — filled in after the testnet deploy. -->
- Contract: *(not deployed yet)*
- Deploy transaction: *(pending funding)*
- PQC key registration (first tx, classical-signed): *(pending)*
- EVM authorisation window (hybrid-signed tx): *(pending)*
- First stamp transaction: *(pending)*

## How it works

1. **Stamp** — paste text or pick a file. The app computes its SHA-256 hash in
   your browser and calls `stamp(hash, label)` on the `QoreStamp` contract.
   Each hash can be stamped once; the first stamp is the proof of existence.
2. **Verify** — paste the document text or a hash. The app reads
   `verify(hash)` and shows who stamped it, when, in which block, and with
   which label.
3. **Browse** — the app lists recent stamps from `totalStamps()` / `hashAt(i)`.

## Project layout

```
src/QoreStamp.sol          the notary contract
test/QoreStamp.t.sol       Foundry tests (10 tests, incl. a fuzz test)
script/QoreStamp.s.sol     Foundry deploy script
scripts/window.ts          EVM authorisation window helper (from the template)
web/                       Vite + React + wagmi front end (QoreX wallet)
```

Scaffolded with `create-qorechain-dapp` 0.14.0 (`foundry` template for the
contract, `viem-wagmi` template for the web app), then adapted for QoreStamp.

## Prerequisites

- Node.js 20+ and npm
- Foundry (`forge`), installed with `foundryup`
- A funded testnet account (see below)

## Run the contract tests

```sh
npm install
npm run forge-std   # install forge-std (once)
forge build
forge test
```

Tests run on Foundry's local EVM and need no network.

## Deploy to the testnet

**Testnet only.** Never point this at mainnet, and never use a real wallet.

1. Fund a fresh testnet account: claim 100 test QOR from the dashboard faucet
   at <https://dashboard.qorechain.io/faucet> (sign-in required; paste any
   `qor1...` address — no wallet connection needed).
2. Put the account in `.env` (see `.env.example`): `PRIVATE_KEY` plus
   `QORE_MNEMONIC` (or `QORE_PQC_RECOVERY_CODE`). Never commit `.env`.
3. Register the account's ML-DSA-87 key (once per account) and open an EVM
   authorisation window:

   ```sh
   npm run window status     # account, PQC key, window
   npm run window register   # registers the ML-DSA-87 key (first tx)
   npm run window open       # opens a window: 1200 blocks, 10 transactions
   ```

   Opening a window is a native-lane transaction signed hybrid
   (secp256k1 + ML-DSA-87), and it advances the account's nonce — open it
   before deploying.
4. Deploy and record the evidence:

   ```sh
   npm run deploy:testnet   # deploy QoreStamp
   npm run deployed         # verify on-chain, write deployed.json
   npm run attest           # one explicit hybrid-signed tx -> attestation.json
   npm run stamp            # first stamp through the contract -> stamp.json
   ```

   Then put the deployed address in `web/src/config.ts`
   (`QORESTAMP_TESTNET_ADDRESS`) and fill in the deployment section above.

   To link the project on build.qorechain.io, create the project there first
   to get its link code, then send the proof transaction:

   ```sh
   BBQD_LINK_CODE=<code> npm run proof   # 1 uqor with memo bbqd-link:<code>
   ```

   Evidence files (`deployed.json`, `attestation.json`, `stamp.json`,
   `proof.json`) are committed to the repo so judges can verify every claim.
   Note: the QoreChain explorer indexes native-lane transactions; EVM
   transactions (deploy, stamp) are verified with `eth_getTransactionReceipt`
   on `https://evm-testnet.qore.host`.

## Run the web app

```sh
cd web
npm install
npm run dev      # http://localhost:5173
```

Connect with QoreX (listed first) or any injected wallet, switch to the
QoreChain testnet (EVM 9800), open an EVM window for your account, then stamp
and verify. See `web/README.md` for the wallet and window details.

## License

MIT. The contract is `src/QoreStamp.sol`; the templates it builds on are from
the QoreChain SDK repo (Apache-2.0).
