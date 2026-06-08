import { describe, it, expect, vi } from "vitest";
import { extractPaymentRequirement, createPaidFetch, agentPaymentTool } from "../src/client";

const REQUIREMENT = {
  scheme: "exact",
  network: "base-sepolia",
  chainId: 84532,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  assetSymbol: "USDC",
  assetDecimals: 6,
  maxAmountRequired: "100000",
  amountFormatted: "0.1",
  payTo: "0xMerchant",
  resource: "/api/premium",
  nonce: "n",
  expiresAt: 9999999999,
};

describe("extractPaymentRequirement", () => {
  it("reads the first entry from an x402 accepts array", () => {
    const req = extractPaymentRequirement({ x402Version: 1, accepts: [REQUIREMENT] });
    expect(req?.payTo).toBe("0xMerchant");
    expect(req?.maxAmountRequired).toBe("100000");
  });
  it("accepts a bare requirement body", () => {
    expect(extractPaymentRequirement(REQUIREMENT)?.payTo).toBe("0xMerchant");
  });
  it("returns null for non-requirements", () => {
    expect(extractPaymentRequirement({ hello: "world" })).toBeNull();
    expect(extractPaymentRequirement(null)).toBeNull();
  });
});

describe("createPaidFetch", () => {
  it("passes non-402 responses through without paying", async () => {
    const impl = vi.fn(async () => new Response("ok", { status: 200 }));
    const f = createPaidFetch({ privateKey: "0x00", fetchImpl: impl as unknown as typeof fetch });
    const res = await f("https://x.test");
    expect(res.status).toBe(200);
    expect(impl).toHaveBeenCalledTimes(1); // no retry, no payment
  });

  it("returns the original 402 when the requirement can't be parsed (no on-chain attempt)", async () => {
    const impl = vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 402 }));
    const f = createPaidFetch({ privateKey: "0x00", fetchImpl: impl as unknown as typeof fetch });
    const res = await f("https://x.test");
    expect(res.status).toBe(402);
    expect(impl).toHaveBeenCalledTimes(1);
  });
});

describe("agentPaymentTool", () => {
  it("exposes a tool spec and OpenAI shape", () => {
    const tool = agentPaymentTool({ privateKey: "0x00" });
    expect(tool.name).toBe("pay_and_fetch");
    expect(tool.parameters.required).toContain("url");
    const oai = tool.toOpenAITool();
    expect(oai.type).toBe("function");
    expect(oai.function.name).toBe("pay_and_fetch");
  });
});
