import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock only the RPC client; keep viem's real decode/format helpers.
const receipts = new Map<string, unknown>();
let blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      getTransactionReceipt: async ({ hash }: { hash: string }) => receipts.get(hash) ?? null,
      getBlock: async () => ({ timestamp: blockTimestamp }),
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

const PAY_TO = "0x000000000000000000000000000000000000dEaD";

function receipt(value: bigint) {
  return { status: "success", blockNumber: 1n, logs: [transferLog(PAY_TO, value)] };
}

describe("verifyPayment", () => {
  beforeEach(() => {
    receipts.clear();
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000)); // fresh by default
  });

  it("accepts a sufficient, recent USDC transfer to payTo", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set("0xhash", receipt(1_000_000n));
    const r = await verifyPayment(req, { txHash: "0xhash" });
    expect(r.ok).toBe(true);
    expect(r.paid).toBe("1000000");
  });

  it("rejects an underpayment", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set("0xhash", receipt(500_000n));
    const r = await verifyPayment(req, { txHash: "0xhash" });
    expect(r.ok).toBe(false);
  });

  it("rejects a stale payment (replay of an old transfer)", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set("0xhash", receipt(1_000_000n));
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000) - 100_000); // way older than maxAge
    const r = await verifyPayment(req, { txHash: "0xhash" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/stale/i);
  });

  it("rejects when the transaction is not found", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    const r = await verifyPayment(req, { txHash: "0xmissing" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not found/i);
  });
});
