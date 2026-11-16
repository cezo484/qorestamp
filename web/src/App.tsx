import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  QORECHAIN_REST_ENDPOINTS,
  classifyEvmWindowRejection,
  evmWindowStatus,
  qorechainTestnet,
  type EvmWindowRejection,
} from "@qorechain/evm";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { qoreStampAbi } from "./abi.js";
import { QORESTAMP_DEPLOYED, QORESTAMP_TESTNET_ADDRESS, explorerAddressUrl, explorerTxUrl } from "./config.js";

const REMEDY: Record<EvmWindowRejection, string> = {
  "no-pqc-key":
    "This account has no registered ML-DSA-87 key. Register one on the native lane first (QoreX or the window helper).",
  "no-window": "No EVM authorisation window is open. Open one on the native lane, then retry.",
  exhausted: "The window has run out of blocks, transactions or value. Open a new one.",
  invalid: "The chain refused the window parameters.",
};

/** SHA-256 of bytes, as a 0x-prefixed 32-byte hex string. */
async function sha256Hex(data: BufferSource): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `0x${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const isHash = (s: string): s is `0x${string}` => /^0x[0-9a-fA-F]{64}$/.test(s);

/**
 * The REST API of each chain, through the dev server's proxy (vite.config.ts):
 * the public REST endpoints send no CORS headers. Same chains as
 * QORECHAIN_REST_ENDPOINTS.
 */
const REST_PROXY: Record<number, string | undefined> = Object.fromEntries(
  Object.keys(QORECHAIN_REST_ENDPOINTS).map((id) => [
    Number(id),
    Number(id) === qorechainTestnet.id ? "/lcd-testnet" : "/lcd-mainnet",
  ]),
);

/** The account's EVM authorisation window, read over the native-lane REST API. */
function WindowStatus({ address, chainId }: { address: `0x${string}`; chainId: number }) {
  const rest = REST_PROXY[chainId];
  const { data, error, isLoading } = useQuery({
    queryKey: ["evm-window", chainId, address],
    queryFn: () => evmWindowStatus({ rest: rest!, address }),
    enabled: rest !== undefined,
    refetchInterval: 10_000,
  });
  if (!rest) return <p>Unknown network.</p>;
  if (isLoading) return <p>EVM window: reading...</p>;
  if (error) return <p>EVM window: could not read ({error.message})</p>;
  if (!data?.found) {
    return (
      <p>
        EVM window: none. Stamping is refused until a post-quantum authorisation window is opened for this
        account.
      </p>
    );
  }
  return (
    <p>
      EVM window: {data.live ? "live" : "not usable"} ({data.remainingBlocks.toString()} blocks,{" "}
      {data.remainingTxs.toString()} transactions, {data.remainingValue.toString()} uqor left)
    </p>
  );
}

/** One row of the recent-stamps list: reads hashAt(index) and offers it for verification. */
function HashRow({ index, onSelect }: { index: number; onSelect: (hash: `0x${string}`) => void }) {
  const { data } = useReadContract({
    address: QORESTAMP_TESTNET_ADDRESS,
    abi: qoreStampAbi,
    functionName: "hashAt",
    args: [BigInt(index)],
    chainId: qorechainTestnet.id,
  });
  if (!data) return null;
  return (
    <li>
      <button type="button" onClick={() => onSelect(data as `0x${string}`)}>
        <code>
          #{index} {(data as string).slice(0, 18)}...{(data as string).slice(-8)}
        </code>
      </button>
    </li>
  );
}

export function App() {
  const { address, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: block } = useBlockNumber({ watch: true });
  const { switchChain } = useSwitchChain();
  const onTestnet = chainId === qorechainTestnet.id;

  const [stampText, setStampText] = useState("");
  const [stampLabel, setStampLabel] = useState("");
  const [stampHash, setStampHash] = useState<`0x${string}` | "">("");
  const [stampBusy, setStampBusy] = useState(false);
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const rejection = write.error ? classifyEvmWindowRejection(write.error) : undefined;

  const [verifyInput, setVerifyInput] = useState("");
  const [verifyHash, setVerifyHash] = useState<`0x${string}` | null>(null);
  const verifyRead = useReadContract({
    address: QORESTAMP_TESTNET_ADDRESS,
    abi: qoreStampAbi,
    functionName: "verify",
    args: [verifyHash ?? "0x0000000000000000000000000000000000000000000000000000000000000000"],
    chainId: qorechainTestnet.id,
    query: { enabled: verifyHash !== null && QORESTAMP_DEPLOYED },
  });

  const { data: totalStamps } = useReadContract({
    address: QORESTAMP_TESTNET_ADDRESS,
    abi: qoreStampAbi,
    functionName: "totalStamps",
    chainId: qorechainTestnet.id,
    query: { enabled: QORESTAMP_DEPLOYED, refetchInterval: 10_000 },
  });
  const recentCount = totalStamps === undefined ? 0 : Math.min(5, Number(totalStamps));
  const recentIndexes =
    totalStamps === undefined ? [] : Array.from({ length: recentCount }, (_, i) => Number(totalStamps) - 1 - i);

  const hashStampText = async () => {
    if (!stampText) return;
    setStampBusy(true);
    try {
      setStampHash(await sha256Hex(new TextEncoder().encode(stampText)));
    } finally {
      setStampBusy(false);
    }
  };
  const hashStampFile = async (file: File | undefined) => {
    if (!file) return;
    setStampBusy(true);
    try {
      setStampHash(await sha256Hex(await file.arrayBuffer()));
    } finally {
      setStampBusy(false);
    }
  };
  const resolveVerifyHash = async () => {
    const input = verifyInput.trim();
    if (isHash(input)) {
      setVerifyHash(input);
      return;
    }
    if (input) setVerifyHash(await sha256Hex(new TextEncoder().encode(input)));
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>QoreStamp</h1>
      <p>
        A post-quantum notary on the QoreChain testnet. Stamp the SHA-256 hash of any document on-chain to prove
        it existed at a given time. The document never leaves your machine — only its hash is stored. Every stamp
        is sent through QoreChain&apos;s EVM lane, which only admits transactions covered by a post-quantum
        (ML-DSA-87) authorisation window.
      </p>
      <ConnectButton />
      <p>
        Latest block: {block?.toString() ?? "..."} · Network: QoreChain testnet (EVM chain 9800)
        {QORESTAMP_DEPLOYED ? (
          <>
            {" · "}Contract:{" "}
            <a href={explorerAddressUrl(QORESTAMP_TESTNET_ADDRESS)} target="_blank" rel="noreferrer">
              <code>{QORESTAMP_TESTNET_ADDRESS}</code>
            </a>
          </>
        ) : (
          " · Contract: not deployed yet"
        )}
      </p>

      {isConnected && address && chainId ? (
        <section>
          <p>
            Account <code>{address}</code> on chain {chainId}
          </p>
          {!onTestnet && (
            <p>
              You are not on the QoreChain testnet.{" "}
              <button type="button" onClick={() => switchChain({ chainId: qorechainTestnet.id })}>
                Switch to testnet
              </button>
            </p>
          )}
          <p>Balance: {balance ? `${formatEther(balance.value)} QOR` : "..."}</p>
          <WindowStatus address={address} chainId={chainId} />
        </section>
      ) : (
        <p>Connect a wallet (QoreX first) to stamp and verify.</p>
      )}

      <section>
        <h2>Stamp a document</h2>
        <p>Paste text or pick a file. Its SHA-256 hash is computed in your browser; the file is never uploaded.</p>
        <textarea
          rows={4}
          style={{ width: "100%" }}
          placeholder="Paste the text to stamp..."
          value={stampText}
          onChange={(e) => setStampText(e.target.value)}
        />
        <div style={{ margin: "0.5rem 0" }}>
          <input
            type="file"
            onChange={(e) => {
              void hashStampFile(e.target.files?.[0]);
            }}
          />{" "}
          <button type="button" disabled={!stampText || stampBusy} onClick={() => void hashStampText()}>
            Hash the text
          </button>
        </div>
        {stampHash && (
          <p>
            SHA-256: <code>{stampHash}</code>
          </p>
        )}
        <div style={{ margin: "0.5rem 0" }}>
          <input
            type="text"
            maxLength={64}
            placeholder="Label (optional, max 64 characters)"
            value={stampLabel}
            onChange={(e) => setStampLabel(e.target.value)}
            style={{ width: "60%" }}
          />{" "}
          <button
            type="button"
            disabled={!isConnected || !onTestnet || !stampHash || !QORESTAMP_DEPLOYED || write.isPending}
            onClick={() =>
              write.writeContract({
                address: QORESTAMP_TESTNET_ADDRESS,
                abi: qoreStampAbi,
                functionName: "stamp",
                args: [stampHash as `0x${string}`, stampLabel],
                chainId: qorechainTestnet.id,
              })
            }
          >
            {write.isPending ? "Stamping..." : "Stamp on-chain"}
          </button>
        </div>
        {write.data && (
          <p>
            Sent:{" "}
            <a href={explorerTxUrl(write.data)} target="_blank" rel="noreferrer">
              <code>{write.data}</code>
            </a>{" "}
            {receipt.isLoading && "(waiting for confirmation...)"}
            {receipt.isSuccess && "(confirmed)"}
          </p>
        )}
        {write.error && <p>Refused: {rejection ? REMEDY[rejection] : write.error.message}</p>}
      </section>

      <section>
        <h2>Verify a stamp</h2>
        <p>Paste the document text or a 0x hash. The app hashes text in your browser and reads the stamp.</p>
        <div>
          <input
            type="text"
            placeholder="Document text or 0x hash..."
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            style={{ width: "70%" }}
          />{" "}
          <button type="button" disabled={!verifyInput || !QORESTAMP_DEPLOYED} onClick={() => void resolveVerifyHash()}>
            Verify
          </button>
        </div>
        {verifyHash && verifyRead.data && (
          <p>
            {verifyRead.data[4] ? (
              <>
                Stamped by <code>{verifyRead.data[0]}</code> on{" "}
                {new Date(Number(verifyRead.data[1]) * 1000).toLocaleString()} (block{" "}
                {verifyRead.data[2].toString()}
                {verifyRead.data[3] ? `, label "${verifyRead.data[3]}"` : ""})
              </>
            ) : (
              <>No stamp for this hash.</>
            )}
          </p>
        )}
        {verifyRead.isLoading && <p>Reading...</p>}
      </section>

      <section>
        <h2>Recent stamps</h2>
        {totalStamps === undefined ? (
          <p>{QORESTAMP_DEPLOYED ? "Loading..." : "The contract is not deployed yet."}</p>
        ) : Number(totalStamps) === 0 ? (
          <p>No stamps yet — be the first.</p>
        ) : (
          <>
            <p>Total stamps: {totalStamps.toString()} (click a hash to verify it)</p>
            <ul>
              {recentIndexes.map((i) => (
                <HashRow
                  key={i}
                  index={i}
                  onSelect={(h) => {
                    setVerifyInput(h);
                    setVerifyHash(h);
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <footer>
        <p>
          Built for the QoreChain Developer Fest (Build Before Q-Day), Quantum Pass. Testnet only — QoreStamp runs
          on <code>qorechain-diana</code> (EVM 9800) and test QOR has no value.
        </p>
      </footer>
    </main>
  );
}
