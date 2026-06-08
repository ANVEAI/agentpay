"use client";

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { useEffect, useState } from "react";
import { USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chains";
import { short } from "@/lib/format";

interface IntentRow {
  label: string;
  host: string;
  max: string;
}
interface SavedAgent {
  address: string;
  dailyLimit: string;
  vendors?: string;
  blocked?: string;
  models?: string;
  intentRules?: IntentRow[];
}
const STORAGE_KEY = "agentpay_agent";

function toList(s?: string): string[] {
  return (s ?? "")
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// The user (agent-owner) dashboard: pre-authorize an agent to pay in USDC within a budget AND
// a spend policy (vendor allow-list, blocked sites, intent caps, model allow-list), fund it from
// MetaMask, and connect it to OpenClaw. Client-side + non-custodial.
export function AgentWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [agent, setAgent] = useState<SavedAgent | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null); // shown once, never persisted
  const [dailyLimit, setDailyLimit] = useState("10");
  const [fundAmount, setFundAmount] = useState("5");
  const [vendors, setVendors] = useState("");
  const [blocked, setBlocked] = useState("");
  const [models, setModels] = useState("");
  const [intentRules, setIntentRules] = useState<IntentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const a = JSON.parse(raw) as SavedAgent;
        setAgent(a);
        setDailyLimit(a.dailyLimit || "10");
        setVendors(a.vendors || "");
        setBlocked(a.blocked || "");
        setModels(a.models || "");
        setIntentRules(a.intentRules || []);
      }
    } catch {
      // ignore unreadable storage
    }
  }, []);

  const { data: agentBal, refetch: refetchBal } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: agent ? [agent.address as `0x${string}`] : undefined,
    query: { enabled: !!agent },
  });

  function write(a: SavedAgent) {
    setAgent(a);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {
      // ignore
    }
  }
  function snapshot(addr: string): SavedAgent {
    return { address: addr, dailyLimit, vendors, blocked, models, intentRules };
  }
  function save() {
    if (!agent) return;
    write(snapshot(agent.address));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }
  function createAgent() {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    setNewKey(pk);
    write(snapshot(acct.address));
  }
  function reset() {
    if (!window.confirm("Forget this agent in this browser? Make sure you saved its key.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAgent(null);
    setNewKey(null);
  }
  function addRule() {
    setIntentRules((r) => [...r, { label: "", host: "", max: "" }]);
  }
  function updateRule(i: number, field: keyof IntentRow, value: string) {
    setIntentRules((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  }
  function removeRule(i: number) {
    setIntentRules((r) => r.filter((_, j) => j !== i));
  }
  async function connect() {
    const connector = connectors[0];
    if (!connector) return;
    setError(null);
    try {
      await connectAsync({ connector });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function fund() {
    if (!agent) return;
    setBusy(true);
    setError(null);
    try {
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [agent.address as `0x${string}`, parseUnits(fundAmount || "0", USDC_DECIMALS)],
      });
      setTimeout(() => refetchBal(), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  }
  function downloadSkill() {
    const blob = new Blob([skill], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <section className="card empty">
        <p>Connect your wallet to set up an agent and fund it.</p>
        <button className="btn" disabled={isPending || !connector} onClick={connect}>
          {isPending ? "Connecting…" : "Connect MetaMask"}
        </button>
      </section>
    );
  }

  const policy = {
    allowedVendors: toList(vendors),
    blockedHosts: toList(blocked),
    allowedModels: toList(models),
    intents: intentRules
      .map((r) => ({ label: r.label.trim(), host: r.host.trim(), maxUsdc: Number(r.max) }))
      .filter((r) => r.label && r.host && Number.isFinite(r.maxUsdc)),
  };

  const skill = agent
    ? `---
name: agentpay-payments
description: Pay x402-gated APIs in USDC autonomously, within a budget and spend policy.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - AGENT_KEY
      bins:
        - node
    primaryEnv: AGENT_KEY
---
# AgentPay — autonomous payments

This agent pays x402-gated APIs in USDC, within a daily budget AND a spend policy
(allowed vendors, blocked sites, intent caps, model allow-list).

## Setup
    npm i @agentpay/merchant-sdk
    export AGENT_KEY=<the agent key shown when you created it>   # funded wallet on Base Sepolia

## Use
    import { createPaidFetch } from "@agentpay/merchant-sdk/client";
    const policy = ${JSON.stringify(policy)};
    const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY, dailyLimitUsdc: ${dailyLimit || "10"}, policy });
    // hand fetch to your tools: blocked sites, off-list vendors, and over-cap payments are refused.

Agent wallet: ${agent.address}
Network: Base Sepolia · USDC. Funded balance is the hard cap; policy + daily limit are guardrails.`
    : "";

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <div className="label">Your wallet</div>
          <div className="big" style={{ fontSize: 16 }}>
            {short(address)}
          </div>
        </div>
        <button className="btn ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>

      {!agent ? (
        <>
          <div className="label section">1 · Create an agent wallet</div>
          <p className="muted">
            A fresh wallet your agent controls. You fund it; it can never spend more than it
            holds. The private key is shown once — save it.
          </p>
          <button className="btn" onClick={createAgent}>
            Create agent wallet
          </button>
        </>
      ) : (
        <>
          <div className="label section">Agent wallet</div>
          <div
            className="card-head"
            style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 8 }}
          >
            <code className="receiving">{agent.address}</code>
            <div>
              <div className="label">Spendable (funded)</div>
              <div className="big">
                {agentBal != null ? formatUnits(agentBal as bigint, USDC_DECIMALS) : "0"}{" "}
                <span className="unit">USDC</span>
              </div>
            </div>
          </div>
        </>
      )}

      {newKey && (
        <div className="keybox">
          <div className="keyrow">
            <span>Agent private key — shown once, save it as AGENT_KEY</span>
            <button type="button" className="btn ghost sm" onClick={() => copy(newKey, "key")}>
              {copied === "key" ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <code>{newKey}</code>
        </div>
      )}

      {agent && (
        <>
          <div className="label section">2 · Pre-authorize a budget</div>
          <p className="muted">
            Fund the agent with what you allow it to spend (the balance is the hard cap), and set
            a daily limit the agent enforces on every payment.
          </p>
          <div className="cp-form">
            <input
              className="inp"
              placeholder="Amount to fund (USDC)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
            />
            <button type="button" className="btn" disabled={busy} onClick={fund}>
              {busy ? "Confirm in wallet…" : "Fund agent"}
            </button>
            <input
              className="inp"
              placeholder="Daily limit (USDC)"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
          </div>

          <div className="label section">3 · Spend policy</div>
          <p className="muted">
            Pre-approve intent-based spend and exact vendors, authorize models, and blacklist
            sites. The agent enforces this before every payment.
          </p>
          <div className="field">
            <label>Allowed vendors — hostnames or 0x addresses (comma-separated, blank = any)</label>
            <textarea
              className="inp"
              rows={2}
              placeholder="api.openai.com, 0xMerchantWallet"
              value={vendors}
              onChange={(e) => setVendors(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Blacklisted sites — never pay these hosts</label>
            <textarea
              className="inp"
              rows={2}
              placeholder="sketchy.example, untrusted.io"
              value={blocked}
              onChange={(e) => setBlocked(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Authorized models — ids the agent may use (blank = any)</label>
            <textarea
              className="inp"
              rows={2}
              placeholder="claude-opus-4-8, gpt-5.4"
              value={models}
              onChange={(e) => setModels(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Intent rules — pre-approve spend by purpose, with a per-payment cap</label>
            {intentRules.map((r, i) => (
              <div className="rule-row" key={i}>
                <input
                  className="inp"
                  placeholder="intent (data)"
                  value={r.label}
                  onChange={(e) => updateRule(i, "label", e.target.value)}
                />
                <input
                  className="inp"
                  placeholder="host (api.vendor.com)"
                  value={r.host}
                  onChange={(e) => updateRule(i, "host", e.target.value)}
                />
                <input
                  className="inp"
                  placeholder="max USDC"
                  value={r.max}
                  onChange={(e) => updateRule(i, "max", e.target.value)}
                />
                <button type="button" className="btn ghost sm" onClick={() => removeRule(i)}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" onClick={addRule}>
              + Add rule
            </button>
          </div>
          <button type="button" className="btn ghost" onClick={save}>
            {savedMsg ? "Saved ✓" : "Save policy"}
          </button>

          <div className="label section">4 · Connect with OpenClaw</div>
          <p className="muted">
            Save this as <code>skills/agentpay-payments/SKILL.md</code> in your OpenClaw
            workspace, set <code>AGENT_KEY</code> to the key above, then run{" "}
            <code>/skill agentpay-payments</code>.
          </p>
          <div className="keyrow">
            <span className="muted">OpenClaw skill (SKILL.md, includes your policy)</span>
            <span>
              <button type="button" className="btn ghost sm" onClick={() => copy(skill, "skill")}>
                {copied === "skill" ? "Copied ✓" : "Copy"}
              </button>{" "}
              <button type="button" className="btn ghost sm" onClick={downloadSkill}>
                Download SKILL.md
              </button>
            </span>
          </div>
          <div className="codeblock">{skill}</div>

          <button type="button" className="btn ghost sm" onClick={reset}>
            Forget this agent
          </button>
        </>
      )}

      {error && <p className="err">{error}</p>}
    </section>
  );
}
