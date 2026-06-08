"use client";

import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { useEffect, useState } from "react";
import { USDC_ADDRESS, USDC_DECIMALS, EXPLORER } from "@/lib/chains";
import { transferEvent } from "@/lib/usdc";
import { short } from "@/lib/format";

interface Row {
  from: string;
  value: bigint;
  txHash: string;
}

export function Payments() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!address || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Public RPCs (e.g. sepolia.base.org) cap eth_getLogs at a 2000-block
        // range, so scan recent history in safe sub-2000-block chunks. For full
        // history, point at an indexing RPC or record payments server-side.
        const latest = await client.getBlockNumber();
        const CHUNK = 1800n;
        const MAX_CHUNKS = 12; // ~21.6k blocks (~12h on Base) of lookback
        const ranges: { from: bigint; to: bigint }[] = [];
        let cursor = latest;
        for (let i = 0; i < MAX_CHUNKS && cursor > 0n; i++) {
          const from = cursor > CHUNK ? cursor - CHUNK + 1n : 0n;
          ranges.push({ from, to: cursor });
          cursor = from - 1n;
        }
        const results = await Promise.allSettled(
          ranges.map(({ from, to }) =>
            client.getLogs({
              address: USDC_ADDRESS,
              event: transferEvent,
              args: { to: address },
              fromBlock: from,
              toBlock: to,
            }),
          ),
        );
        if (cancelled) return;
        const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
        all.sort((a, b) =>
          a.blockNumber < b.blockNumber ? 1 : a.blockNumber > b.blockNumber ? -1 : 0,
        );
        const mapped = all.map((l) => ({
          from: (l.args.from as string) ?? "",
          value: (l.args.value as bigint) ?? 0n,
          txHash: l.transactionHash ?? "",
        }));
        setRows(mapped);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, client]);

  if (!isConnected) {
    return (
      <section className="card empty">
        <p>Connect your wallet to see the payments you have received.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <div className="label">USDC balance</div>
          <div className="big">
            {balance != null ? formatUnits(balance as bigint, USDC_DECIMALS) : "—"}{" "}
            <span className="unit">USDC</span>
          </div>
        </div>
        <div className="receiving">
          <div className="label">Receiving address</div>
          <code>{address}</code>
        </div>
      </div>

      <div className="label section">Payments received</div>
      {loading && <p className="muted">Loading on-chain…</p>}
      {err && <p className="err">Couldn’t load logs: {err}</p>}
      {!loading && !err && rows.length === 0 && (
        <p className="muted">
          No payments yet. Share your receiving address or an x402 endpoint to get paid.
        </p>
      )}
      {rows.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>From</th>
              <th>Amount</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.txHash}-${i}`}>
                <td>{short(r.from)}</td>
                <td>{formatUnits(r.value, USDC_DECIMALS)} USDC</td>
                <td>
                  <a href={`${EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noreferrer">
                    {short(r.txHash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
