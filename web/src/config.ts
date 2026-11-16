/** QoreStamp deployment on the QoreChain testnet (qorechain-diana, EVM 9800). */
export const QORESTAMP_TESTNET_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

/** True once the address above is a real deployment (not the zero address). */
export const QORESTAMP_DEPLOYED =
  QORESTAMP_TESTNET_ADDRESS !== "0x0000000000000000000000000000000000000000";

/** QoreChain explorer (has a Mainnet/Testnet toggle). */
export const explorerTxUrl = (hash: string) => `https://explore.qore.network/tx/${hash}`;
export const explorerAddressUrl = (address: string) =>
  `https://explore.qore.network/address/${address}`;
