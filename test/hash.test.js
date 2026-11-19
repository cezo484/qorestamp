import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256File, sha256Hex } from '../src/hash.js';

describe('sha256Hex', () => {
  it('hashes the empty string', () => {
    assert.equal(
      sha256Hex(''),
      '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('hashes "abc"', () => {
    assert.equal(
      sha256Hex('abc'),
      '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes a Buffer the same way as a string', () => {
    assert.equal(sha256Hex(Buffer.from('abc')), sha256Hex('abc'));
  });
});

describe('sha256File', () => {
  it('hashes a file on disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qorestamp-test-'));
    try {
      const path = join(dir, 'hello.txt');
      await writeFile(path, 'hello world\n');
      assert.equal(
        await sha256File(path),
        '0xa948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects for a missing file', async () => {
    await assert.rejects(sha256File('/no/such/file.txt'));
  });
});
