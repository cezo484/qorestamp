import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, 'src', 'cli.js');

const DEPLOYED_CONTRACT = '0x0edcf72466d381573d39919af1749ef3c91a4828';
const HASH_ABC = '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

// A canned verify() answer: stamper 0xA11CE, timestamp 1800000000,
// block 10385404, label "demo", exists.
const VERIFY_RESULT =
  '0x' +
  '000000000000000000000000000000000000000000000000000000000000a11c' +
  '000000000000000000000000000000000000000000000000000000006b49d200' +
  '00000000000000000000000000000000000000000000000000000000009e77fc' +
  '00000000000000000000000000000000000000000000000000000000000000a0' +
  '0000000000000000000000000000000000000000000000000000000000000001' +
  '0000000000000000000000000000000000000000000000000000000000000004' +
  '64656d6f' + '00'.repeat(28);

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
      assert.match(stdout, new RegExp(HASH_ABC));
      assert.match(
        stdout,
        /0xb6977fc1ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000/,
      );
      assert.match(stdout, /cast send/);
      assert.match(stdout, /stamp\(bytes32,string\)/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('stamp with --label prints the label in the calldata', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'qorestamp-cli-'));
    try {
      const path = join(dir, 'doc.txt');
      await writeFile(path, 'abc');
      const { code, stdout } = await runCli(['stamp', path, '--label', 'first stamp']);
      assert.equal(code, 0);
      assert.match(stdout, /label:    first stamp/);
      assert.match(stdout, /6669727374207374616d70/);
      assert.match(stdout, /"first stamp"/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('verify without --contract uses the deployed testnet contract', async () => {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        const result = parsed.method === 'eth_call' ? VERIFY_RESULT : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const stub = 'http://127.0.0.1:' + server.address().port;
      const { code, stdout } = await runCli(['verify', HASH_ABC], {
        QORESTAMP_CONTRACT: '',
        QORESTAMP_RPC: stub,
      });
      assert.equal(code, 0);
      assert.match(stdout, new RegExp('contract: ' + DEPLOYED_CONTRACT));
      assert.match(stdout, /result:   stamped/);
      assert.match(stdout, /block:    10385404/);
      assert.match(stdout, /label:    demo/);
    } finally {
      server.close();
    }
  });

  it('rejects an unknown command', async () => {
    const { code, stderr } = await runCli(['frobnicate']);
    assert.notEqual(code, 0);
    assert.match(stderr, /unknown command/);
  });
});
