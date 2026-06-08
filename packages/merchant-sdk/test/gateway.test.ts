import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaymentGateway,
  createPaymentRequirement,
  isExpired,
  memoryStore,
} from "../src/index";

describe("createPaymentRequirement", () => {
  it("computes USDC base units and core fields", () => {
    const r = createPaymentRequirement({ payTo: "0xabc", amount: 0.5, resource: "/r" });
    expect(r.maxAmountRequired).toBe("500000"); // 0.5 * 1e6
    expect(r.amountFormatted).toBe("0.5");
    expect(r.scheme).toBe("exact");
    expect(r.payTo).toBe("0xabc");
    expect(r.network).toBe("base-sepolia");
    expect(r.assetSymbol).toBe("USDC");
  });

  it("marks an expired requirement", () => {
    const r = createPaymentRequirement({ payTo: "0xabc", amount: 1, resource: "/", ttlSeconds: 0 });
    expect(isExpired(r, Math.floor(Date.now() / 1000) + 10)).toBe(true);
  });
});

describe("memoryStore", () => {
  it("tracks used tx hashes case-insensitively", async () => {
    const s = memoryStore();
    expect(await s.has("0xAA")).toBe(false);
    await s.add("0xAA");
    expect(await s.has("0xaa")).toBe(true);
  });
});

describe("gateway — static mode", () => {
  it("returns a 402 with the x402 requirement when unpaid", async () => {
    const gw = createPaymentGateway({ payTo: "0xMerchant", amount: 0.1 });
    const r = await gw.check({ resource: "/api/x" });
    expect(r.paid).toBe(false);
    if (!r.paid) {
      expect(r.status).toBe(402);
      expect(r.body.x402Version).toBe(1);
      expect(r.body.accepts[0].payTo).toBe("0xMerchant");
      expect(r.body.accepts[0].resource).toBe("/api/x");
    }
  });

  it("blocks a replayed tx without touching the chain", async () => {
    const USED = "0x" + "c".repeat(64);
    const store = memoryStore();
    await store.add(USED);
    const gw = createPaymentGateway({ payTo: "0xMerchant", amount: 0.1, store });
    const r = await gw.check({ resource: "/x", payment: USED });
    expect(r.paid).toBe(false);
    if (!r.paid) expect(r.body.error).toMatch(/already used/i);
  });
});

describe("gateway — managed mode", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("resolves config from the control plane", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ payTo: "0xCloud", amountFormatted: "0.25", network: "base-sepolia" }),
            { status: 200 },
          ),
      ),
    );
    const gw = createPaymentGateway({ apiKey: "ap_live_x", baseUrl: "https://cp.example" });
    expect(gw.managed).toBe(true);
    const r = await gw.check({ resource: "/m" });
    expect(r.paid).toBe(false);
    if (!r.paid) {
      expect(r.body.accepts[0].payTo).toBe("0xCloud");
      expect(r.body.accepts[0].amountFormatted).toBe("0.25");
    }
  });

  it("throws if neither payTo nor apiKey is given", async () => {
    const gw = createPaymentGateway({} as never);
    await expect(gw.check({ resource: "/x" })).rejects.toThrow();
  });
});
