# AGENTS.md — AgentPay runbook for coding agents

AgentPay lets AI agents pay for things (x402 / USDC) and lets merchants accept those
payments. This file tells a coding/developer agent how to configure AgentPay and
provision paying agents programmatically — no GUI, no browser sign-in.

## 1. Configure (programmatic)

Set two env vars (on the control plane, and wherever the CLI runs):

- `AGENTPAY_ADMIN_TOKEN` — a long random string; the CLI/API authenticate with it.
- `AGENTPAY_API_URL` — the control-plane endpoint, e.g. `http://localhost:3000`
  (alias: `AGENTPAY_BASE_URL`).

Then provision: `pnpm agentpay init` (interactive), `pnpm agentpay prompt` (emit this
runbook as a prompt to hand another agent), the flags below, or the HTTP API. CLI flags
map 1:1 to the API.

### Create a merchant project + API key
```bash
AGENTPAY_ADMIN_TOKEN=… AGENTPAY_BASE_URL=… \
  pnpm agentpay create-project --name "My API" --amount 0.1 --pay-to 0xMerchantWallet
# → { project: {...}, apiKey: "ap_live_…" }
```

### Add (provision) a paying agent
```bash
pnpm agentpay add-agent --project <projectId> --label research-bot --budget 10
# → { agent: {...}, privateKey: "0x…" }   # privateKey shown once — fund this wallet
```
Or just generate a wallet locally: `pnpm agentpay gen-wallet`.

### Equivalent HTTP API
```
POST /api/cp/projects   Authorization: Bearer <ADMIN_TOKEN>   { name, amount, payTo }
POST /api/cp/agents     Authorization: Bearer <ADMIN_TOKEN>   { projectId, label, dailyLimit }
GET  /api/cp/config     Authorization: Bearer <apiKey>        → { payTo, amount, ... }
GET  /api/cp/projects   Authorization: Bearer <ADMIN_TOKEN>
GET  /api/cp/agents?projectId=<id>   Authorization: Bearer <ADMIN_TOKEN>
```

## 2. Integrate (merchant side) — gate a route in one line
```bash
npm i @agentpay/merchant-sdk
```
```ts
import { paymentGateway } from "@agentpay/merchant-sdk/express";
app.use("/api/premium", paymentGateway({
  apiKey: process.env.AGENTPAY_KEY,
  baseUrl: process.env.AGENTPAY_BASE_URL,
}));
```
Next.js: `withPayment(handler, { apiKey })`. Any Fetch server: `createWebGateway({ apiKey }).guard(request)`.

## 3. Pay (agent side) — autonomous
Give an agent a funded wallet key; it extracts the 402 requirement and pays by itself.
```ts
import { createPaidFetch } from "@agentpay/merchant-sdk/client";
const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY });
await fetch("https://api.site.com/api/premium"); // 402 paid + retried automatically
```
As an agent tool (OpenAI / LangChain / CrewAI / OpenClaw):
```ts
import { agentPaymentTool } from "@agentpay/merchant-sdk/client";
const tool = agentPaymentTool({ privateKey: process.env.AGENT_KEY });
// OpenAI tool-calling: tools: [tool.toOpenAITool()] → route calls to tool.invoke(args)
```

Network: Base Sepolia (USDC) today. Non-custodial — funds settle wallet-to-wallet,
AgentPay never holds them.
