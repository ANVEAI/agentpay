import { describe, it, expect, vi, beforeEach } from "vitest";

// End-to-end gasless flow: the agent signs an EIP-3009 authorization (no ETH), the merchant
// gateway settles it on-chain, then verifies the resulting transfer and grants access. Only
// the chain RPC is mocked: readContract (eip712Domain) for the agent's signing, and the
// receipt for the settled tx.
const receipts = new Map<string, unknown>();
const SETTLED_TX = ("0x" + "f".repeat(64)) as `0x${string}`;
let blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async () => [
        "0x0f",
        "USDC",
        "2",
        84532n,
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "0x" + "0".repeat(64),
        [],
      ],
      getTransactionReceipt: async ({ hash }: { hash: string }) => receipts.get(hash) ?? null,
      getBlock: async () => ({ timestamp: blockTimestamp }),
      getBlockNumber: async () => 1n,
    }),
  };
});

import { createPaidFetch } from "../src/client";
import { createWebGateway } from "../src/web";
import { baseSepolia, type TransferAuthorization } from "../src/index";
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

describe("e2e gasless: EIP-3009 authorization settled by the gateway", () => {
  beforeEach(() => {
    receipts.clear();
    blockTimestamp = BigInt(Math.floor(Date.now() / 1000));
  });

  it("completes 402 → sign authorization → gateway settles → 200", async () => {
    const settled: TransferAuthorization[] = [];
    const gw = createWebGateway({
      payTo: PAY_TO,
      amount: 1,
      // The merchant submits the authorization on-chain (mocked) and records the receipt.
      settle: async (auth) => {
        settled.push(auth);
        receipts.set(SETTLED_TX, {
          status: "success",
          blockNumber: 1n,
          logs: [transfer(auth.from, auth.to, BigInt(auth.value))],
        });
        return SETTLED_TX;
      },
    });
    const fetchImpl = (async (input: unknown, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const denied = await gw.guard(new Request(url, init));
      if (denied) return denied;
      return new Response(JSON.stringify({ data: "premium content" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const pay = createPaidFetch({ privateKey: AGENT_PK, gasless: true, fetchImpl });
    const res = await pay("https://merchant.test/api/premium");

    expect(res.status).toBe(200);
    expect((await res.json()).data).toBe("premium content");
    expect(settled).toHaveLength(1);
    expect(settled[0].from.toLowerCase()).toBe(agent.address.toLowerCase());
    expect(settled[0].to.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(settled[0].value).toBe("1000000");
  });

  it("refuses gasless when the gateway has no settler configured", async () => {
    const gw = createWebGateway({ payTo: PAY_TO, amount: 1 }); // no settle
    const fetchImpl = (async (input: unknown, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const denied = await gw.guard(new Request(url, init));
      return denied ?? new Response("ok", { status: 200 });
    }) as typeof fetch;

    const pay = createPaidFetch({ privateKey: AGENT_PK, gasless: true, fetchImpl });
    const res = await pay("https://merchant.test/api/premium");
    expect(res.status).toBe(402);
  });
});
