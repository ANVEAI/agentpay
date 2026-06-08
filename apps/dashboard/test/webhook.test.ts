import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { fireWebhook } from "../lib/cp/webhook";
import type { Project, PaymentEvent } from "../lib/cp/store";

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p1",
    owner: "0xowner",
    name: "P",
    payTo: "0xpay",
    amount: "0.1",
    network: "base-sepolia",
    keyHash: "hash",
    keyPrefix: "ap_live_abc",
    webhookUrl: "https://merchant.example/hook",
    webhookSecret: "whsec_test_secret",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}
function event(): PaymentEvent {
  return {
    id: "e1",
    projectId: "p1",
    txHash: "0xabc",
    from: "0xfrom",
    amount: "100000",
    resource: "/x",
    at: "2026-01-02T00:00:00Z",
  };
}

describe("fireWebhook", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs a payment.received payload signed with HMAC-SHA256(webhookSecret)", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response("ok");
      }),
    );
    const p = project();
    await fireWebhook(p, event());

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://merchant.example/hook");
    const body = calls[0].init.body as string;
    const parsed = JSON.parse(body);
    expect(parsed.type).toBe("payment.received");
    expect(parsed.txHash).toBe("0xabc");
    expect(parsed.amount).toBe("100000");

    // A receiver must be able to verify the signature with the shared secret.
    const expected = crypto.createHmac("sha256", p.webhookSecret).update(body).digest("hex");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-agentpay-signature"]).toBe(expected);
  });

  it("does nothing when no webhookUrl is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await fireWebhook(project({ webhookUrl: "" }), event());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is best-effort: a delivery failure never throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(fireWebhook(project(), event())).resolves.toBeUndefined();
  });
});
