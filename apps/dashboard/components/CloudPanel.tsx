"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { USDC_DECIMALS, EXPLORER } from "@/lib/chains";
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
interface Agent {
  id: string;
  projectId: string;
  label: string;
  address: string;
  dailyLimit: string;
  createdAt: string;
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

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
    const ar = await fetch("/api/cp/agents");
    if (ar.ok) setAgents((await ar.json()).agents ?? []);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  }

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
        <p className="muted">
          Sign in with your wallet to create projects and API keys. Coding agents can provision
          via the CLI/API with an admin token — see <code>AGENTS.md</code>.
        </p>
      </section>
    );
  }

  const snippet = newKey ? `paymentGateway({ apiKey: "${newKey}", baseUrl: "${origin}" })` : "";

  return (
    <section className="card">
      <div className="label">Projects &amp; API keys</div>
      <form onSubmit={create} className="cp-form">
        <input className="inp" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="inp" placeholder="Price (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button className="btn" disabled={busy}>
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>

      {newKey && (
        <div className="keybox">
          <div className="keyrow">
            <span>New API key (shown once)</span>
            <button type="button" className="btn ghost sm" onClick={() => copy(newKey, "key")}>
              {copied === "key" ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <code>{newKey}</code>
          <div className="keyrow">
            <span className="muted">Drop into your server</span>
            <button type="button" className="btn ghost sm" onClick={() => copy(snippet, "snip")}>
              {copied === "snip" ? "Copied ✓" : "Copy snippet"}
            </button>
          </div>
          <div className="codeblock">{snippet}</div>
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

      <div className="label section">Paying agents</div>
      {agents.length === 0 ? (
        <p className="muted">
          No agents registered. Add one with <code>pnpm agentpay add-agent</code> (see AGENTS.md).
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Label</th>
              <th>Address</th>
              <th>Daily limit</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.label}</td>
                <td>{short(a.address)}</td>
                <td>{a.dailyLimit ? `${a.dailyLimit} USDC` : "—"}</td>
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
              <th>When</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.resource}</td>
                <td>{short(e.from)}</td>
                <td>{fmtAmount(e.amount)}</td>
                <td>{new Date(e.at).toLocaleString()}</td>
                <td>
                  <a href={`${EXPLORER}/tx/${e.txHash}`} target="_blank" rel="noreferrer">
                    {short(e.txHash)}
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
