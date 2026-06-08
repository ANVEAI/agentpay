import { describe, it, expect, vi, beforeEach } from "vitest";

// End-to-end: the REAL agent payer (createPaidFetch) talks to the REAL merchant
// gateway (createWebGateway), with real signature crypto. Only the chain RPC is mocked:
// the agent's "transfer" returns a tx hash, and the gateway sees a matching receipt
// whose payer is the agent wallet. This proves the integrated loop, not just units.
const receipts = new Map<string, unknown>();
const PAID_TX = ("0x" + "e".repeat(64)) as `0x${string}`;
let blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createWalletClient: () => ({ writeContract: async () => PAID_TX }),
    createPublicClient: () => ({
      waitForTransactionReceipt: async () => ({ status: "success" }),
      getTransactionReceipt: async ({ hash }: { hash: string }) => receipts.get(hash) ?? null,
      getBlock: async () => ({ timestamp: blockTimestamp }),
      getBlockNumber: async () => 1n,
    }),
  };
});

import { baseSepolia, decodeProof } from "../src/index";
import { createPaidFetch } from "../src/client";
import { createWebGateway } from "../src/web";
import { pad, numberToHex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PAY_TO = "0x000000000000000000000000000000000000dEaD";
const AGENT_PK = generatePrivateKey();
const agent = privateKeyToAccount(AGENT_PK);

function transfer(from: string, to: string, value: bigint) {
  return {
    address: baseSepolia.usdcAddress,
    topics: [TRANSFER_TOPIC, pad(from as `0x${string}`), pad(to as `0x${string}`)],
    data: numberToHex(value, { size: 32 }),
  };
}
function settle(value: bigint, from = agent.address) {
  receipts.set(PAID_TX, {
    status: "success",
    blockNumber: 1n,
    logs: [transfer(from, PAY_TO, value)],
  });
}

// A merchant whose premium endpoint is gated by the gateway: content is returned only
// after the gateway honors a payment. Captures the X-PAYMENT headers it receives.
function makeMerchant() {
  const gw = createWebGateway({ payTo: PAY_TO, amount: 1 });
  const seen: string[] = [];
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const req = new Request(url, init);
    const xp = req.headers.get("x-payment");
    if (xp) seen.push(xp);
    const denied = await gw.guard(req);
    if (denied) return denied;
    return new Response(JSON.stringify({ data: "premium content" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, seen };
}

describe("e2e: agent pays a gateway-protected merchant endpoint", () => {
  beforeEach(() => {
    receipts.clear();
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000));
  });

  it("returns a 402 with the x402 requirement before payment", async () => {
    const gw = createWebGateway({ payTo: PAY_TO, amount: 1 });
    const denied = await gw.guard(new Request("https://merchant.test/api/premium"));
    expect(denied?.status).toBe(402);
    const body = await denied!.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts[0].payTo).toBe(PAY_TO);
    expect(body.accepts[0].maxAmountRequired).toBe("1000000");
  });

  it("completes 402 → pay → sign → 200 and returns the content", async () => {
    settle(1_000_000n);
    const { fetchImpl, seen } = makeMerchant();
    const pay = createPaidFetch({ privateKey: AGENT_PK, fetchImpl });

    const res = await pay("https://merchant.test/api/premium");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toBe("premium content");

    // The proof the agent attached was signed and bound to the agent wallet.
    const proof = decodeProof(seen.at(-1)!);
    expect(proof?.txHash).toBe(PAID_TX);
    expect(proof?.signer?.toLowerCase()).toBe(agent.address.toLowerCase());
    expect(proof?.signature).toMatch(/^0x[0-9a-f]+$/i);
  });

  it("rejects a replayed payment (same tx reused)", async () => {
    settle(1_000_000n);
    const { fetchImpl } = makeMerchant(); // one merchant → one replay store
    const pay = createPaidFetch({ privateKey: AGENT_PK, fetchImpl });

    const first = await pay("https://merchant.test/api/premium");
    expect(first.status).toBe(200);

    const second = await pay("https://merchant.test/api/premium");
    expect(second.status).toBe(402); // same tx → already used
  });

  it("does not grant on an underpayment", async () => {
    settle(500_000n); // paid 0.5, required 1
    const { fetchImpl } = makeMerchant();
    const pay = createPaidFetch({ privateKey: AGENT_PK, fetchImpl });

    const res = await pay("https://merchant.test/api/premium");
    expect(res.status).toBe(402);
  });

  it("does not grant when the payer is not the signer (stolen proof)", async () => {
    // The on-chain payer is a different wallet than the agent that signed the proof.
    settle(1_000_000n, "0x0000000000000000000000000000000000000bad");
    const { fetchImpl } = makeMerchant();
    const pay = createPaidFetch({ privateKey: AGENT_PK, fetchImpl });

    const res = await pay("https://merchant.test/api/premium");
    expect(res.status).toBe(402);
  });
});
