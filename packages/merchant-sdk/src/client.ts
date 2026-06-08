import { createWalletClient, createPublicClient, http, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia as viemBaseSepolia } from "viem/chains";
import type { Hex, Network, PaymentRequirement } from "./types";
import { baseSepolia } from "./chains";
import { paymentMessage, encodeProof } from "./proof";
import { evaluatePolicy, type SpendPolicy } from "./policy";

export interface AgentWalletOptions {
  /** Agent wallet private key (0x-prefixed). Keep this in env, never in client code. */
  privateKey: Hex;
  network?: Network;
}

/**
 * Extract an x402 payment requirement from a 402 response body (or the raw body).
 * Agents call this to learn what to pay. Returns null if the body isn't a valid requirement.
 */
export function extractPaymentRequirement(body: unknown): PaymentRequirement | null {
  const b = body as Record<string, unknown> & { accepts?: PaymentRequirement[] };
  const req = (b?.accepts?.[0] ?? (b?.payTo ? (b as unknown as PaymentRequirement) : null)) as
    | PaymentRequirement
    | null;
  if (!req || !req.payTo || !req.maxAmountRequired || !req.asset) return null;
  return req;
}

/** Complete a payment for a requirement on-chain (USDC transfer). Returns the settled tx hash. */
export async function payRequirement(
  requirement: PaymentRequirement,
  opts: AgentWalletOptions,
): Promise<Hex> {
  const network = opts.network ?? baseSepolia;
  const account = privateKeyToAccount(opts.privateKey);
  const wallet = createWalletClient({ account, chain: viemBaseSepolia, transport: http(network.rpcUrl) });
  const pub = createPublicClient({ chain: viemBaseSepolia, transport: http(network.rpcUrl) });

  const hash = await wallet.writeContract({
    address: requirement.asset as Hex,
    abi: erc20Abi,
    functionName: "transfer",
    args: [requirement.payTo as Hex, BigInt(requirement.maxAmountRequired)],
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

export interface PaidFetchOptions extends AgentWalletOptions {
  fetchImpl?: typeof fetch;
  paymentHeader?: string;
  /**
   * Optional spend cap in USDC per UTC day, enforced in-process. Once reached, a 402 is
   * returned unpaid instead of paying over budget. (Persistent caps: back it with the
   * control plane's per-agent spend.)
   */
  dailyLimitUsdc?: number;
  /**
   * Spend policy enforced before paying any 402: vendor allow-list, blocked sites,
   * intent-based per-payment caps, model allow-list. A refused request returns its
   * unpaid 402 instead of paying.
   */
  policy?: SpendPolicy;
}

/**
 * A drop-in `fetch` that transparently pays x402 402s and retries with proof.
 * Hand this to any agent tool that uses fetch and payments happen autonomously.
 * With `dailyLimitUsdc`, it stops paying once the per-day cap is reached.
 *
 *   const fetch = createPaidFetch({ privateKey, dailyLimitUsdc: 10 });
 *   await fetch("https://api.site.com/premium");   // 402 auto-paid, up to $10/day
 */
export function createPaidFetch(opts: PaidFetchOptions): typeof fetch {
  const doFetch = opts.fetchImpl ?? fetch;
  const header = opts.paymentHeader ?? "x-payment";
  let spentUsdc = 0;
  let day = new Date().toISOString().slice(0, 10);

  const payAndRetry = async (
    input: Parameters<typeof fetch>[0],
    init: RequestInit | undefined,
    requirement: PaymentRequirement,
  ): Promise<Response> => {
    const hash = await payRequirement(requirement, opts);
    // Sign the proof with the paying wallet so the merchant can bind it to the payer.
    const account = privateKeyToAccount(opts.privateKey);
    const signature = await account.signMessage({
      message: paymentMessage(
        requirement.payTo,
        requirement.maxAmountRequired,
        hash,
        requirement.resource,
      ),
    });
    const headers = new Headers(init?.headers);
    headers.set(header, encodeProof({ txHash: hash, signer: account.address, signature }));
    return doFetch(input, { ...init, headers });
  };

  const paid = async (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
    const res = await doFetch(input, init);
    if (res.status !== 402) return res;

    const body = await res.clone().json().catch(() => null);
    const requirement = extractPaymentRequirement(body);
    if (!requirement) return res; // unparseable 402 — hand it back untouched

    if (opts.policy) {
      const amountUsdc = Number(requirement.maxAmountRequired) / 10 ** requirement.assetDecimals;
      const reqUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      const decision = evaluatePolicy(opts.policy, {
        url: reqUrl,
        payTo: requirement.payTo,
        amountUsdc,
      });
      if (!decision.allow) return res; // policy refused — return the unpaid 402, do not pay
    }

    if (opts.dailyLimitUsdc != null) {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        spentUsdc = 0;
      }
      const amount = Number(requirement.maxAmountRequired) / 10 ** requirement.assetDecimals;
      if (spentUsdc + amount > opts.dailyLimitUsdc) {
        return res; // daily budget exceeded — do not pay
      }
      const out = await payAndRetry(input, init, requirement);
      spentUsdc += amount;
      return out;
    }

    return payAndRetry(input, init, requirement);
  };

  return paid as typeof fetch;
}

export interface PayAndFetchOptions extends PaidFetchOptions {
  init?: RequestInit;
}

/** Fetch a resource, auto-paying a 402. Thin wrapper over createPaidFetch. */
export async function payAndFetch(url: string, opts: PayAndFetchOptions): Promise<Response> {
  return createPaidFetch(opts)(url, opts.init);
}

export interface AgentToolArgs {
  url: string;
  method?: string;
  body?: string;
}

/**
 * A framework-agnostic tool an LLM agent can call to fetch a paid resource,
 * paying any x402 402 from the agent wallet autonomously. Wire `invoke` into
 * LangChain / CrewAI / OpenClaw, or use `toOpenAITool()` for OpenAI tool-calling.
 */
export function agentPaymentTool(opts: PaidFetchOptions) {
  const paidFetch = createPaidFetch(opts);
  const name = "pay_and_fetch";
  const description =
    "Fetch a URL that may require payment. If it returns HTTP 402, automatically pay the " +
    "x402 USDC requirement from the agent wallet and retry. Returns the response status and body.";
  const parameters = {
    type: "object",
    properties: {
      url: { type: "string", description: "The resource URL to fetch." },
      method: { type: "string", description: "HTTP method (default GET)." },
      body: { type: "string", description: "Optional request body for POST/PUT." },
    },
    required: ["url"],
  };

  async function invoke(args: AgentToolArgs): Promise<{ status: number; body: string }> {
    const res = await paidFetch(args.url, {
      method: args.method ?? "GET",
      body: args.body,
      headers: args.body ? { "content-type": "application/json" } : undefined,
    });
    return { status: res.status, body: await res.text() };
  }

  return {
    name,
    description,
    parameters,
    invoke,
    /** OpenAI / OpenAI Agents SDK function-tool shape. Route the call to `invoke`. */
    toOpenAITool() {
      return { type: "function" as const, function: { name, description, parameters } };
    },
  };
}
