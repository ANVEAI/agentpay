"use client";

import { useState } from "react";
import { short } from "@/lib/format";

interface Req {
  payTo?: string;
  amountFormatted?: string;
  assetSymbol?: string;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Step: React.FC<{ on: boolean; kind: string; label: string }> = ({ on, kind, label }) => (
  <div className={`demo-step ${kind} ${on ? "on" : ""}`}>{label}</div>
);
const Arrow: React.FC<{ on: boolean }> = ({ on }) => <div className={`demo-arrow ${on ? "on" : ""}`}>→</div>;

// A real request hits this gateway's /api/premium and returns a genuine x402 402. The pay +
// 200 are then walked through for the demo (a real payment needs a funded wallet).
export function LiveDemo() {
  const [phase, setPhase] = useState(0); // 0 idle · 1 got 402 · 2 paying · 3 done
  const [req, setReq] = useState<Req | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setPhase(0);
    setReq(null);
    try {
      const res = await fetch("/api/premium");
      const body = await res.json().catch(() => null);
      setReq(body?.accepts?.[0] ?? null);
      setPhase(1);
      await sleep(1200);
      setPhase(2);
      await sleep(1500);
      setPhase(3);
    } catch {
      // gateway unreachable — leave at idle
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 16 }}>
        <div>
          <div className="label">Live demo</div>
          <p className="muted" style={{ marginTop: 4 }}>Watch a real request hit the gateway and get paid.</p>
        </div>
        <button className="btn" disabled={busy} onClick={run}>
          {busy ? "Running…" : phase >= 3 ? "Run again ↻" : "Run the flow ▸"}
        </button>
      </div>

      <div className="demo-flow">
        <Step on={phase >= 1} kind="req" label="GET /api/premium" />
        <Arrow on={phase >= 1} />
        <Step
          on={phase >= 1}
          kind="err"
          label={req ? `402 · ${req.amountFormatted} ${req.assetSymbol}` : "402 Payment Required"}
        />
        <Arrow on={phase >= 2} />
        <Step on={phase >= 2} kind="pay" label="agent pays USDC ◎" />
        <Arrow on={phase >= 3} />
        <Step on={phase >= 3} kind="ok" label="200 OK ✓" />
      </div>

      {phase >= 3 && <div className="demo-out">{'{ "data": "premium content" }'}</div>}
      {req?.payTo && (
        <div className="muted tiny" style={{ marginTop: 10 }}>
          Real 402 from this gateway → pays to {short(req.payTo)} · the payment + 200 are simulated here
          (a live payment needs a funded wallet).
        </div>
      )}
    </section>
  );
}
