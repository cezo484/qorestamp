# QoreStamp

On-chain document timestamping on QoreChain. Hash a file on your own machine, stamp its SHA-256 hash on chain, and let anyone verify later that the document existed at that time. The file itself is never uploaded or stored anywhere; only its hash goes on chain.

Built for Build Before Q-Day: The QoreChain Developer Fest. Submission deadline is 2 December 2026, 23:59 UTC.

## How it works

1. You hash a document (SHA-256) locally, in the browser or on the command line.
2. You send the hash to the StampRegistry contract. The contract records your address and the block timestamp.
3. Anyone with the same document re-hashes it and queries the contract. A matching hash returns the original stamper and timestamp.

A hash can be stamped once. A second stamp of the same hash reverts, so the first stamp stays the record.

## Status

The contract is written and tested. The CLI, web page and demo all run. Testnet deployment has not happened yet; the deploy step is in the deploy section below.

## Install

Node.js 20 or newer. No npm dependencies, nothing to install. For the contract you need Foundry (forge 1.9.0 was used here).

```
git clone <repo>
cd qorestamp
git submodule update --init
forge build
```

## Use it

Hash a file:

```
node src/cli.js hash contract.pdf
```

Show the stamp calldata and the cast command that sends it:

```
node src/cli.js stamp contract.pdf
```

Verify a file against the deployed contract:

```
QORESTAMP_CONTRACT=0x... node src/cli.js verify contract.pdf
```

Verify a bare hash instead of a file:

```
QORESTAMP_CONTRACT=0x... node src/cli.js verify 0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

Check the chain the CLI points at:

```
node src/cli.js info
```

`--json` on `hash` and `verify` prints structured output. `--rpc` overrides the endpoint; the default is the QoreChain testnet RPC. The CLI never signs a transaction and never asks for a private key.

Run the scripted demo (hashes a sample document, builds the calldata, queries a stub RPC server; fully offline):

```
npm run demo
```

## Web page

```
npm run web
```

Then open http://localhost:8080. Pick or drop a file; the page hashes it with the browser Web Crypto API and shows the hash and the stamp calldata. The verify box queries a deployed contract over JSON-RPC. The file never leaves the page. The page does not send transactions; stamping is done with cast or a wallet.

## The contract

`contracts/StampRegistry.sol`, Solidity 0.8.24.

- `stamp(bytes32 hash)` records `msg.sender` and `block.timestamp`, emits `Stamped`, and counts the stamp. It reverts with `AlreadyStamped` when the hash has a stamp, and with `EmptyHash` for the zero hash.
- `verify(bytes32 hash)` returns `(stamper, timestamp, exists)`. Unstamped hashes return the zero address, timestamp 0 and false.
- `isStamped(bytes32 hash)` returns whether a stamp exists.
- `totalStamps()` returns the number of stamps.

## Tests

```
forge test
npm test
```

`forge test` runs 9 tests, including a fuzz test over arbitrary hashes. `npm test` runs 28 tests: hash vectors, calldata building and result decoding, the RPC client against a local stub server, and CLI end to end runs. All tests pass.

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
cast send <contract> "stamp(bytes32)" $HASH --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY
QORESTAMP_CONTRACT=<contract> QORESTAMP_RPC=http://127.0.0.1:8545 node src/cli.js verify /tmp/doc.txt
```

This was run on 19 November 2026. The deploy landed at `0x5FbDB2315678afecb367f032d93F642f64180aa3`, the stamp transaction `0x7d7aff83d7ba4a766b4d325bf0b4c72677b0ba5d27d723103c05c279d1c16be1` succeeded in block 2, the CLI verify returned the stamper and timestamp, and a second stamp of the same hash reverted with `AlreadyStamped`. Those addresses and hashes are from the local anvil run only.

## Deploy to QoreChain testnet

Network values (from docs.qorechain.io, checked 19 November 2026):

| | Testnet | Mainnet |
| --- | --- | --- |
| Network name | qorechain-diana | qorechain-vladi |
| EVM chain id | 9800 | 9801 |
| EVM JSON-RPC | https://evm-testnet.qore.host | https://evm.qore.host |
| Explorer | https://explore.qore.network | https://explore.qore.network |
| Currency | QOR | QOR |

