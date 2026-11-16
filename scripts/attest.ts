/**
 * attest.ts — send one explicit hybrid-signed native-lane transaction as
 * QoreStamp's "one hybrid-signed transaction" evidence (in addition to the
 * hybrid-signed MsgOpenEVMWindow from `npm run window open`).
 *
 * Sends 1 uqor (0.000001 QOR) to the deployer's own account with a memo, and
 * writes attestation.json with the tx hash. Requires a funded account with a
 * registered ML-DSA-87 key (see README). Testnet only.
 *
 * Signing goes through EthNativeSigner (the unified-account signer, same as
 * window.ts): the generic directSignerFromPrivateKey derives the standard
 * Cosmos ripemd160 address, which is a DIFFERENT qor1 address than the
 * unified eth-native account and does not exist on chain.
 *
 * Usage: npx tsx --env-file=.env scripts/attest.ts
 */
import { writeFileSync } from "node:fs";
import { StargateClient } from "@cosmjs/stargate";
import {
  EthNativeSigner,
  deriveUnifiedAccount,
  getNetwork,
} from "@qorechain/sdk";

const mnemonic = process.env.QORE_MNEMONIC?.trim();
if (!mnemonic) throw new Error("Set QORE_MNEMONIC in .env");

const n = getNetwork("testnet");
const net = {
  chainId: n.chainId,
  evmChainId: n.evmChainId,
  rest: process.env.QORE_REST_URL?.trim() || n.endpoints.rest,
  rpc: process.env.QORE_RPC_URL?.trim() || n.endpoints.rpc,
};

const acc = await deriveUnifiedAccount(mnemonic, 0);

/** account_number and sequence over REST; zero for an account never seen. */
async function accountSequence(rest: string, address: string): Promise<{ accountNumber: bigint; sequence: bigint }> {
  const res = await fetch(`${rest}/cosmos/auth/v1beta1/accounts/${address}`);
  if (res.status === 404) {
    throw new Error(`${address} does not exist on chain yet: send it some QOR first`);
  }
  if (!res.ok) throw new Error(`account query failed: HTTP ${res.status}`);
  const body = (await res.json()) as { account?: Record<string, unknown> };
  const a = body.account as { account_number?: string; sequence?: string } | undefined;
  return {
    accountNumber: BigInt(a?.account_number ?? "0"),
    sequence: BigInt(a?.sequence ?? "0"),
  };
}

const { accountNumber, sequence } = await accountSequence(net.rest, acc.cosmos);
const signer = new EthNativeSigner(acc, { signMode: "hybrid", rest: net.rest });
const transport = await StargateClient.connect(net.rpc);
try {
  const res = await signer.bankSend(
    transport,
    acc.cosmos,
    [{ denom: "uqor", amount: "1" }],
    {
      chainId: net.chainId,
      accountNumber,
      sequence,
      fee: { amount: [{ denom: "uqor", amount: "100000" }], gas: "800000" },
      memo: "QoreStamp hybrid attestation",
    },
  );
  if (res.code !== 0) throw new Error(`attestation tx failed with code ${res.code}`);

  const attestation = {
    network: net.chainId,
    evmChainId: net.evmChainId,
    accountCosmos: acc.cosmos,
    accountEvm: acc.evm,
    txHash: res.transactionHash,
    explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
    height: null,
    gasUsed: null,
    memo: "QoreStamp hybrid attestation",
    note: "Native-lane bank send of 1 uqor to self, signed hybrid (secp256k1 + ML-DSA-87).",
  };
  writeFileSync(new URL("../attestation.json", import.meta.url), JSON.stringify(attestation, null, 2) + "\n");
  console.log(`attested: ${res.transactionHash}`);
  console.log(`explorer: ${attestation.explorer}`);
} finally {
  transport.disconnect();
}
