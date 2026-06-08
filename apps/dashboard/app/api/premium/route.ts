import { withPayment } from "@agentpay/merchant-sdk/next";

const PAYTO = (process.env.AGENTPAY_PAYTO ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// A demo "premium" endpoint, gated behind a 0.10 USDC agent payment.
// Unpaid agents get an x402 402 with the payment requirement; paid agents get the data.
export const GET = withPayment(
  async () =>
    Response.json({
      ok: true,
      data: "premium agent-only content unlocked",
      unlockedAt: new Date().toISOString(),
    }),
  {
    payTo: PAYTO,
    amount: 0.1,
    description: "Premium API access (demo)",
  },
);
