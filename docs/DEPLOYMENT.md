# Deploying AgentPay

Two ways to run AgentPay. Both are non-custodial (USDC settles wallet-to-wallet) and
both talk to a **control-plane endpoint** you configure.

## The endpoint URL

Everything that integrates AgentPay (the SDK in managed mode, the payment button, the
CLI) hits one control-plane endpoint. Configure it once:

| Where | How to set the endpoint |
|---|---|
| SDK (managed) | `paymentGateway({ apiKey, baseUrl })` or env `AGENTPAY_API_URL` |
| CLI | env `AGENTPAY_API_URL` (alias `AGENTPAY_BASE_URL`) |
| Button | `<agentpay-button base-url="…">` or `window.AGENTPAY_API_URL` |

Default is the hosted cloud (`https://api.agentpay.app`). For self-host, set it to your
dashboard URL (e.g. `http://localhost:3000` or `https://pay.yoursite.com`). With pure
inline config (`paymentGateway({ payTo, amount })`) you don't need an endpoint at all.

---

## A. Custom deployment (you set it up)

For a developer wiring AgentPay in by hand.

1. **Run the control plane (dashboard)** on your own infra:
   ```bash
   cp .env.example .env     # set SESSION_SECRET, AGENTPAY_PAYTO, AGENTPAY_ADMIN_TOKEN
   docker compose up --build # http://localhost:3000
   ```
2. **Create a project + API key**: open the dashboard, connect your wallet, Sign-In-With-Ethereum, and create a project under *Projects & API keys*. Copy the key.
3. **Integrate the gateway** in your API and point it at your endpoint:
   ```ts
   import { paymentGateway } from "@agentpay/merchant-sdk/express";
   app.use("/api/premium", paymentGateway({
     apiKey: process.env.AGENTPAY_KEY,
     baseUrl: process.env.AGENTPAY_API_URL, // your dashboard URL
   }));
   ```
   (Or skip the control plane entirely with inline `{ payTo, amount }`.)
4. **Watch payments** in the dashboard. Done.

---

## B. Agentic deployment (an agent sets it up)

For a coding/AI agent (Claude Code, Cursor, OpenClaw) provisioning AgentPay autonomously.

1. **Point it at the endpoint + give it the admin token:**
   ```bash
   export AGENTPAY_API_URL=https://pay.yoursite.com
   export AGENTPAY_ADMIN_TOKEN=…              # set on the control plane too
   ```
2. **Provision** — pick one:
   - Interactive: `pnpm agentpay init`
   - Hand a prompt to your agent: `pnpm agentpay prompt`
   - Flags / HTTP API (see [AGENTS.md](../AGENTS.md)):
     ```bash
     pnpm agentpay create-project --name "My API" --amount 0.1 --pay-to 0xMerchant
     pnpm agentpay add-agent --project <id> --label research-bot --budget 10
     ```
3. **The agent integrates and pays autonomously:**
   ```ts
   import { createPaidFetch } from "@agentpay/merchant-sdk/client";
   const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY });
   await fetch("https://api.site.com/api/premium"); // 402 paid automatically
   ```

The full machine-readable runbook for agents is [AGENTS.md](../AGENTS.md).

---

## C. Deploy the dashboard to the cloud

The dashboard is a standard Next.js 15 app in `apps/dashboard` — deploy it anywhere that runs Next.

**Vercel (easiest):**
1. Import the repo. Set **Root Directory** = `apps/dashboard`, framework **Next.js** (pnpm is auto-detected).
2. Add the env vars below.
3. Deploy, then point your domain (e.g. `agentpay.citerlabs.com`) at it.

**Cloudflare:** use the committed `Dockerfile` (standalone Next server) on Workers/Containers, or
`@cloudflare/next-on-pages` for Pages. Same env vars.

**Required env vars (set on the host):**

| Var | What |
|---|---|
| `SESSION_SECRET` | ≥32-char random — encrypts the SIWE session (production refuses to boot without it) |
| `AGENTPAY_PAYTO` | your merchant wallet (the demo `/api/premium` route's payee) |
| `AGENTPAY_ADMIN_TOKEN` | admin token for CLI/agent provisioning (keep secret) |
| `NEXT_PUBLIC_SITE_URL` | your canonical URL, e.g. `https://agentpay.citerlabs.com` (og:image + link previews) |
| `NEXT_PUBLIC_RPC_URL` | optional — a private Base Sepolia RPC for full payment history |

After deploy, verify: the landing, `/docs`, `/wallet`, `/pay/<id>`, and `/launch-video.html` load;
`/api/premium` returns a `402`; and pasting the URL into a chat/social preview shows the og:image.

---

Network: Base Sepolia (USDC) today; mainnet on the roadmap. A Citerlabs project.
