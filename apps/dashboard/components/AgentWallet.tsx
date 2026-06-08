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
}
const STORAGE_KEY = "agentpay_agent";

// The user (agent-owner) dashboard: pre-authorize an AI agent to pay in USDC within a
// budget, fund it from MetaMask, and connect it to OpenClaw. Client-side + non-custodial:
// the agent key is shown once and never leaves the browser; the budget lives in localStorage.
export function AgentWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [agent, setAgent] = useState<SavedAgent | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null); // shown once, never persisted
  const [dailyLimit, setDailyLimit] = useState("10");
  const [fundAmount, setFundAmount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const a = JSON.parse(raw) as SavedAgent;
        setAgent(a);
        setDailyLimit(a.dailyLimit || "10");
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

  function persist(a: SavedAgent) {
    setAgent(a);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {
      // ignore
    }
  }

  function createAgent() {
    const pk = generatePrivateKey();
    const acct = privateKeyToAccount(pk);
    setNewKey(pk);
    persist({ address: acct.address, dailyLimit });
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

  const skill = agent
    ? `# AgentPay — autonomous payments (OpenClaw skill)
# This agent pays x402-gated APIs in USDC, capped at a daily budget.

## Setup
npm i @agentpay/merchant-sdk
export AGENT_KEY=<the agent key shown when you created it>   # funded wallet on Base Sepolia

## Use — any HTTP 402 is paid and retried, within budget
import { createPaidFetch } from "@agentpay/merchant-sdk/client";
const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY, dailyLimitUsdc: ${agent.dailyLimit} });
# hand \`fetch\` to your tools; payments happen autonomously, no human in the loop.

Agent wallet: ${agent.address}
Network: Base Sepolia · USDC. The funded balance is the hard cap; ${agent.dailyLimit} USDC/day is an extra guardrail.`
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
          <div className="card-head" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 8 }}>
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
            Fund the agent with what you allow it to spend (the balance is the hard cap), and
            set a daily limit the agent enforces on every payment.
          </p>
          <div className="cp-form">
            <input
              className="inp"
              placeholder="Daily limit (USDC)"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
            <button type="button" className="btn ghost" onClick={() => persist({ ...agent, dailyLimit })}>
              Save limit
            </button>
          </div>
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
          </div>

          <div className="label section">3 · Connect with OpenClaw</div>
          <p className="muted">
            Paste this skill into OpenClaw and set <code>AGENT_KEY</code> to the key above. Your
            OpenClaw agent then pays for x402 APIs on its own, within the budget.
          </p>
          <div className="keyrow">
            <span className="muted">OpenClaw skill</span>
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
