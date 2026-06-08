import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock only the RPC client; keep viem's real decode/format helpers.
const receipts = new Map<string, unknown>();
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      getTransactionReceipt: async ({ hash }: { hash: string }) => receipts.get(hash) ?? null,
    }),
  };
});

import { verifyPayment, createPaymentRequirement, baseSepolia } from "../src/index";
import { pad, numberToHex } from "viem";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function transferLog(to: string, value: bigint) {
  return {
    address: baseSepolia.usdcAddress,
    topics: [
      TRANSFER_TOPIC,
      pad("0x0000000000000000000000000000000000000abc"),
      pad(to as `0x${string}`),
    ],
    data: numberToHex(value, { size: 32 }),
  };
}

describe("verifyPayment", () => {
  beforeEach(() => receipts.clear());

  it("accepts a sufficient USDC transfer to payTo", async () => {
    const payTo = "0x000000000000000000000000000000000000dEaD";
    const req = createPaymentRequirement({ payTo, amount: 1, resource: "/x" });
    receipts.set("0xhash", { status: "success", logs: [transferLog(payTo, 1_000_000n)] });
    const r = await verifyPayment(req, { txHash: "0xhash" });
    expect(r.ok).toBe(true);
    expect(r.paid).toBe("1000000");
  });

  it("rejects an underpayment", async () => {
    const payTo = "0x000000000000000000000000000000000000dEaD";
    const req = createPaymentRequirement({ payTo, amount: 1, resource: "/x" });
    receipts.set("0xhash", { status: "success", logs: [transferLog(payTo, 500_000n)] });
    const r = await verifyPayment(req, { txHash: "0xhash" });
    expect(r.ok).toBe(false);
  });

  it("rejects when the transaction is not found", async () => {
    const req = createPaymentRequirement({
      payTo: "0x000000000000000000000000000000000000dEaD",
      amount: 1,
      resource: "/x",
    });
    const r = await verifyPayment(req, { txHash: "0xmissing" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not found/i);
  });
});
