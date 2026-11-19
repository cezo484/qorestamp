// Scripted demo. Runs fully offline: it hashes a sample document, builds
// the stamp calldata, then queries a small stub JSON-RPC server that
// answers like a StampRegistry contract would.
//
// For a live demo against a local chain, see "Local demo (anvil)" in
// README.md.

import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256File } from './hash.js';
import { stampCalldata, verifyCalldata } from './abi.js';
import { getChainId, queryStamp } from './rpc.js';

// A canned verify() answer: stamper 0xA11CE, timestamp 1800000000, exists.
const CANNED_VERIFY_RESULT =
  '0x' +
  '000000000000000000000000000000000000000000000000000000000000a11c' +
  '000000000000000000000000000000000000000000000000000000006b49d200' +
  '0000000000000000000000000000000000000000000000000000000000000001';

function startStubServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const { id, method } = JSON.parse(body);
        let result = null;
        if (method === 'eth_chainId') result = '0x2648';
        if (method === 'eth_call') result = CANNED_VERIFY_RESULT;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port });
    });
  });
}

const dir = await mkdtemp(join(tmpdir(), 'qorestamp-demo-'));
const docPath = join(dir, 'agreement.txt');
await writeFile(docPath, 'QoreStamp demo document.\nSigned by both parties.\n');

console.log('QoreStamp demo');
console.log('==============');
console.log('');
console.log('1. Hash the document locally');
console.log('   file:   ' + docPath);
const hash = await sha256File(docPath);
console.log('   sha256: ' + hash);
console.log('');
console.log('2. Build the stamp transaction calldata');
console.log('   stamp calldata:  ' + stampCalldata(hash));
console.log('   verify calldata: ' + verifyCalldata(hash));
console.log('');
console.log('3. Query the stamp over JSON-RPC (stub server, offline)');
const { server, url } = await startStubServer();
try {
  const chainId = await getChainId(url);
  console.log('   chain id: ' + chainId + ' (9800 is the QoreChain testnet)');
  const stamp = await queryStamp(url, '0x0000000000000000000000000000000000000001', hash);
  console.log('   stamper:  ' + stamp.stamper);
  console.log('   stamped:  ' + new Date(stamp.timestamp * 1000).toISOString());
  console.log('   exists:   ' + stamp.exists);
} finally {
  server.close();
  await rm(dir, { recursive: true, force: true });
}
console.log('');
console.log('Done. The file never left this machine.');
