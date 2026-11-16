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
 * Signing goes through EthNativeSigner (the unified-account signer, same as
 * window.ts): the generic directSignerFromPrivateKey derives the standard
 * Cosmos ripemd160 address, which is a DIFFERENT qor1 address than the
 * unified eth-native account and does not exist on chain.
 *
 * Usage: BBQD_LINK_CODE=<code from build.qorechain.io> npx tsx --env-file=.env scripts/proof.ts
 */
import { writeFileSync } from "node:fs";
import { StargateClient } from "@cosmjs/stargate";
import {
  EthNativeSigner,
  deriveUnifiedAccount,
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

const memo = `bbqd-link:${code}`;
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
      memo,
    },
  );
  if (res.code !== 0) throw new Error(`proof tx failed with code ${res.code}`);

  const proof = {
    network: net.chainId,
    evmChainId: net.evmChainId,
    accountCosmos: acc.cosmos,
    accountEvm: acc.evm,
    txHash: res.transactionHash,
    explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
    height: null,
    gasUsed: null,
    memo,
    note: "Registration proof for the Developer Fest platform: 1 uqor to self with the bbqd-link memo.",
  };
  writeFileSync(new URL("../proof.json", import.meta.url), JSON.stringify(proof, null, 2) + "\n");
  console.log(`proof sent: ${res.transactionHash}`);
  console.log(`explorer: ${proof.explorer}`);
} finally {
  transport.disconnect();
}
