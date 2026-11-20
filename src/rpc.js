// Minimal JSON-RPC client over fetch. No dependencies. Used by the CLI
// and by the web page, so it stays free of Node-only imports.

import { decodeVerifyResult, normalizeAddress, normalizeHash, verifyCalldata } from './abi.js';

export const TESTNET_RPC_URL = 'https://evm-testnet.qore.host';
export const MAINNET_RPC_URL = 'https://evm.qore.host';
export const TESTNET_CHAIN_ID = 9800;
export const MAINNET_CHAIN_ID = 9801;

// QoreStamp deployed on the QoreChain Diana testnet (chain id 9800),
// 16 Nov 2026. Deploy tx 0xcdb740343394f59e899ae5b5744599332ce52acb68f25d8d9e06f558ac615310.
export const DEPLOYED_TESTNET_CONTRACT = '0x0edcf72466d381573d39919af1749ef3c91a4828';

let nextId = 1;

export async function rpcCall(url, method, params = [], timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error('could not reach ' + url + ' (' + err.message + ')');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error('RPC request failed with HTTP ' + response.status);
  }
  const body = await response.json();
  if (body.error) {
    throw new Error('RPC error ' + body.error.code + ': ' + body.error.message);
  }
  return body.result;
}

export async function getChainId(url) {
  const result = await rpcCall(url, 'eth_chainId');
  return Number(BigInt(result));
}

export async function getBlockNumber(url) {
  const result = await rpcCall(url, 'eth_blockNumber');
  return Number(BigInt(result));
}

/** Balance in wei, as a bigint. */
export async function getBalance(url, address) {
  const result = await rpcCall(url, 'eth_getBalance', [normalizeAddress(address), 'latest']);
  return BigInt(result);
}

/**
 * Query verify(hash) on a deployed QoreStamp with eth_call.
 * Returns { stamper, timestamp, blockNumber, label, exists }.
 */
export async function queryStamp(url, contract, hash) {
  const result = await rpcCall(url, 'eth_call', [
    { to: normalizeAddress(contract), data: verifyCalldata(normalizeHash(hash)) },
    'latest',
  ]);
  return decodeVerifyResult(result);
}
