import { Account } from "@/components/Account";
import { Payments } from "@/components/Payments";
import { CloudPanel } from "@/components/CloudPanel";

export default function Page() {
  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◢</span> AgentPay <span className="tag">merchant</span>
        </div>
        <div className="nav">
          <a href="/docs">Docs</a>
          <Account />
        </div>
      </header>

      <section className="hero">
        <h1>Accept AI-agent payments in USDC</h1>
        <p>
          x402-compatible. Self-hosted. Your wallet, your keys. Connect MetaMask to start
          receiving payments from autonomous agents.
        </p>
      </section>

      <Payments />
      <CloudPanel />

      <footer className="foot">
        Base Sepolia testnet · USDC ·{" "}
        <a href="https://www.x402.org" target="_blank" rel="noreferrer">
          x402
        </a>
        -compatible · open source
      </footer>
    </main>
  );
}
