import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, 'src', 'cli.js');

function runCli(args, env = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { env: { ...process.env, ...env }, timeout: 15000 },
      (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }),
    );
  });
}

describe('CLI', () => {
  it('prints help', async () => {
    const { code, stdout } = await runCli(['help']);
    assert.equal(code, 0);
    assert.match(stdout, /QoreStamp/);
    assert.match(stdout, /hash <file>/);
  });

  it('hashes a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qorestamp-cli-'));
    try {
      const path = join(dir, 'doc.txt');
      await writeFile(path, 'abc');
      const { code, stdout } = await runCli(['hash', path]);
      assert.equal(code, 0);
      assert.match(stdout, /0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('hashes a file as JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qorestamp-cli-'));
    try {
      const path = join(dir, 'doc.txt');
      await writeFile(path, 'abc');
      const { code, stdout } = await runCli(['hash', path, '--json']);
      assert.equal(code, 0);
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.sha256, '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
      assert.equal(parsed.file, path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('stamp prints the hash and the calldata', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qorestamp-cli-'));
    try {
      const path = join(dir, 'doc.txt');
      await writeFile(path, 'abc');
      const { code, stdout } = await runCli(['stamp', path]);
      assert.equal(code, 0);
      assert.match(stdout, /0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
      assert.match(stdout, /0xdd89581fba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
      assert.match(stdout, /cast send/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('verify without a contract address fails with a clear message', async () => {
    const { code, stderr } = await runCli(
      ['verify', '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
      { QORESTAMP_CONTRACT: '' },
    );
    assert.notEqual(code, 0);
    assert.match(stderr, /no contract address/);
  });

  it('rejects an unknown command', async () => {
    const { code, stderr } = await runCli(['frobnicate']);
    assert.notEqual(code, 0);
    assert.match(stderr, /unknown command/);
  });
});