Deploy to testnet. Mainnet is out of scope for the fest submission.

### 1. Fund the deploy account

The faucet lives on the Dashboard and needs a sign-in; there is no public faucet endpoint. Open dashboard.qorechain.io/faucet, sign in, and paste the deploy account's `0x` address. A claim pays 100 testnet QOR, once every 24 hours per account and per address. Testnet QOR has no value.

A fresh testnet-only key for this project is already in `.env` (mode 600, gitignored). Its address is written in the comment at the top of that file. Use it for the faucet claim, or generate another with `cast wallet new`.

### 2. Register a post-quantum key and open an EVM authorisation window

Since the v3.2.0 upgrade, the EVM lane only accepts a transaction from an account with a registered ML-DSA-87 post-quantum key and an open EVM authorisation window. Without both, `eth_sendRawTransaction` is refused (codespace `pqc`, codes 26, 27 or 28). Reads, `eth_call` and gas estimation need neither.

The window only works with an `eth_secp256k1` key (coin type 60). In QoreX, add an Ethereum account under Your accounts ("Add an Ethereum account (coin 60)"), then register its key once:

```
qorechaind tx pqc register-key-v2 --from mykey --chain-id qorechain-diana --gas 600000 --fees 60000uqor
```

This one transaction is exempt from the hybrid signature requirement, so a new account can bootstrap. Then open a window. It is a Cosmos-lane transaction, so build it unsigned and cosign it with the post-quantum key:

```
qorechaind tx pqc open-evm-window 7200 20 1000qor --from mykey \
  --chain-id qorechain-diana --gas 400000 --fees 40000uqor --generate-only > w.json
qorechaind tx pqc cosign w.json --from mykey --pqc-key mypqc --chain-id qorechain-diana
```

That window lasts 7,200 blocks and admits 20 transactions. Check what is left with `qorechaind query pqc evm-window <address>` or `GET /qorechain/pqc/v1/evm_window/{address}`. Opening a window advances the account sequence, which is also its EVM nonce, so read the nonce after the window is open. The full walkthrough is "Your First Transaction" in the QoreChain docs.

### 3. Deploy

```
set -a; source .env; set +a
forge script script/Deploy.s.sol --rpc-url https://evm-testnet.qore.host --broadcast
```

The script prints the deployed address. Confirm it on the explorer, then set it for the CLI and the web page:

```
export QORESTAMP_CONTRACT=<deployed address>
```

Then stamp and verify against testnet:

```
node src/cli.js stamp contract.pdf
QORESTAMP_CONTRACT=<address> node src/cli.js verify contract.pdf
```

## Layout

```
contracts/
  StampRegistry.sol   the contract
script/
  Deploy.s.sol        forge deploy script (reads PRIVATE_KEY)
src/
  hash.js             SHA-256 of files and buffers
  abi.js              selectors, calldata builders, result decoding
  rpc.js              minimal JSON-RPC client (fetch)
  cli.js              command line tool
  demo.js             scripted offline demo
test/
  StampRegistry.t.sol forge tests
  hash.test.js        hash vectors
  abi.test.js         calldata and decoding
  rpc.test.js         RPC client against a stub server
  cli.test.js         CLI end to end
web/
  index.html          browser page (hashes client-side)
serve.js              static server for the web page
```

## Limits

- A stamp proves a document existed at a time. It says nothing about who wrote the document, only which address stamped its hash.
- The contract stores hashes, not files. If the document is lost, the hash cannot bring it back.
- The Diana testnet is periodically re-genesised (reset to height 0). Stamps on testnet can disappear in a reset; treat them as demo data.
- QoreChain EVM transactions need a registered post-quantum key and an open authorisation window (see the deploy section). This is a property of the chain, not of this project.
- The CLI and the web page do not send transactions. They prepare calldata and read stamps. Sending needs cast, MetaMask or QoreX.

## License

MIT. See LICENSE.
