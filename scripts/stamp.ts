/**
 * stamp.ts — send the first stamp to the deployed QoreStamp contract as an
 * end-to-end check, and record the evidence in stamp.json.
 *
 * Reads the contract address from deployed.json (written by the deploy step)
 * or from QORESTAMP_ADDRESS. Stamps the SHA-256 hash of a fixed demo message
 * with a label. Requires a live EVM authorisation window (see README).
 * Testnet only.
 *
 * Usage: npx tsx --env-file=.env scripts/stamp.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { qorechainTestnet } from "@qorechain/evm";
import { qoreStampAbi } from "../web/src/abi.js";

const MESSAGE = "QoreStamp first stamp — Build Before Q-Day, Quantum Pass";
const LABEL = "first stamp";

function contractAddress(): `0x${string}` {
  const fromEnv = process.env.QORESTAMP_ADDRESS?.trim();
  if (fromEnv) return fromEnv as `0x${string}`;
  try {
    const deployed = JSON.parse(readFileSync(new URL("../deployed.json", import.meta.url), "utf8")) as {
      contract: string;
    };
    return deployed.contract as `0x${string}`;
  } catch {
    throw new Error("No contract address: deploy first (npm run deploy:testnet) or set QORESTAMP_ADDRESS.");
  }
}

const key = process.env.PRIVATE_KEY?.trim();
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set PRIVATE_KEY in .env");

const address = contractAddress();
const hash = `0x${createHash("sha256").update(MESSAGE).digest("hex")}` as `0x${string}`;
const account = privateKeyToAccount(key as `0x${string}`);
const wallet = createWalletClient({ account, chain: qorechainTestnet, transport: http() });
const publicClient = createPublicClient({ chain: qorechainTestnet, transport: http() });

const txHash = await wallet.writeContract({
  address,
  abi: qoreStampAbi,
  functionName: "stamp",
  args: [hash, LABEL],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
if (receipt.status !== "success") throw new Error(`stamp tx reverted: ${txHash}`);

const stamp = {
  network: "qorechain-diana",
  evmChainId: 9800,
  contract: address,
  message: MESSAGE,
  documentHash: hash,
  label: LABEL,
  stampler: account.address,
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  gasUsed: receipt.gasUsed.toString(),
  note: "EVM-lane tx: the QoreChain explorer indexes native-lane txs; verify this one with eth_getTransactionReceipt on https://evm-testnet.qore.host.",
};
writeFileSync(new URL("../stamp.json", import.meta.url), JSON.stringify(stamp, null, 2) + "\n");
console.log(`stamped: ${txHash} (block ${receipt.blockNumber})`);
console.log(`document hash: ${hash}`);
