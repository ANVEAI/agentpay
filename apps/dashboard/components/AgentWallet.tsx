"use client";

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { useEffect, useState } from "react";
import { USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chains";
import { short } from "@/lib/format";

interface SavedAgent {
  address: string;
  dailyLimit: string;
  vendors?: string;
  blocked?: string;
  models?: string;
  intents?: string;
}
const STORAGE_KEY = "agentpay_agent";

function toList(s?: string): string[] {
  return (s ?? "")
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function toIntents(s?: string) {
  return (s ?? "")
    .split("\n")
    .map((line) => {
      const [label, host, max] = line.split(",").map((x) => x.trim());
      const maxUsdc = Number(max);
      return label && host && Number.isFinite(maxUsdc) ? { label, host, maxUsdc } : null;
    })
    .filter(Boolean);
}

// The user (agent-owner) dashboard: pre-authorize an agent to pay in USDC within a budget
// AND a spend policy (vendor allow-list, blocked sites, intent caps, model allow-list), fund
// it from MetaMask, and connect it to OpenClaw. Client-side + non-custodial.
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
  const [intents, setIntents] = useState("");
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
        setIntents(a.intents || "");
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

  function persistAll() {
    if (!agent) return;
    const a: SavedAgent = { ...agent, dailyLimit, vendors, blocked, models, intents };
    setAgent(a);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {
      // ignore
    }
  }
  function save() {
    persistAll();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }
  function createAgent() {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    setNewKey(pk);
    const a: SavedAgent = { address: acct.address, dailyLimit, vendors, blocked, models, intents };
    setAgent(a);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {
      // ignore
    }
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
    intents: toIntents(intents),
  };

  const skill = agent
    ? `# AgentPay — autonomous payments (OpenClaw skill)
# This agent pays x402-gated APIs in USDC, within a budget AND a spend policy.

## Setup
npm i @agentpay/merchant-sdk
export AGENT_KEY=<the agent key shown when you created it>   # funded wallet on Base Sepolia

## Use — a 402 is paid + retried only if it passes the policy
import { createPaidFetch } from "@agentpay/merchant-sdk/client";
const policy = ${JSON.stringify(policy)};
const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY, dailyLimitUsdc: ${dailyLimit || "10"}, policy });
# hand \`fetch\` to your tools: blocked sites, off-list vendors, and over-cap payments are refused automatically.

Agent wallet: ${agent.address}
Network: Base Sepolia · USDC. Funded balance is the hard cap; the policy + daily limit are extra guardrails.`
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
            <label>Authorized models — model ids the agent may use (blank = any)</label>
            <textarea
              className="inp"
              rows={2}
              placeholder="claude-opus-4-8, gpt-5.4"
              value={models}
              onChange={(e) => setModels(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Intent rules — one per line: label, host, max USDC</label>
            <textarea
              className="inp"
              rows={3}
              placeholder={"data, api.vendor.com, 2\ncompute, gpu.host.com, 5"}
              value={intents}
              onChange={(e) => setIntents(e.target.value)}
            />
          </div>
          <button type="button" className="btn ghost" onClick={save}>
            {savedMsg ? "Saved ✓" : "Save policy"}
          </button>

          <div className="label section">4 · Connect with OpenClaw</div>
          <p className="muted">
            Paste this skill into OpenClaw and set <code>AGENT_KEY</code> to the key above. Your
            OpenClaw agent then pays for x402 APIs on its own, within budget and policy.
          </p>
          <div className="keyrow">
            <span className="muted">OpenClaw skill (includes your policy)</span>
            <button type="button" className="btn ghost sm" onClick={() => copy(skill, "skill")}>
              {copied === "skill" ? "Copied ✓" : "Copy skill"}
            </button>
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
