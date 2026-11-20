# AI usage — QoreStamp

QoreStamp was built with an AI coding assistant (Muse, a Meta AI agent) as the
primary author of the code, under the direction and review of the human
builder, cezo484. This file documents the workflow honestly, as the
Developer Fest's Best AI-Native Build award asks.

## What the human did

- Chose to enter the Developer Fest and picked the **Quantum Pass** category.
- Approved the build and the app direction.
- Funds the testnet deployer wallet (100 test QOR from the dashboard faucet —
  a step that needs a signed-in human).
- Reviews the code, the testnet deployment and the submission before it goes
  live, and submits the project on build.qorechain.io under his own account.

## What the AI did

- **Researched** the QoreChain docs (SDK 0.14.0, hybrid ML-DSA-87 signing,
  the EVM authorisation window, the dashboard faucet) and the fest rules, and
  verified the live testnet endpoints before writing code.
- **Designed** the app: a document notary (stamp a SHA-256 hash, verify it
  later) chosen because it is small, original, and its whole point — proof of
  existence over time — matches QoreChain's post-quantum story.
- **Scaffolded** the project with the official `create-qorechain-dapp` 0.14.0
  (`foundry` template for the contract, `viem-wagmi` template for the web
  app) and replaced the starter Counter with the QoreStamp contract.
- **Wrote** the Solidity contract (`src/QoreStamp.sol`), the Foundry test
  suite (10 tests, including a 256-run fuzz test), the deploy script, the
  React front end (stamp / verify / recent stamps, QoreX wallet connect, EVM
  window status panel), and the documentation.
- **Verified** the work: `forge build` clean, `forge test` 10/10 passing,
  `npm run build` for the web app, and the window helper confirmed against
  the live testnet (`npm run window status` reads the account, its PQC key
  status and its window).
- **Deployed** to the Diana testnet on 16 November 2026, once the deployer
  wallet was funded from the dashboard faucet: registered the ML-DSA-87
  post-quantum key, opened a hybrid-signed EVM authorisation window (1200
  blocks, 10 transactions), deployed the contract, sent a hybrid-signed
  attestation transaction, stamped the first document, and sent the fest
  proof transaction (`bbqd-link:` memo) that links the testnet address to
  the project on build.qorechain.io. Every transaction hash in the README
  is real and was verified on the testnet explorer or the EVM RPC — see
  `deployed.json`, `attestation.json`, `stamp.json`, `proof.json` and
  `SUBMISSION.md`.
- **Extended** the project on 19 November with a dependency-free command
  line tool and a vanilla web page (`src/cli.js`, `src/abi.js`,
  `src/rpc.js`, `web/vanilla.html`), plus a second, simpler contract
  variant (`contracts/StampRegistry.sol`) kept for its tests.
- **Finished** the submission on 21 November: retargeted the CLI and the
  vanilla page from the StampRegistry interface to the deployed QoreStamp
  interface (labelled stamps, five-field verify), verified the CLI against
  the live testnet contract end to end, re-ran the local anvil demo, and
  rewrote the README with the real deployment evidence. Test counts after
  the finishing pass: `forge test` 19/19, `npm test` 33/33.

## What the AI did not do

- It did not create accounts, sign in anywhere, or touch the human's wallets,
  credentials, or funds. The deployer is a fresh testnet-only wallet whose
  key lives in a gitignored `.env`; testnet QOR has no value.
- It did not submit the project: registration, repo linking and submission on
  build.qorechain.io are the human's steps.
- It did not touch mainnet. Everything here targets `qorechain-diana`
  (testnet, EVM 9800) only.

## Workflow

Research the docs first, then scaffold from the official templates, then
build in small verifiable steps (contract → tests → deploy scripts → front
end → testnet proof), running the test suite and builds after each step. Every
on-chain claim in the README is backed by a real transaction hash on the
testnet explorer or the EVM RPC — no fabricated evidence. No transaction hash
was claimed before it existed: until the deployment landed on 16 November,
the README's deployment section said so explicitly instead of claiming
hashes.
