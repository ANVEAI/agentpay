# AgentPay

**The easiest way for merchants to accept AI-agent payments.** x402-compatible, USDC, self-hosted. Connect MetaMask, get paid.

AgentPay is not a new payment rail. It rides the open [x402](https://www.x402.org) standard and settles in USDC, and gives merchants the nicest possible way to accept agent payments: a drop-in SDK to require and verify payment, plus a dashboard to watch the money land.

## Quickstart: add AgentPay in 3 steps (~1 min)

For a merchant putting AgentPay on their site:

```bash
# 1. install
npm i @agentpay/merchant-sdk
```
```ts
// 2. gate a route (Express shown; Next.js and any Fetch server also supported)
import { paymentGateway } from "@agentpay/merchant-sdk/express";
app.use("/api/premium", paymentGateway({ payTo: "0xYourWallet", amount: 0.5 }));
```
```text
3. deploy as usual. Paid agents now stream USDC to your wallet.
```

Full per-framework snippets are in [packages/merchant-sdk/README.md](packages/merchant-sdk/README.md).

## Monorepo layout

```
agentpay/
  packages/
    merchant-sdk/   # x402-compatible TypeScript SDK: build a payment requirement, verify it on-chain
  apps/
    dashboard/      # Next.js merchant dashboard: MetaMask + Sign-In-With-Ethereum, payments-received table
```

## Quick start (dev)

```bash
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env.local   # set SESSION_SECRET
pnpm build:sdk          # compile the SDK
pnpm dev                # dashboard on http://localhost:7000
```

Network: **Base Sepolia** testnet, **USDC** (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`). No real funds while you build.

## Self-host with Docker

One command brings up the merchant dashboard on your own infrastructure.

```bash
cp .env.example .env          # set SESSION_SECRET and AGENTPAY_PAYTO
docker compose up --build     # dashboard on http://localhost:3000
```

The image is a multi-stage build: it compiles the SDK, builds the dashboard as a
standalone Next.js server, and ships only that. Config is runtime env
(`SESSION_SECRET`, `AGENTPAY_PAYTO`), so the same image runs anywhere. Point
`NEXT_PUBLIC_RPC_URL` at a private RPC for full payment history. Nothing leaves
your box and no funds are ever custodied: payments settle wallet-to-wallet.

## Add AgentPay to your site

Gating a route behind an agent payment is one line. Pick your framework.

**Express**
```ts
import { paymentGateway } from "@agentpay/merchant-sdk/express";

app.use("/api/premium", paymentGateway({ payTo: "0xYourWallet", amount: 0.5 }));
```

**Next.js route handler**
```ts
import { withPayment } from "@agentpay/merchant-sdk/next";

export const GET = withPayment(
  async () => Response.json({ data: "premium" }),
  { payTo: "0xYourWallet", amount: 0.1 },
);
```

**Any Fetch server (Hono, Bun, Deno)**
```ts
import { createWebGateway } from "@agentpay/merchant-sdk/web";
const gate = createWebGateway({ payTo: "0xYourWallet", amount: 0.1 });
const denied = await gate.guard(request);   // 402 Response, or null if paid
```

That is the whole integration. Unpaid agents get an x402 `402` with the payment
requirement; once they pay in USDC, the request goes through and the money lands
in your wallet, where the dashboard shows it.

**The agent side** is autonomous — give it a funded wallet and it extracts the 402
requirement, pays USDC, and retries by itself:
```ts
import { createPaidFetch } from "@agentpay/merchant-sdk/client";
const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY });
await fetch("https://api.you.com/api/premium"); // any 402 is paid automatically
```
Or as an agent tool (OpenAI / LangChain / CrewAI / OpenClaw):
```ts
import { agentPaymentTool } from "@agentpay/merchant-sdk/client";
const tool = agentPaymentTool({ privateKey: process.env.AGENT_KEY });
// OpenAI tool-calling: tools: [tool.toOpenAITool()] → route calls to tool.invoke(args)
```

**Coding agents can provision AgentPay themselves** — no GUI. Set `AGENTPAY_ADMIN_TOKEN`
and use the CLI (full runbook in [AGENTS.md](AGENTS.md)):
```bash
pnpm agentpay create-project --name "My API" --amount 0.1 --pay-to 0xMerchant   # → apiKey
pnpm agentpay add-agent --project <id> --label research-bot --budget 10          # → wallet
```

See `examples/merchant-express.mjs` and `examples/agent-pay.mjs` for runnable demos.

### Drop-in payment button (like Stripe / Razorpay)

For a human-facing pay or subscribe button, add one line to any page — no framework,
no build, served from your dashboard host:

```html
<script src="https://your-host/agentpay-button.js"></script>
<agentpay-button to="0xYourWallet" amount="5"></agentpay-button>
```

Managed mode and subscriptions:

```html
<agentpay-button api-key="ap_live_…" base-url="https://your-host"></agentpay-button>
<agentpay-button to="0xYourWallet" amount="9" mode="subscription" label="Subscribe"></agentpay-button>
```

It opens the visitor's wallet, sends USDC to your address, and fires an
`agentpay:success` event with the tx hash. Live demo at `/button-demo.html`.

## Watch the money: the dashboard

Run the dashboard (`pnpm dev`), connect the same wallet you set as `payTo`, sign in
with Ethereum, and every payment your gateway accepts shows up in **Payments
received** with your live USDC balance. No extra wiring: the dashboard reads the
chain directly, so any USDC sent to your wallet appears.

## Close the loop (demo)

See the whole flow end to end against a running dashboard:

```bash
TARGET_URL=http://localhost:3000/api/premium pnpm demo
```

With no `AGENT_PRIVATE_KEY` it generates a throwaway wallet and tells you how to fund
it (Base Sepolia USDC from faucet.circle.com + a little ETH for gas). Set
`AGENT_PRIVATE_KEY` to a funded wallet and it pays the 402, prints the tx, and retries
to get the content — `402 → pay → 200`. The payment then shows up in the dashboard.

## Deployment & the endpoint URL

The SDK (managed mode), CLI, and button all hit one control-plane endpoint — set
`AGENTPAY_API_URL` (default: cloud; self-host: your dashboard URL). Two paths, both
detailed in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md):

- **Custom** — run the dashboard, create a project in the UI, wire the SDK in by hand.
- **Agentic** — a coding agent provisions it: `agentpay init` / `agentpay prompt` + [AGENTS.md](AGENTS.md).

## Status

The merchant side is functional: the **gateway SDK** (`createPaymentGateway` plus
`express` / `web` / `next` adapters), the **agent payer** (`payAndFetch`), the core
primitives (`createPaymentRequirement` + `verifyPayment`), and the **dashboard**
(connect, sign in, see USDC received). Roadmap: the full signed x402 `X-PAYMENT`
payload scheme, persistent payment history, multi-chain, and a hosted option.

MIT licensed.
