import { describe, it, expect } from "vitest";
import { generatePrivateKey } from "viem/accounts";
import { evaluatePolicy, isModelAllowed, type SpendPolicy } from "../src/policy";
import { createPaidFetch } from "../src/client";

describe("evaluatePolicy", () => {
  it("blocks a denylisted host — and the denylist beats the allow-list", () => {
    const p: SpendPolicy = { blockedHosts: ["evil.com"], allowedVendors: ["evil.com"] };
    const d = evaluatePolicy(p, { url: "https://api.evil.com/x", amountUsdc: 1 });
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/blocked/);
  });

  it("allows only allow-listed vendors by host", () => {
    const p: SpendPolicy = { allowedVendors: ["vendor.com"] };
    expect(evaluatePolicy(p, { url: "https://api.vendor.com/x", amountUsdc: 1 }).allow).toBe(true);
    expect(evaluatePolicy(p, { url: "https://other.com/x", amountUsdc: 1 }).allow).toBe(false);
  });

  it("allows an allow-listed vendor matched by payTo address", () => {
    const addr = "0x2cF32e45fE9266176D0373e17bE8029E6cfcb78D";
    const p: SpendPolicy = { allowedVendors: [addr] };
    expect(evaluatePolicy(p, { url: "https://x.com/y", payTo: addr, amountUsdc: 1 }).allow).toBe(true);
  });

  it("enforces an intent-based per-payment cap", () => {
    const p: SpendPolicy = { intents: [{ label: "data", host: "vendor.com", maxUsdc: 2 }] };
    expect(evaluatePolicy(p, { url: "https://vendor.com/d", amountUsdc: 1.5 }).allow).toBe(true);
    const over = evaluatePolicy(p, { url: "https://vendor.com/d", amountUsdc: 5 });
    expect(over.allow).toBe(false);
    expect(over.intent).toBe("data");
    expect(over.reason).toMatch(/cap/);
  });

  it("allows when no rule matches (daily limit still applies in the payer)", () => {
    expect(evaluatePolicy({}, { url: "https://anything.com/x", amountUsdc: 99 }).allow).toBe(true);
  });
});

describe("isModelAllowed", () => {
  it("empty allow-list permits any model", () => {
    expect(isModelAllowed({}, "gpt-5.4")).toBe(true);
  });
  it("restricts to the allow-list", () => {
    const p: SpendPolicy = { allowedModels: ["claude-opus-4-8", "gpt-5.4"] };
    expect(isModelAllowed(p, "claude-opus-4-8")).toBe(true);
    expect(isModelAllowed(p, "random-model")).toBe(false);
  });
});

describe("createPaidFetch + policy", () => {
  it("refuses to pay a blocked host — returns the unpaid 402, never touches the chain", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          accepts: [
            {
              payTo: "0x000000000000000000000000000000000000dEaD",
              maxAmountRequired: "1000000",
              asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              assetDecimals: 6,
              amountFormatted: "1",
            },
          ],
        }),
        { status: 402 },
      )) as typeof fetch;

    const pay = createPaidFetch({
      privateKey: generatePrivateKey(),
      policy: { blockedHosts: ["evil.com"] },
      fetchImpl,
    });
    const res = await pay("https://evil.com/premium");
    expect(res.status).toBe(402); // refused before payment; no on-chain transfer attempted
  });
});
