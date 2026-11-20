# QoreStamp — submission record (QoreChain Developer Fest, Quantum Pass)

## Project

- **Name:** QoreStamp
- **Category:** Quantum Pass (1–2 person teams)
- **Team:** cezo484 (solo) — country: **Türkiye**
- **Description:** QoreStamp is a post-quantum document notary on the
  QoreChain testnet. Paste text or pick a file; the app computes its SHA-256
  hash in the browser and stamps it on-chain with a label, proving the
  document existed at that time. Anyone can verify a stamp later by hashing
  the document and looking it up (stampler, timestamp, block, label). The
  document itself never leaves the user's machine — only its hash is stored.
  Every stamp travels through QoreChain's EVM lane, which only admits
  transactions covered by a post-quantum (ML-DSA-87) authorisation window, so
  each stamp is backed by a hybrid classical + post-quantum signature.
- **Repo:** https://github.com/cezo484/qorestamp (public, MIT)
- **Project page:** https://build.qorechain.io/p/qorestamp-2
- **Demo video (86 s):** https://youtu.be/PRP7AbKvdCU
- **Deadline:** 2 December 2026, 23:59 UTC

## Status (21 November 2026)

| Step | State |
| --- | --- |
| Contract (`src/QoreStamp.sol`) | Done — `forge build` clean, `forge test` 19/19 pass (incl. fuzz) |
| React app (`web/`) | Done — built with `create-qorechain-dapp` 0.14.0, `npm run build` passes |
| CLI + vanilla page (`src/`, `web/vanilla.html`) | Done — `npm test` 33/33 pass; CLI verified against the live testnet contract |
| Testnet deploy | **Done 16 Nov 2026** — contract + hybrid attestation + first stamp, see evidence below |
| Fest proof tx (`bbqd-link:` memo) | **Done 16 Nov 2026** — testnet address linked to the project |
| Demo video | **Done 16 Nov 2026** — public on YouTube, linked in the README |
| GitHub repo + push | Done — public, commits tracked on the project page |
| Project on build.qorechain.io | Live — Quantum Pass, country Türkiye, AI-native option to be ticked |
| Final submission | **Open until 2 Dec 2026 23:59 UTC** — confirm on the project page that the video, the featured image, the repo link and the testnet addresses all show, and that registration (GitHub + X + QoreX) is complete |

## Testnet evidence (deployed 16 November 2026)

- Contract: `0x0eDcF72466d381573d39919AF1749EF3c91a4828`
- Deploy tx: `0xcdb740343394f59e899ae5b5744599332ce52acb68f25d8d9e06f558ac615310` (block 10178487)
- Deployer: `0xb0b5DC34d515D088e703d21A2241eF80D2dCB286` / `qor1kz6acdx4zhgg3ecr6gdzys00srfdev5xmn7m80`
- PQC key registration tx: `F85E370B4A0C6DB5230A631E03F977877F059232A46DB110CF0622B46C23C6CA`
- EVM window open tx: `CE54FDF90B778B81BC02269EF217DEA243E865B556B908AB030405A4A578C0E0` (1200 blocks, 10 txs)
- Hybrid attestation tx (1 uqor to self): `3929E73994B660AC3EAC7124C5EEEC4A033EA914289F7EFF53C0AFDB6EC55DC3`
- First stamp tx: `0xbfeb37af999fcf2741c15ef679b85a163d62d1cba77d135293da5db0a6e63940` (block 10178502, document hash `0x7596599d37c06ccd053802738c97b497cdedf867798facc8415aa1276c2a6c45`, label "first stamp", gas 159,116)
- Fest proof tx: `6AE079EC2215B83F283D67B9B5921E2FD3565FD59D8537B8F1EA788D65ECE5E9` (memo `bbqd-link:LHRQ2RrCpxWv`, height 10178901)
- Evidence files in the repo root: `deployed.json`, `attestation.json`, `stamp.json`, `proof.json`
- The 16 November EVM window has since expired (it was used for 2 of its 10
  transactions). That changes nothing: the contract is deployed, reads need
  no window, and no further on-chain action is needed for the submission.

Native-lane transactions are on the explorer at
https://explore.qore.network/tx/<hash> (toggle to Testnet). EVM transactions
are verified with `eth_getTransactionReceipt` on
https://evm-testnet.qore.host.

## Quantum Pass requirements

| Requirement | Evidence |
| --- | --- |
| Built with `create-qorechain-dapp` | Scaffolded with 0.14.0 (`foundry` + `viem-wagmi` templates) |
| Connect QoreX | React app connects QoreX via EIP-6963 (`web/src/wagmi.ts`) |
| Deploy on testnet | Contract `0x0eDcF72466d381573d39919AF1749EF3c91a4828`, Diana testnet, EVM 9800 |
| One hybrid-signed transaction | Attestation tx `3929E739…` (plus the hybrid-signed window open and proof txs) |

## How to check it (for a judge)

```sh
git clone https://github.com/cezo484/qorestamp.git
cd qorestamp
git submodule update --init
forge test        # 19/19
npm test          # 33/33 (forge + node)
```

Verify the first stamp against the live testnet contract (no wallet, no key):

```sh
node src/cli.js verify 0x7596599d37c06ccd053802738c97b497cdedf867798facc8415aa1276c2a6c45
```

Expected: stamper `0xb0b5dc34d515d088e703d21a2241ef80d2dcb286`, stamped
2026-11-16T06:09:15Z, block 10178502, label "first stamp".

Or run the offline demo (`npm run demo`), the vanilla page (`npm run web`,
then http://localhost:8080), or the React app (`cd web && npm run dev`).

## Prizes this entry competes for

- Quantum Pass: 10 × $150 jury + 20 × $50 raffle (every eligible entry is in the draw).
- Regional Award Türkiye: $200 (only if the project wins no other award).
- Top-Quality Awards: 7 × $250 (score 70+/100, no other award won).
- Best AI-Native Build: $500 (via `AI_USAGE.md` + the AI-native option on the project form).
- People's Choice: $500/$300/$200 (community vote via QoreX, 6–15 Dec; team members cannot vote for their own project).

## Timeline

- 15 Nov 2026 — scaffolded with `create-qorechain-dapp` 0.14.0; contract, tests and React app written.
- 16 Nov 2026 — faucet funded the deployer (1,000 QOR); PQC key registered, EVM window opened, contract deployed, hybrid attestation sent, first stamp on-chain, fest proof tx sent; demo video recorded and uploaded; project created on build.qorechain.io.
- 19 Nov 2026 — CLI, vanilla page and StampRegistry variant added.
- 21 Nov 2026 — CLI and vanilla page retargeted to the deployed QoreStamp interface; README rewritten with the real deployment evidence; submission record written.
- 2 Dec 2026, 23:59 UTC — submission deadline.
- 3–5 Dec 2026 — submission checks; 6–15 Dec — judging and People's Choice vote; 16 Dec — winners announced; 17–22 Dec — prizes paid in stablecoin.
