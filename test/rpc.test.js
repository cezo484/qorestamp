import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { getBalance, getBlockNumber, getChainId, queryStamp, rpcCall } from '../src/rpc.js';

const CONTRACT = '0x0000000000000000000000000000000000000001';
const HASH = '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

const VERIFY_RESULT =
  '0x' +
  '000000000000000000000000000000000000000000000000000000000000a11c' +
  '000000000000000000000000000000000000000000000000000000006b49d200' +
  '00000000000000000000000000000000000000000000000000000000009e77fc' +
  '00000000000000000000000000000000000000000000000000000000000000a0' +
  '0000000000000000000000000000000000000000000000000000000000000001' +
  '0000000000000000000000000000000000000000000000000000000000000004' +
  '64656d6f' + '00'.repeat(28);

let server;
let url;
let lastRequest;

before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const parsed = JSON.parse(body);
      lastRequest = parsed;
      let result = null;
      if (parsed.method === 'eth_chainId') result = '0x2648';
      if (parsed.method === 'eth_blockNumber') result = '0x9e77fc';
      if (parsed.method === 'eth_getBalance') result = '0xde0b6b3a7640000';
      if (parsed.method === 'eth_call') result = VERIFY_RESULT;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});

after(() => server.close());

describe('rpc client', () => {
  it('reads the chain id', async () => {
    assert.equal(await getChainId(url), 9800);
  });

  it('reads the block number', async () => {
    assert.equal(await getBlockNumber(url), 10385404);
  });

  it('reads a balance in wei', async () => {
    assert.equal(await getBalance(url, CONTRACT), 1000000000000000000n);
  });

  it('queries a stamp and decodes the record', async () => {
    const stamp = await queryStamp(url, CONTRACT, HASH);
    assert.deepEqual(stamp, {
      stamper: '0x000000000000000000000000000000000000a11c',
      timestamp: 1800000000,
      blockNumber: 10385404,
      label: 'demo',
      exists: true,
    });
    assert.equal(lastRequest.method, 'eth_call');
    assert.equal(lastRequest.params[0].to, CONTRACT);
    assert.equal(
      lastRequest.params[0].data,
      '0x75e36616' + HASH.slice(2),
    );
  });

  it('reports an unreachable endpoint', async () => {
    await assert.rejects(rpcCall('http://127.0.0.1:1', 'eth_chainId'), /could not reach/);
  });
});
