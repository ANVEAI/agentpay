export const metadata = {
  title: "AgentPay — Integration docs",
};

export default function DocsPage() {
  return (
    <main className="container docs">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◢</span> AgentPay <span className="tag">docs</span>
        </div>
        <nav className="nav">
          <a href="/">Dashboard</a>
        </nav>
      </header>

      <section className="hero">
        <h1>Add AgentPay in 3 steps</h1>
        <p>Gate any route behind an agent payment. About a minute. x402-compatible, USDC, non-custodial.</p>
      </section>

      <h2>
        <span className="step">1.</span>Install
      </h2>
      <div className="codeblock">npm i @agentpay/merchant-sdk</div>

      <h2>
        <span className="step">2.</span>Gate a route
      </h2>
      <p>Express</p>
      <div className="codeblock">{`import { paymentGateway } from "@agentpay/merchant-sdk/express";

app.use("/api/premium", paymentGateway({ payTo: "0xYourWallet", amount: 0.5 }));`}</div>
      <p>Next.js route handler</p>
      <div className="codeblock">{`import { withPayment } from "@agentpay/merchant-sdk/next";

export const GET = withPayment(
  async () => Response.json({ data: "premium" }),
  { payTo: "0xYourWallet", amount: 0.1 },
);`}</div>
      <p>Any Fetch server (Hono, Bun, Deno)</p>
      <div className="codeblock">{`import { createWebGateway } from "@agentpay/merchant-sdk/web";

const gate = createWebGateway({ payTo: "0xYourWallet", amount: 0.1 });
const denied = await gate.guard(request); // 402 Response, or null if paid`}</div>

      <h2>
        <span className="step">3.</span>Ship
      </h2>
      <p>
        Unpaid agents get an HTTP 402, pay USDC, and retry automatically. The money lands in your
        wallet and appears on the <a href="/">dashboard</a>.
      </p>

      <h2>Managed mode (API key)</h2>
      <p>
        Use a project API key instead of inline config. The SDK fetches your payTo and price, and
        reports each payment to this dashboard. Create a key under Projects &amp; API keys.
      </p>
      <div className="codeblock">{`paymentGateway({ apiKey: "ap_live_…" });                          // hosted
paymentGateway({ apiKey: "ap_live_…", baseUrl: "https://your-host" }); // self-hosted`}</div>

      <h2>The agent side</h2>
      <p>Agents pay automatically on 402:</p>
      <div className="codeblock">{`import { payAndFetch } from "@agentpay/merchant-sdk/client";

const res = await payAndFetch("https://api.you.com/api/premium", { privateKey });`}</div>

      <footer className="foot">Base Sepolia · USDC · x402-compatible · open source</footer>
    </main>
  );
}
