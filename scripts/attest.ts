/**
 * attest.ts — send one explicit hybrid-signed native-lane transaction as
 * QoreStamp's "one hybrid-signed transaction" evidence (in addition to the
 * hybrid-signed MsgOpenEVMWindow from `npm run window open`).
 *
 * Sends 1 uqor (0.000001 QOR) to the deployer's own account with a memo, and
 * writes attestation.json with the tx hash. Requires a funded account with a
 * registered ML-DSA-87 key (see README). Testnet only.
 *
 * Usage: npx tsx --env-file=.env scripts/attest.ts
 */
import { writeFileSync } from "node:fs";
import {
  createClient,
  deriveUnifiedAccount,
  directSignerFromPrivateKey,
  getNetwork,
} from "@qorechain/sdk";

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

const res = await tx.bankSend(
  account.cosmos,
  [{ denom: "uqor", amount: "1" }],
  { memo: "QoreStamp hybrid attestation" },
);
if (res.code !== 0) throw new Error(`attestation tx failed with code ${res.code}`);

const attestation = {
  network: net.chainId,
  evmChainId: net.evmChainId,
  accountCosmos: account.cosmos,
  accountEvm: account.evm,
  txHash: res.transactionHash,
  explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
  height: res.height ?? null,
  gasUsed: res.gasUsed?.toString() ?? null,
  memo: "QoreStamp hybrid attestation",
  note: "Native-lane bank send of 1 uqor to self, signed hybrid (secp256k1 + ML-DSA-87).",
};
writeFileSync(new URL("../attestation.json", import.meta.url), JSON.stringify(attestation, null, 2) + "\n");
console.log(`attested: ${res.transactionHash}`);
console.log(`explorer: ${attestation.explorer}`);
