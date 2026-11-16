/**
 * proof.ts — link this project to the Developer Fest platform.
 *
 * When a project is created on build.qorechain.io, the platform shows a link
 * code. This script sends 1 uqor (0.000001 QOR) to the deployer's own account
 * with the memo `bbqd-link:<code>` so the platform can verify on-chain that
 * this wallet belongs to the project. It writes proof.json with the tx hash.
 *
 * Requires a funded account with a registered ML-DSA-87 key. Testnet only.
 *
 * Usage: BBQD_LINK_CODE=<code from build.qorechain.io> npx tsx --env-file=.env scripts/proof.ts
 */
import { writeFileSync } from "node:fs";
import {
  createClient,
  deriveUnifiedAccount,
  directSignerFromPrivateKey,
  getNetwork,
} from "@qorechain/sdk";

const code = process.env.BBQD_LINK_CODE?.trim();
if (!code) {
  throw new Error(
    "Set BBQD_LINK_CODE to the link code shown for this project on build.qorechain.io " +
      "(the memo is bbqd-link:<code>).",
  );
}
const mnemonic = process.env.QORE_MNEMONIC?.trim();
if (!mnemonic) throw new Error("Set QORE_MNEMONIC in .env");

const net = getNetwork("testnet");
const client = createClient({ network: "testnet" });
const account = await deriveUnifiedAccount(mnemonic, 0);
const signer = await directSignerFromPrivateKey(
  Uint8Array.from(Buffer.from(account.privateKey.slice(2), "hex")),
  "qor",
);
const tx = await client.connectTx(signer, { pqcKeypair: account.pqc });

const memo = `bbqd-link:${code}`;
const res = await tx.bankSend(account.cosmos, [{ denom: "uqor", amount: "1" }], { memo });
if (res.code !== 0) throw new Error(`proof tx failed with code ${res.code}`);

const proof = {
  network: net.chainId,
  evmChainId: net.evmChainId,
  accountCosmos: account.cosmos,
  accountEvm: account.evm,
  txHash: res.transactionHash,
  explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
  height: res.height ?? null,
  gasUsed: res.gasUsed?.toString() ?? null,
  memo,
  note: "Registration proof for the Developer Fest platform: 1 uqor to self with the bbqd-link memo.",
};
writeFileSync(new URL("../proof.json", import.meta.url), JSON.stringify(proof, null, 2) + "\n");
console.log(`proof sent: ${res.transactionHash}`);
console.log(`explorer: ${proof.explorer}`);
