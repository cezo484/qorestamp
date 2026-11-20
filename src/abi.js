// Calldata building and result decoding for QoreStamp. Pure functions,
// no Node-only imports, so the web page imports this file too.
//
// Selectors come from cast (forge 1.9.0):
//   cast sig "stamp(bytes32,string)"  -> 0xb6977fc1
//   cast sig "verify(bytes32)"        -> 0x75e36616
//   cast sig "isStamped(bytes32)"     -> 0xbd33dca8
//   cast sig "hashAt(uint256)"        -> 0x8bc44252
//   cast sig "totalStamps()"          -> 0x552e5fb1

export const STAMP_SELECTOR = '0xb6977fc1';
export const VERIFY_SELECTOR = '0x75e36616';
export const IS_STAMPED_SELECTOR = '0xbd33dca8';
export const HASH_AT_SELECTOR = '0x8bc44252';
export const TOTAL_STAMPS_SELECTOR = '0x552e5fb1';

export const QORESTAMP_ABI = [
  'function stamp(bytes32 documentHash, string label)',
  'function verify(bytes32 documentHash) view returns (address stamper, uint64 timestamp, uint256 blockNumber, string label, bool exists)',
  'function isStamped(bytes32 documentHash) view returns (bool)',
  'function hashAt(uint256 index) view returns (bytes32)',
  'function totalStamps() view returns (uint256)',
  'event Stamped(bytes32 indexed documentHash, address indexed stampler, uint256 timestamp, string label)',
  'error AlreadyStamped(bytes32 documentHash)',
  'error EmptyHash()',
  'error LabelTooLong()',
];

/** The contract rejects labels longer than 64 bytes. */
export const MAX_LABEL_BYTES = 64;

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

/** A uint256 word, 64 hex characters. */
function word(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

/**
 * Calldata for stamp(hash, label): selector, then the ABI encoding of
 * (bytes32, string) — hash word, string offset (0x40), length, data padded
 * to a 32-byte boundary. The label defaults to empty.
 */
export function stampCalldata(hash, label = '') {
  const bytes = new TextEncoder().encode(String(label));
  if (bytes.length > MAX_LABEL_BYTES) {
    throw new Error('label is ' + bytes.length + ' bytes, the contract allows at most 64');
  }
  const data = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const padded = data.padEnd(Math.ceil(bytes.length / 32) * 64, '0');
  return STAMP_SELECTOR + normalizeHash(hash).slice(2) + word(0x40) + word(bytes.length) + padded;
}

/** Calldata for verify(hash). */
export function verifyCalldata(hash) {
  return VERIFY_SELECTOR + normalizeHash(hash).slice(2);
}

/** Calldata for isStamped(hash). */
export function isStampedCalldata(hash) {
  return IS_STAMPED_SELECTOR + normalizeHash(hash).slice(2);
}

/** Calldata for hashAt(index). */
export function hashAtCalldata(index) {
  return HASH_AT_SELECTOR + word(index);
}

/** Calldata for totalStamps(). */
export function totalStampsCalldata() {
  return TOTAL_STAMPS_SELECTOR;
}

/**
 * Decode the return data of verify(bytes32): five head words holding an
 * address, a uint64 timestamp, a uint256 block number, the label offset
 * and a bool, followed by the label string (length word + padded data).
 */
export function decodeVerifyResult(data) {
  const hex = String(data).toLowerCase().replace(/^0x/, '');
  if (hex.length < 320) {
    throw new Error('verify result must be at least 160 bytes, got ' + hex.length / 2);
  }
  const stamper = '0x' + hex.slice(24, 64);
  const timestamp = Number(BigInt('0x' + hex.slice(64, 128)));
  const blockNumber = Number(BigInt('0x' + hex.slice(128, 192)));
  const labelOffset = Number(BigInt('0x' + hex.slice(192, 256))) * 2;
  const exists = BigInt('0x' + hex.slice(256, 320)) !== 0n;
  if (labelOffset + 64 > hex.length) {
    throw new Error('verify result ends before the label length word');
  }
  const labelLength = Number(BigInt('0x' + hex.slice(labelOffset, labelOffset + 64)));
  const labelStart = labelOffset + 64;
  const labelEnd = labelStart + labelLength * 2;
  if (labelEnd > hex.length) {
    throw new Error('verify result ends before the label bytes');
  }
  const labelBytes = new Uint8Array(labelLength);
  for (let i = 0; i < labelLength; i++) {
    labelBytes[i] = parseInt(hex.slice(labelStart + i * 2, labelStart + i * 2 + 2), 16);
  }
  const label = new TextDecoder().decode(labelBytes);
  return { stamper, timestamp, blockNumber, label, exists };
}
