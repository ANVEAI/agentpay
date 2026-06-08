import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock only the RPC client; keep viem's real decode/format/verifyMessage helpers.
const receipts = new Map<string, unknown>();
let blockTimestamp = BigInt(Math.floor(Date.now() / 1000));
let latestBlock = 1n;

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      getTransactionReceipt: async ({ hash }: { hash: string }) => receipts.get(hash) ?? null,
      getBlock: async () => ({ timestamp: blockTimestamp }),
      getBlockNumber: async () => latestBlock,
    }),
  };
});

import { verifyPayment, createPaymentRequirement, paymentMessage, baseSepolia } from "../src/index";
import { pad, numberToHex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TX = ("0x" + "a".repeat(64)) as `0x${string}`;
const TX_MISSING = ("0x" + "b".repeat(64)) as `0x${string}`;
const PAY_TO = "0x000000000000000000000000000000000000dEaD";
const PAYER = "0x0000000000000000000000000000000000000abc";
const account = privateKeyToAccount(generatePrivateKey());

function transferLog(from: string, to: string, value: bigint) {
  return {
    address: baseSepolia.usdcAddress,
    topics: [TRANSFER_TOPIC, pad(from as `0x${string}`), pad(to as `0x${string}`)],
    data: numberToHex(value, { size: 32 }),
  };
}
function receipt(value: bigint, from = PAYER) {
  return { status: "success", blockNumber: 1n, logs: [transferLog(from, PAY_TO, value)] };
}

describe("verifyPayment", () => {
  beforeEach(() => {
    receipts.clear();
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000));
    latestBlock = 1n;
  });

  it("accepts a sufficient, recent, confirmed transfer (unsigned)", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n));
    const r = await verifyPayment(req, { txHash: TX });
    expect(r.ok).toBe(true);
    expect(r.paid).toBe("1000000");
  });

  it("rejects an underpayment", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(500_000n));
    expect((await verifyPayment(req, { txHash: TX })).ok).toBe(false);
  });

  it("rejects a stale payment", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n));
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000) - 100_000);
    const r = await verifyPayment(req, { txHash: TX });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/stale/i);
  });

  it("rejects without enough confirmations", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n));
    const r = await verifyPayment(req, { txHash: TX }, baseSepolia, { minConfirmations: 3 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/confirmation/i);
  });

  it("rejects a malformed tx hash", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    const r = await verifyPayment(req, { txHash: "0xbad" as `0x${string}` });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/invalid/i);
  });

  it("rejects when not found", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    const r = await verifyPayment(req, { txHash: TX_MISSING });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not found/i);
  });

  it("accepts a signed proof from the payer (requireSignature)", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n, account.address));
    const signature = await account.signMessage({
      message: paymentMessage(req.payTo, req.maxAmountRequired, TX),
    });
    const r = await verifyPayment(
      req,
      { txHash: TX, signer: account.address, signature },
      baseSepolia,
      { requireSignature: true },
    );
    expect(r.ok).toBe(true);
  });

  it("rejects when requireSignature but the proof is unsigned", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n, account.address));
    const r = await verifyPayment(req, { txHash: TX }, baseSepolia, { requireSignature: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not signed/i);
  });

  it("rejects when the signer is not the on-chain payer", async () => {
    const req = createPaymentRequirement({ payTo: PAY_TO, amount: 1, resource: "/x" });
    receipts.set(TX, receipt(1_000_000n, PAYER)); // payer != signer
    const signature = await account.signMessage({
      message: paymentMessage(req.payTo, req.maxAmountRequired, TX),
    });
    const r = await verifyPayment(
      req,
      { txHash: TX, signer: account.address, signature },
      baseSepolia,
      { requireSignature: true },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not the payer/i);
  });
});
