"use client";

import { useEffect, useState } from "react";
import { short } from "@/lib/format";

interface Project {
  id: string;
  name: string;
  payTo: string;
  amount: string;
  network: string;
  keyPrefix: string;
  webhookUrl: string;
  createdAt: string;
}
interface Agent {
  id: string;
  projectId: string;
  label: string;
  address: string;
  dailyLimit: string;
  spentToday?: number;
  remaining?: number | null;
  createdAt: string;
}

export function CloudPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [webhook, setWebhook] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/cp/projects");
      if (r.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      setProjects((await r.json()).projects ?? []);
      const ar = await fetch("/api/cp/agents");
      if (ar.ok) setAgents((await ar.json()).agents ?? []);
      setLoadErr(null);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
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
        body: JSON.stringify({ name, amount, webhookUrl: webhook || undefined }),
      });
      const d = await r.json();
      if (d.apiKey) {
        setNewKey(d.apiKey);
        setName("");
        setWebhook("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function rotate(id: string) {
    if (!window.confirm("Rotate the API key? The old key stops working immediately.")) return;
    const r = await fetch(`/api/cp/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rotateKey: true }),
    });
    const d = await r.json();
    if (d.apiKey) {
      setNewKey(d.apiKey);
      await load();
    }
  }

  async function del(id: string) {
    if (!window.confirm("Delete this project? Removes its key, agents, and recorded payments.")) return;
    await fetch(`/api/cp/projects/${id}`, { method: "DELETE" });
    await load();
  }

  async function edit(p: Project) {
    const amt = window.prompt("Price in USDC", p.amount);
    if (amt === null) return;
    const wh = window.prompt("Webhook URL (blank = none)", p.webhookUrl || "");
    if (wh === null) return;
    await fetch(`/api/cp/projects/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: amt, webhookUrl: wh }),
    });
    await load();
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
  const agentPrompt = newKey
    ? `Integrate AgentPay (x402 / USDC agent payments) into my app.
Endpoint: ${origin}
API key: ${newKey}

1. Install: npm i @agentpay/merchant-sdk
2. Gate my paid route (Express):
   import { paymentGateway } from "@agentpay/merchant-sdk/express";
   app.use("/api/premium", paymentGateway({ apiKey: "${newKey}", baseUrl: "${origin}" }));
3. Confirm an unpaid request returns HTTP 402, then a paid request returns 200.
Docs: ${origin}/docs`
    : "";

  return (
    <section className="card">
      <div className="label">Projects &amp; API keys</div>
      {loadErr && <p className="err">Couldn’t load: {loadErr}</p>}
      <form onSubmit={create} className="cp-form">
        <input className="inp" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="inp" placeholder="Price (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <input className="inp" placeholder="Webhook URL (optional)" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
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
          <div className="keyrow">
            <span className="muted">Hand to a coding agent</span>
            <button type="button" className="btn ghost sm" onClick={() => copy(agentPrompt, "prompt")}>
              {copied === "prompt" ? "Copied ✓" : "Copy agent prompt"}
            </button>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Webhook</th>
              <th>Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name}
                  <div className="muted tiny">{p.keyPrefix}…</div>
                </td>
                <td>{p.amount} USDC</td>
                <td>{p.webhookUrl ? "on" : <span className="muted">—</span>}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => window.open(`/pay/${p.id}`, "_blank", "noopener")}
                  >
                    Preview
                  </button>{" "}
                  <button type="button" className="btn ghost sm" onClick={() => copy(`${origin}/pay/${p.id}`, `link-${p.id}`)}>
                    {copied === `link-${p.id}` ? "✓" : "Copy link"}
                  </button>
                </td>
                <td className="actions">
                  <button type="button" className="btn ghost sm" onClick={() => edit(p)}>Edit</button>
                  <button type="button" className="btn ghost sm" onClick={() => rotate(p.id)}>Rotate</button>
                  <button type="button" className="btn ghost sm" onClick={() => del(p.id)}>Delete</button>
                </td>
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
              <th>Spent today</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.label}</td>
                <td>{short(a.address)}</td>
                <td>{a.dailyLimit ? `${a.dailyLimit} USDC` : "—"}</td>
                <td>{a.spentToday != null ? `${a.spentToday} USDC` : "—"}</td>
                <td>{a.remaining != null ? `${a.remaining} USDC` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
