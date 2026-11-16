/**
 * deployed.ts — record the deployed QoreStamp address as deployed.json.
 *
 * Reads the address from the Foundry broadcast artifact
 * (broadcast/QoreStamp.s.sol/9800/run-latest.json) after
 * `npm run deploy:testnet`, verifies the contract has code on-chain, and
 * writes deployed.json. Run it right after deploying.
 *
 * Usage: npx tsx scripts/deployed.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
import { qorechainTestnet } from "@qorechain/evm";

const broadcast = JSON.parse(
  readFileSync(new URL("../broadcast/QoreStamp.s.sol/9800/run-latest.json", import.meta.url), "utf8"),
) as { transactions?: Array<{ contractAddress?: string; hash?: string }> };
const deploy = broadcast.transactions?.find((t) => t.contractAddress);
if (!deploy?.contractAddress || !deploy.hash) {
  throw new Error("No deployment found in broadcast/QoreStamp.s.sol/9800/run-latest.json — deploy first.");
}

const publicClient = createPublicClient({ chain: qorechainTestnet, transport: http() });
const code = await publicClient.getCode({ address: deploy.contractAddress as `0x${string}` });
if (!code || code === "0x") throw new Error(`No code at ${deploy.contractAddress} — deployment did not land.`);
const receipt = await publicClient.getTransactionReceipt({ hash: deploy.hash as `0x${string}` });

const deployed = {
  network: "qorechain-diana",
  evmChainId: 9800,
  contract: deploy.contractAddress,
  deployTxHash: deploy.hash,
  blockNumber: receipt.blockNumber.toString(),
  deployer: receipt.from,
  note: "EVM-lane tx: the QoreChain explorer indexes native-lane txs; verify this one with eth_getTransactionReceipt on https://evm-testnet.qore.host.",
};
writeFileSync(new URL("../deployed.json", import.meta.url), JSON.stringify(deployed, null, 2) + "\n");
console.log(`contract: ${deployed.contract}`);
console.log(`deploy tx: ${deployed.deployTxHash} (block ${deployed.blockNumber})`);
console.log("Next: put the contract address in web/src/config.ts (QORESTAMP_TESTNET_ADDRESS).");
