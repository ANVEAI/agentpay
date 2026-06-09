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
          <a href="/launch-video.html" target="_blank" rel="noreferrer">Demo</a>
          <a href="/docs">Docs</a>
          <a href="/wallet">Agent wallet</a>
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

      <section className="how">
        <ol className="steps">
          <li>
            <span className="n">1</span>
            <div>
              <b>Gate a route</b>
              <p>
                One line: <code>{"paymentGateway({ payTo, amount })"}</code>
              </p>
            </div>
          </li>
          <li>
            <span className="n">2</span>
            <div>
              <b>The agent pays</b>
              <p>It gets an x402 402, pays USDC, and retries — on its own.</p>
            </div>
          </li>
          <li>
            <span className="n">3</span>
            <div>
              <b>You get paid</b>
              <p>USDC lands in your wallet. Non-custodial, settled on-chain.</p>
            </div>
          </li>
        </ol>
      </section>

      <Payments />
      <CloudPanel />

      <footer className="foot">
        Base Sepolia testnet · USDC ·{" "}
        <a href="https://www.x402.org" target="_blank" rel="noreferrer">
          x402
        </a>
        -compatible · open source ·{" "}
        <a href="https://citerlabs.com" target="_blank" rel="noreferrer">
          A Citerlabs project
        </a>
      </footer>
    </main>
  );
}
