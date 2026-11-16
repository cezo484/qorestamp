# QoreStamp web app

The QoreStamp front end: a Vite + React + wagmi dApp with RainbowKit and the
QoreX wallet, scaffolded from `create-qorechain-dapp` (`viem-wagmi` template,
0.14.0) and adapted for QoreStamp.

It connects a wallet (QoreX first), shows the account's QOR balance and its
EVM authorisation window, stamps document hashes on-chain, verifies stamps,
and lists recent stamps. Hashing (SHA-256) happens in the browser with the Web
Crypto API — documents never leave the user's machine.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build for production
```

The deployed contract address lives in `src/config.ts`
(`QORESTAMP_TESTNET_ADDRESS`). It is `0x0000…` until the contract is deployed;
the UI shows "not deployed yet" in that case.

## Networks

`src/wagmi.ts` lists both QoreChain EVM chains, testnet first:

| Chain | Id | RPC |
| --- | --- | --- |
| `qorechainTestnet` | 9800 | `https://evm-testnet.qore.host` |
| `qorechain` | 9801 | `https://evm.qore.host` |

QoreStamp is a **testnet-only** app: it targets `qorechainTestnet` (9800) and
refuses to stamp on any other chain.

## Wallets

- **QoreX** (`qorexWallet`): found through EIP-6963. It answers
  `eth_chainId`, `eth_accounts`, `eth_requestAccounts` and
  `wallet_switchEthereumChain` today; its EVM signing methods are not
  available yet, so use it to connect and read.
- **Injected** (`injectedWallet`): any browser wallet that exposes an EIP-1193
  provider, for signing.

Neither uses WalletConnect. To add a WalletConnect-based wallet, set
`VITE_WALLETCONNECT_PROJECT_ID` in `.env`.

## Stamping: the EVM authorisation window

QoreChain admits an EVM transaction only when the sender has a registered
**ML-DSA-87** key and a live **EVM authorisation window**. Both are set up on
QoreChain's native lane with the post-quantum key, so a browser wallet's
secp256k1 key can never authorise spending on its own.

The app reads the window with `evmWindowStatus` from `@qorechain/evm`. When a
stamp is refused, `classifyEvmWindowRejection(error)` tells you why:

| Result | Meaning |
| --- | --- |
| `no-pqc-key` | the account has no ML-DSA-87 key registered |
| `no-window` | no window is open |
| `exhausted` | the window ran out of blocks, transactions or value |
| `invalid` | the window parameters were refused |

Open the window from a wallet or tool that holds the account's post-quantum
key (QoreX: Settings → Security → EVM access window; or the `npm run window
open` helper in the project root), then stamp. Opening a window advances the
account's nonce.

The window panel reads the chain's REST API, which sends no CORS headers, so
the dev and preview servers forward `/lcd-testnet` and `/lcd-mainnet` to it
(`vite.config.ts`). For production, serve the app behind a proxy that does the
same.
