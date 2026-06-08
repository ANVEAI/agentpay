"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/chains";
import { short } from "@/lib/format";

interface Project {
  id: string;
  name: string;
  payTo: string;
  amount: string;
  network: string;
  keyPrefix: string;
  createdAt: string;
}
interface Ev {
  id: string;
  projectId: string;
  txHash: string;
  from: string;
  amount: string;
  resource: string;
  at: string;
}

function fmtAmount(base: string): string {
  try {
    return `${formatUnits(BigInt(base || "0"), USDC_DECIMALS)} USDC`;
  } catch {
    return base;
  }
}

export function CloudPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  async function load() {
    const r = await fetch("/api/cp/projects");
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setProjects((await r.json()).projects ?? []);
    const er = await fetch("/api/cp/events");
    if (er.ok) setEvents((await er.json()).events ?? []);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNewKey(null);
    try {
      const r = await fetch("/api/cp/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, amount }),
      });
      const d = await r.json();
      if (d.apiKey) {
        setNewKey(d.apiKey);
        setName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (authed === false) {
    return (
      <section className="card">
        <div className="label">Cloud control plane</div>
        <p className="muted">Sign in with your wallet to create projects and API keys.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="label">Projects &amp; API keys</div>
      <form onSubmit={create} className="cp-form">
        <input
          className="inp"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="inp"
          placeholder="Price (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button className="btn" disabled={busy}>
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>

      {newKey && (
        <div className="keybox">
          <div>New API key (copy now, shown once):</div>
          <code>{newKey}</code>
          <div className="codeblock">{`paymentGateway({ apiKey: "${newKey}", baseUrl: "${origin}" })`}</div>
        </div>
      )}

      {projects.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>payTo</th>
              <th>Key</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.amount} USDC</td>
                <td>{short(p.payTo)}</td>
                <td>{p.keyPrefix}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="label section">Recorded payments (via gateway)</div>
      {events.length === 0 ? (
        <p className="muted">No gateway payments recorded yet.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Resource</th>
              <th>From</th>
              <th>Amount</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.resource}</td>
                <td>{short(e.from)}</td>
                <td>{fmtAmount(e.amount)}</td>
                <td>{short(e.txHash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
