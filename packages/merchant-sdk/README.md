# @agentpay/merchant-sdk

**Accept AI-agent payments in USDC. Gate any route in one line.** [x402](https://www.x402.org)-compatible, settles wallet-to-wallet, non-custodial — the SDK never holds your funds.

## Quickstart — 3 steps, ~1 minute

**1. Install**
```bash
npm i @agentpay/merchant-sdk
```

**2. Gate a route** (one line — point it at your wallet)
```ts
import { paymentGateway } from "@agentpay/merchant-sdk/express";

app.use("/api/premium", paymentGateway({ payTo: "0xYourWallet", amount: 0.5 }));
```

**3. Ship.** Unpaid agents get an HTTP `402`, pay 0.5 USDC, and retry automatically. The money lands in your wallet. Done.

## Other frameworks

**Next.js** route handler:
```ts
import { withPayment } from "@agentpay/merchant-sdk/next";

export const GET = withPayment(
  async () => Response.json({ data: "premium" }),
  { payTo: "0xYourWallet", amount: 0.1 },
);
```

**Any Fetch server** (Hono, Bun, Deno):
```ts
import { createWebGateway } from "@agentpay/merchant-sdk/web";

const gate = createWebGateway({ payTo: "0xYourWallet", amount: 0.1 });
const denied = await gate.guard(request); // a 402 Response, or null if paid
```

## Cloud / managed config

Instead of inline config, use an API key from the AgentPay control plane (hosted or
your self-hosted instance). The SDK fetches your payTo/price and reports payments to
your dashboard:
```ts
paymentGateway({ apiKey: "ap_live_…" });               // hosted
paymentGateway({ apiKey: "ap_live_…", baseUrl: "https://pay.you.com" }); // self-hosted
```

## The agent side

Agents pay automatically on `402`:
```ts
import { payAndFetch } from "@agentpay/merchant-sdk/client";

const res = await payAndFetch("https://api.you.com/api/premium", { privateKey });
```

## Core primitives

```ts
import { createPaymentRequirement, verifyPayment } from "@agentpay/merchant-sdk";

const req = createPaymentRequirement({ payTo, amount: 5, resource: "/scrape" });
const result = await verifyPayment(req, { txHash }); // { ok, paid, from }
```

## Watch your money

Run the [AgentPay dashboard](https://github.com/ANVEAI/agentpay) to see every payment
land with your live USDC balance. Self-host with `docker compose up`, or use the
hosted version.

Network: Base Sepolia (USDC) today; mainnet on the roadmap.

## License

MIT
