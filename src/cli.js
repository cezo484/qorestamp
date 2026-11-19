// QoreStamp command line tool. Hash a file locally, build the calldata
// that stamps its hash on chain, and query stamps over JSON-RPC.
//
// This tool never signs a transaction and never asks for a private key.
// Sending a stamp is done with cast, MetaMask or QoreX; the `stamp`
// command prints the exact calldata and the cast command for it.

import { existsSync } from 'node:fs';
import { sha256File } from './hash.js';
import { normalizeHash, stampCalldata } from './abi.js';
import { getBlockNumber, getChainId, queryStamp, TESTNET_RPC_URL } from './rpc.js';

const HELP = `QoreStamp: stamp a document hash on QoreChain, verify it later.

Usage:
  node src/cli.js hash <file> [--json]
  node src/cli.js stamp <file> [--contract 0x...] [--rpc URL]
  node src/cli.js verify <file | 0xhash> [--contract 0x...] [--rpc URL] [--json]
  node src/cli.js info [--rpc URL]

Options:
  --contract  StampRegistry address. Defaults to QORESTAMP_CONTRACT.
  --rpc       EVM JSON-RPC URL. Defaults to QORESTAMP_RPC or the QoreChain
              testnet endpoint https://evm-testnet.qore.host (chain id 9800).

The file is hashed on this machine. It is never uploaded anywhere.
`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--contract' || arg === '--rpc') {
      flags[arg.slice(2)] = argv[++i];
    } else if (arg.startsWith('--contract=')) {
      flags.contract = arg.slice('--contract='.length);
    } else if (arg.startsWith('--rpc=')) {
      flags.rpc = arg.slice('--rpc='.length);
    } else if (arg.startsWith('--')) {
      throw new Error('unknown option: ' + arg);
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function rpcUrl(flags) {
  return flags.rpc || process.env.QORESTAMP_RPC || TESTNET_RPC_URL;
}

function contractAddress(flags) {
  const address = flags.contract || process.env.QORESTAMP_CONTRACT;
  if (!address) {
    throw new Error(
      'no contract address. Pass --contract 0x... or set QORESTAMP_CONTRACT. ' +
      'Deploy first; see README.md.',
    );
  }
  return address;
}

/** A path is a file when it exists on disk; otherwise it must be a hash. */
async function hashOf(target) {
  if (existsSync(target)) {
    return { hash: await sha256File(target), source: 'file ' + target };
  }
  return { hash: normalizeHash(target), source: 'hash ' + target };
}

async function cmdHash(target, flags) {
  const hash = await sha256File(target);
  if (flags.json) {
    console.log(JSON.stringify({ file: target, sha256: hash }));
  } else {
    console.log('file:   ' + target);
    console.log('sha256: ' + hash);
  }
}

async function cmdStamp(target, flags) {
  const hash = await sha256File(target);
  const data = stampCalldata(hash);
  const contract = flags.contract || process.env.QORESTAMP_CONTRACT || '<contract-address>';
  const rpc = rpcUrl(flags);
  console.log('file:     ' + target);
  console.log('sha256:   ' + hash);
  console.log('calldata: ' + data);
  console.log('');
  console.log('To stamp it, send a transaction to the StampRegistry contract');
  console.log('with this calldata. One way, with cast:');
  console.log('');
  console.log('  cast send ' + contract + ' "stamp(bytes32)" ' + hash);
  console.log('    --rpc-url ' + rpc + ' --private-key $PRIVATE_KEY');
  console.log('');
  console.log('On QoreChain the sending account also needs a registered');
  console.log('post-quantum key and an open EVM authorisation window.');
  console.log('See "Deploy to QoreChain testnet" in README.md.');
}

async function cmdVerify(target, flags) {
  const { hash, source } = await hashOf(target);
  const contract = contractAddress(flags);
  const rpc = rpcUrl(flags);
  const stamp = await queryStamp(rpc, contract, hash);
  if (flags.json) {
    console.log(JSON.stringify({ hash, contract, rpc, ...stamp }));
    return;
  }
  console.log('checked:  ' + source);
  console.log('sha256:   ' + hash);
  console.log('contract: ' + contract);
  if (!stamp.exists) {
    console.log('result:   no stamp found for this hash');
    return;
  }
  console.log('result:   stamped');
  console.log('stamper:  ' + stamp.stamper);
  console.log('stamped:  ' + new Date(stamp.timestamp * 1000).toISOString());
}

async function cmdInfo(flags) {
  const rpc = rpcUrl(flags);
  const [chainId, block] = await Promise.all([getChainId(rpc), getBlockNumber(rpc)]);
  console.log('rpc:       ' + rpc);
  console.log('chain id:  ' + chainId);
  console.log('block:     ' + block);
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  const { positional, flags } = parseArgs(rest);
  if (command === 'hash') {
    if (positional.length !== 1) throw new Error('hash needs one file');
    await cmdHash(positional[0], flags);
  } else if (command === 'stamp') {
    if (positional.length !== 1) throw new Error('stamp needs one file');
    await cmdStamp(positional[0], flags);
  } else if (command === 'verify') {
    if (positional.length !== 1) throw new Error('verify needs a file or a hash');
    await cmdVerify(positional[0], flags);
  } else if (command === 'info') {
    if (positional.length !== 0) throw new Error('info takes no arguments');
    await cmdInfo(flags);
  } else {
    throw new Error('unknown command: ' + command + '\n' + HELP);
  }
}

main(process.argv.slice(2)).catch((err) => {
  console.error('error: ' + err.message);
  process.exit(1);
});
