import { AgentWallet } from "@/components/AgentWallet";

export const metadata = {
  title: "AgentPay — Agent wallet",
  description:
    "Pre-authorize an AI agent to pay in USDC within a budget, and connect it to OpenClaw.",
};

export default function WalletPage() {
  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◢</span> AgentPay <span className="tag">agent</span>
        </div>
        <div className="nav">
          <a href="/docs">Docs</a>
          <a href="/">Merchant</a>
        </div>
      </header>

      <section className="hero">
        <h1>Let your agent pay — within your budget</h1>
        <p>
          Connect MetaMask, fund an agent wallet, set a spending limit, and plug it into
          OpenClaw. Your agent pays for x402 APIs in USDC on its own — never more than you allow.
        </p>
      </section>

      <section className="how">
        <ol className="steps">
          <li>
            <span className="n">1</span>
            <div>
              <b>Create + fund</b>
              <p>A fresh agent wallet. It can never spend more than you fund it.</p>
            </div>
          </li>
          <li>
            <span className="n">2</span>
            <div>
              <b>Set a budget</b>
              <p>A daily USDC limit the agent enforces on every payment.</p>
            </div>
          </li>
          <li>
            <span className="n">3</span>
            <div>
              <b>Connect OpenClaw</b>
              <p>Paste the skill; your agent pays x402 APIs autonomously.</p>
            </div>
          </li>
        </ol>
      </section>

      <AgentWallet />

      <footer className="foot">
        Base Sepolia testnet · USDC · non-custodial · open source ·{" "}
        <a href="https://citerlabs.com" target="_blank" rel="noreferrer">
          A Citerlabs project
        </a>
      </footer>
    </main>
  );
}
