# QoreStamp

[![Built on QoreChain](https://build.qorechain.io/badge/qorestamp-2.svg)](https://build.qorechain.io/p/qorestamp-2)

A post-quantum document notary on QoreChain. Hash a file on your own machine, stamp its SHA-256 hash on chain with a short label, and let anyone verify later that the document existed at that time. The file itself is never uploaded or stored anywhere; only its hash goes on chain.

Built for Build Before Q-Day: The QoreChain Developer Fest, **Quantum Pass** category. Submission deadline is 2 December 2026, 23:59 UTC.

Project page: https://build.qorechain.io/p/qorestamp-2
Demo video (86 s): https://youtu.be/PRP7AbKvdCU

## How it works

1. You hash a document (SHA-256) locally, in the browser or on the command line.
2. You send the hash plus a short label to the QoreStamp contract. The contract records your address, the block timestamp, the block number and the label.
3. Anyone with the same document re-hashes it and queries the contract. A matching hash returns the original stamper, timestamp, block and label.

A hash can be stamped once. A second stamp of the same hash reverts, so the first stamp stays the record.

Every stamp travels through QoreChain's EVM lane, which only admits transactions covered by a post-quantum (ML-DSA-87) authorisation window, so each stamp is backed by a hybrid classical + post-quantum signature.

## Status

**Deployed on the QoreChain Diana testnet (EVM chain id 9800), 16 November 2026.** The contract, the React app, the CLI and the vanilla web page all work against it. Evidence files live in the repo root (`deployed.json`, `attestation.json`, `stamp.json`, `proof.json`).

| | |
| --- | --- |
| Contract | `0x0eDcF72466d381573d39919AF1749EF3c91a4828` |
| Deploy tx | `0xcdb740343394f59e899ae5b5744599332ce52acb68f25d8d9e06f558ac615310` (block 10178487) |
| Deployer | `0xb0b5DC34d515D088e703d21A2241eF80D2dCB286` / `qor1kz6acdx4zhgg3ecr6gdzys00srfdev5xmn7m80` |
| PQC key registration tx | `F85E370B4A0C6DB5230A631E03F977877F059232A46DB110CF0622B46C23C6CA` |
| EVM window open tx | `CE54FDF90B778B81BC02269EF217DEA243E865B556B908AB030405A4A578C0E0` (1200 blocks, 10 txs) |
| Hybrid attestation tx | `3929E73994B660AC3EAC7124C5EEEC4A033EA914289F7EFF53C0AFDB6EC55DC3` |
| First stamp tx | `0xbfeb37af999fcf2741c15ef679b85a163d62d1cba77d135293da5db0a6e63940` (block 10178502, label "first stamp") |
| Fest proof tx | `6AE079EC2215B83F283D67B9B5921E2FD3565FD59D8537B8F1EA788D65ECE5E9` (memo `bbqd-link:LHRQ2RrCpxWv`) |

Native-lane transactions (PQC registration, window, attestation, proof) are on the explorer at https://explore.qore.network/tx/<hash> (toggle to Testnet). EVM transactions (deploy, stamp) are verified with `eth_getTransactionReceipt` on https://evm-testnet.qore.host.

## Install

Node.js 20 or newer and Foundry (forge 1.9.0 was used here).

```
git clone https://github.com/cezo484/qorestamp.git
cd qorestamp
git submodule update --init
forge build
npm ci
cd web && npm ci && cd ..
```

The root `npm ci` installs the helper-script dependencies (QoreChain SDK 0.14.0, viem, tsx). The CLI itself (`src/`) has no dependencies.

## Use it

Hash a file:

```
node src/cli.js hash contract.pdf
```

Show the stamp calldata and the cast command that sends it:

```
node src/cli.js stamp contract.pdf --label "signed agreement"
```

Verify a file against the deployed testnet contract (the address is the default, no flag needed):

```
node src/cli.js verify contract.pdf
```

Verify a bare hash instead of a file:

```
node src/cli.js verify 0x7596599d37c06ccd053802738c97b497cdedf867798facc8415aa1276c2a6c45
```

That hash is the first stamp on testnet. It returns stamper `0xb0b5dc34d515d088e703d21a2241ef80d2dcb286`, block 10178502, label "first stamp".

Check the chain the CLI points at:

```
node src/cli.js info
```

`--json` on `hash` and `verify` prints structured output. `--contract` and `--rpc` override the contract and the endpoint; the defaults are the deployed testnet contract and the QoreChain testnet RPC. The CLI never signs a transaction and never asks for a private key.

Run the scripted demo (hashes a sample document, builds the calldata, queries a stub RPC server; fully offline):

```
npm run demo
```

## Web apps

There are two. The React app (the fest entry's main app) and a dependency-free vanilla page.

React app, built with `create-qorechain-dapp` 0.14.0 (viem-wagmi template). Stamp and verify from the browser, connect QoreX, and see the EVM authorisation window status:

```
cd web
npm run dev
```

Then open the URL Vite prints. `npm run build` produces the production build.

Vanilla page, no build step and no dependencies. Served by the small static server at the repo root:

```
npm run web
```

Then open http://localhost:8080. Pick or drop a file; the page hashes it with the browser Web Crypto API and shows the hash and the stamp calldata for the label you type. The verify box queries the deployed contract over JSON-RPC. The file never leaves the page. Neither page sends transactions; stamping is done with cast or a wallet.

## The contract

`src/QoreStamp.sol`, Solidity 0.8.24.

- `stamp(bytes32 documentHash, string label)` records `msg.sender`, `block.timestamp`, `block.number` and the label, emits `Stamped`, and counts the stamp. It reverts with `AlreadyStamped` when the hash has a stamp, with `EmptyHash` for the zero hash, and with `LabelTooLong` when the label is over 64 bytes.
- `verify(bytes32 documentHash)` returns `(stamper, timestamp, blockNumber, label, exists)`. Unstamped hashes return the zero address, 0, 0, an empty label and false.
- `isStamped(bytes32 documentHash)` returns whether a stamp exists.
- `hashAt(uint256 index)` returns the hash stamped at that index, in stamp order.
- `totalStamps()` returns the number of stamps.

`contracts/StampRegistry.sol` is an earlier, simpler variant of the same idea (no label, no block number). It is kept for its test suite; the deployed contract is `src/QoreStamp.sol`.

## Tests

```
forge test
npm test
```

`forge test` runs 19 tests (10 for QoreStamp, 9 for StampRegistry), including fuzz tests over arbitrary hashes. `npm test` runs 33 tests: hash vectors, calldata building and result decoding, the RPC client against a local stub server, and CLI end to end runs. All tests pass.

## Local demo (anvil)

Run a local chain, deploy, stamp a document and verify it:

```
anvil --port 8545
```

In a second terminal, from the project root (this uses the well-known anvil test key, local only):

```
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Note the deployed address, then stamp and verify:

```
printf 'QoreStamp demo document.\nSigned by both parties.\n' > /tmp/doc.txt
HASH=$(node src/cli.js hash /tmp/doc.txt --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).sha256))")
cast send <contract> "stamp(bytes32,string)" $HASH "demo agreement" --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY
QORESTAMP_CONTRACT=<contract> QORESTAMP_RPC=http://127.0.0.1:8545 node src/cli.js verify /tmp/doc.txt
```

This was run on 21 November 2026. The deploy landed at `0x5FbDB2315678afecb367f032d93F642f64180aa3`, the stamp transaction `0x67b22c0c77b7a03985f52c23f75cef34575d5d8c335bea6ad69aaa9dd58218de` succeeded in block 2, the CLI verify returned the stamper, block 2 and the label "demo agreement", and a second stamp of the same hash reverted with `AlreadyStamped`. Those addresses and hashes are from the local anvil run only.

## Deploy to QoreChain testnet

The contract is already deployed (see Status). This section records how it was deployed, and how to deploy a fresh copy.

Network values (from docs.qorechain.io, checked 21 November 2026):

| | Testnet | Mainnet |
| --- | --- | --- |
| Network name | qorechain-diana | qorechain-vladi |
| EVM chain id | 9800 | 9801 |
| EVM JSON-RPC | https://evm-testnet.qore.host | https://evm.qore.host |
| Explorer | https://explore.qore.network | https://explore.qore.network |
| Currency | QOR | QOR |

Deploy to testnet only. Mainnet is out of scope for the fest submission.

### 1. Fund the deploy account

The faucet lives on the Dashboard and needs a sign-in; there is no public faucet endpoint. Open dashboard.qorechain.io/faucet, sign in, and paste the deploy account's `qor1...` address (the form accepts `qor1...` only, not `0x...`). A claim pays 100 testnet QOR (plus fest test tokens), once every 24 hours per account and per address. Testnet QOR has no value.

The deploy account's key lives in a gitignored `.env` (mode 600). Never commit it, and never use a testnet key on mainnet.

### 2. Register a post-quantum key and open an EVM authorisation window

Since the v3.2.0 upgrade, the EVM lane only accepts a transaction from an account with a registered ML-DSA-87 post-quantum key and an open EVM authorisation window. Without both, `eth_sendRawTransaction` is refused (codespace `pqc`, codes 26, 27 or 28). Reads, `eth_call` and gas estimation need neither.

The window only works with an `eth_secp256k1` key (coin type 60). The helper scripts in `scripts/` do the whole flow (they read the deployer key from `.env`):

```
npm run window register   # ML-DSA-87 key registration (first tx, classical)
npm run window open       # EVM authorisation window (hybrid-signed tx)
npm run window status     # check the key and the window
```

With `qorechaind` directly, registration is one classical-signed transaction (it is exempt from the hybrid signature requirement, so a new account can bootstrap):

```
qorechaind tx pqc register-key-v2 dilithium5 <pubkey-hex> hybrid --from mykey \
  --pqc-key mypqc --chain-id qorechain-diana --gas 600000 --fees 90000uqor
```

Then open a window. It is a Cosmos-lane transaction, so build it unsigned and cosign it with the post-quantum key:

```
qorechaind tx pqc open-evm-window 7200 20 1000qor --from mykey \
  --chain-id qorechain-diana --gas 400000 --fees 40000uqor --generate-only > w.json
qorechaind tx pqc cosign w.json --from mykey --pqc-key mypqc --chain-id qorechain-diana
```

That window lasts 7,200 blocks and admits 20 transactions. Check what is left with `qorechaind query pqc evm-window <address>` or `GET /qorechain/pqc/v1/evm_window/{address}`. Opening a window advances the account sequence, which is also its EVM nonce, so read the nonce after the window is open. The full walkthrough is "Your First Transaction" in the QoreChain docs.

The 16 November deployment used a 1200-block, 10-transaction window; it has since expired, which is fine: the contract is deployed and reads need no window.

### 3. Deploy

```
npm run deploy:testnet    # forge script, or:
forge script script/QoreStamp.s.sol --rpc-url https://evm-testnet.qore.host --broadcast
```

The script prints the deployed address. Confirm it with `eth_getCode`, then verify it end to end:

```
npm run deployed          # verifies the deployment, writes deployed.json
npm run attest            # explicit hybrid-signed tx, writes attestation.json
npm run stamp             # first stamp, writes stamp.json
```

## Layout

```
src/
  QoreStamp.sol       the contract (deployed)
  hash.js             SHA-256 of files and buffers
  abi.js              selectors, calldata builders, result decoding
  rpc.js              minimal JSON-RPC client (fetch)
  cli.js              command line tool
  demo.js             scripted offline demo
contracts/
  StampRegistry.sol   earlier variant, kept for its tests
script/
  Deploy.s.sol        forge deploy script (reads PRIVATE_KEY; used by the anvil demo)
  QoreStamp.s.sol     forge deploy script (reads PRIVATE_KEY; used for testnet)
scripts/
  window.ts           PQC key registration + EVM window helper
  deployed.ts         deployment verification (writes deployed.json)
  attest.ts           hybrid attestation helper
  proof.ts            fest proof transaction helper
  stamp.ts            first-stamp helper
test/
  QoreStamp.t.sol     forge tests (QoreStamp)
  StampRegistry.t.sol forge tests (StampRegistry)
  hash.test.js        hash vectors
  abi.test.js         calldata and decoding
  rpc.test.js         RPC client against a stub server
  cli.test.js         CLI end to end
web/
  index.html          React app entry (Vite)
  vanilla.html        dependency-free page (served by serve.js)
  src/                React app source (stamp / verify / QoreX connect)
serve.js              static server for the vanilla page
deployed.json         testnet deployment evidence
attestation.json      hybrid attestation evidence
stamp.json            first stamp evidence
proof.json            fest proof transaction evidence
AI_USAGE.md           how AI was used to build this (Best AI-Native Build)
SUBMISSION.md         submission record
```

## Limits

- A stamp proves a document existed at a time. It says nothing about who wrote the document, only which address stamped its hash.
- The contract stores hashes, not files. If the document is lost, the hash cannot bring it back.
- The Diana testnet is periodically re-genesised (reset to height 0). Stamps on testnet can disappear in a reset; treat them as demo data.
- QoreChain EVM transactions need a registered post-quantum key and an open authorisation window (see the deploy section). This is a property of the chain, not of this project.
- The CLI and the web pages do not send transactions. They prepare calldata and read stamps. Sending needs cast, MetaMask or QoreX.

## License

MIT. See LICENSE.
