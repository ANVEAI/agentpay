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

      <h2>The agent side (autonomous)</h2>
      <p>Give an agent a funded wallet and it pays 402s by itself — extract requirement, pay USDC, retry. Drop-in fetch:</p>
      <div className="codeblock">{`import { createPaidFetch } from "@agentpay/merchant-sdk/client";

const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY });
await fetch("https://api.you.com/api/premium"); // 402 paid automatically`}</div>
      <p>As an agent tool (OpenAI / LangChain / CrewAI / OpenClaw):</p>
      <div className="codeblock">{`import { agentPaymentTool } from "@agentpay/merchant-sdk/client";

const tool = agentPaymentTool({ privateKey: process.env.AGENT_KEY });
tools: [tool.toOpenAITool()];   // then route the call to tool.invoke(args)`}</div>

      <h2>Provision programmatically (coding agents)</h2>
      <p>
        Configure AgentPay with no GUI using an admin token (<code>AGENTPAY_ADMIN_TOKEN</code>).
        Full runbook in <code>AGENTS.md</code>.
      </p>
      <div className="codeblock">{`pnpm agentpay create-project --name "My API" --amount 0.1 --pay-to 0xMerchant
pnpm agentpay add-agent --project <id> --label research-bot --budget 10`}</div>

      <h2>Drop-in payment button (like Stripe)</h2>
      <p>Add a USDC pay or subscribe button to any page in one line — no framework needed.</p>
      <div className="codeblock">{`<script src="https://your-host/agentpay-button.js"></script>
<agentpay-button to="0xYourWallet" amount="5"></agentpay-button>`}</div>
      <p>Managed (API key), or a subscription button:</p>
      <div className="codeblock">{`<agentpay-button api-key="ap_live_…" base-url="https://your-host"></agentpay-button>
<agentpay-button to="0xYourWallet" amount="9" mode="subscription" label="Subscribe"></agentpay-button>`}</div>
      <p>
        It fires an <code>agentpay:success</code> event with the tx hash.{" "}
        <a href="/button-demo.html" target="_blank" rel="noreferrer">
          See a live demo →
        </a>
      </p>

      <footer className="foot">Base Sepolia · USDC · x402-compatible · open source</footer>
    </main>
  );
}
