import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeVerifyResult,
  isStampedCalldata,
  normalizeAddress,
  normalizeHash,
  stampCalldata,
  verifyCalldata,
} from '../src/abi.js';

const HASH = '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('normalizeHash', () => {
  it('accepts a 0x-prefixed hash', () => {
    assert.equal(normalizeHash(HASH), HASH);
  });

  it('accepts a bare hash and adds the prefix', () => {
    assert.equal(normalizeHash(HASH.slice(2)), HASH);
  });

  it('lowercases and trims', () => {
    assert.equal(normalizeHash('  ' + HASH.toUpperCase() + ' '), HASH);
  });

  it('rejects short, long and non-hex input', () => {
    assert.throws(() => normalizeHash('0x1234'), /64-character hex/);
    assert.throws(() => normalizeHash(HASH + '00'), /64-character hex/);
    assert.throws(() => normalizeHash('zz'.repeat(32)), /64-character hex/);
  });
});

describe('normalizeAddress', () => {
  it('accepts a valid address', () => {
    assert.equal(
      normalizeAddress('0xA11cE00000000000000000000000000000000000'.toLowerCase()),
      '0xa11ce00000000000000000000000000000000000',
    );
  });

  it('rejects a bad address', () => {
    assert.throws(() => normalizeAddress('0x1234'), /Ethereum address/);
    assert.throws(() => normalizeAddress('not an address'), /Ethereum address/);
  });
});

describe('calldata builders', () => {
  it('builds stamp calldata with the 0xdd89581f selector', () => {
    assert.equal(
      stampCalldata(HASH),
      '0xdd89581f' + HASH.slice(2),
    );
  });

  it('builds verify calldata with the 0x75e36616 selector', () => {
    assert.equal(
      verifyCalldata(HASH),
      '0x75e36616' + HASH.slice(2),
    );
  });

  it('builds isStamped calldata with the 0xbd33dca8 selector', () => {
    assert.equal(
      isStampedCalldata(HASH),
      '0xbd33dca8' + HASH.slice(2),
    );
  });
});

describe('decodeVerifyResult', () => {
  it('decodes a stamp record', () => {
    const data =
      '0x' +
      '000000000000000000000000000000000000000000000000000000000000a11c' +
      '000000000000000000000000000000000000000000000000000000006b49d200' +
      '0000000000000000000000000000000000000000000000000000000000000001';
    assert.deepEqual(decodeVerifyResult(data), {
      stamper: '0x000000000000000000000000000000000000a11c',
      timestamp: 1800000000,
      exists: true,
    });
  });

  it('decodes an unstamped hash as an empty record', () => {
    const data = '0x' + '00'.repeat(96);
    assert.deepEqual(decodeVerifyResult(data), {
      stamper: '0x0000000000000000000000000000000000000000',
      timestamp: 0,
      exists: false,
    });
  });

  it('rejects a result of the wrong length', () => {
    assert.throws(() => decodeVerifyResult('0x1234'), /96 bytes/);
  });
});
