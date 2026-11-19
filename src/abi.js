// Calldata building and result decoding for StampRegistry. Pure functions,
// no Node-only imports, so the web page imports this file too.
//
// Selectors come from cast (forge 1.9.0):
//   cast sig "stamp(bytes32)"      -> 0xdd89581f
//   cast sig "verify(bytes32)"     -> 0x75e36616
//   cast sig "isStamped(bytes32)"  -> 0xbd33dca8

export const STAMP_SELECTOR = '0xdd89581f';
export const VERIFY_SELECTOR = '0x75e36616';
export const IS_STAMPED_SELECTOR = '0xbd33dca8';

export const STAMP_REGISTRY_ABI = [
  'function stamp(bytes32 hash)',
  'function verify(bytes32 hash) view returns (address stamper, uint256 timestamp, bool exists)',
  'function isStamped(bytes32 hash) view returns (bool)',
  'function totalStamps() view returns (uint256)',
  'event Stamped(bytes32 indexed hash, address indexed stamper, uint256 timestamp)',
  'error AlreadyStamped(bytes32 hash)',
  'error EmptyHash()',
];

/** Accept a 0x-prefixed or bare 64-hex-char hash, return it 0x-prefixed. */
export function normalizeHash(input) {
  const hex = String(input).trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('expected a 64-character hex hash, got: ' + input);
  }
  return '0x' + hex;
}

/** Accept an 0x-prefixed 40-hex-char address, return it lowercased. */
export function normalizeAddress(input) {
  const addr = String(input).trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    throw new Error('expected an Ethereum address, got: ' + input);
  }
  return addr;
}

/** Calldata for stamp(hash). */
export function stampCalldata(hash) {
  return STAMP_SELECTOR + normalizeHash(hash).slice(2);
}

/** Calldata for verify(hash). */
export function verifyCalldata(hash) {
  return VERIFY_SELECTOR + normalizeHash(hash).slice(2);
}

/** Calldata for isStamped(hash). */
export function isStampedCalldata(hash) {
  return IS_STAMPED_SELECTOR + normalizeHash(hash).slice(2);
}

/**
 * Decode the return data of verify(bytes32): three 32-byte words holding
 * an address, a uint256 timestamp and a bool.
 */
export function decodeVerifyResult(data) {
  const hex = String(data).toLowerCase().replace(/^0x/, '');
  if (hex.length !== 192) {
    throw new Error('verify result must be 96 bytes, got ' + hex.length / 2);
  }
  const stamper = '0x' + hex.slice(24, 64);
  const timestamp = Number(BigInt('0x' + hex.slice(64, 128)));
  const exists = BigInt('0x' + hex.slice(128, 192)) !== 0n;
  return { stamper, timestamp, exists };
}
