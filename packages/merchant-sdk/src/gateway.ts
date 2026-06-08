import type { Address, Hex, Network, PaymentRequirement, VerifyResult } from "./types";
import { createPaymentRequirement } from "./requirement";
import { verifyPayment } from "./verify";
import { memoryStore, type PaymentStore } from "./store";

export const X402_VERSION = 1;
export const DEFAULT_PAYMENT_HEADER = "x-payment";
export const DEFAULT_BASE_URL = "https://api.agentpay.app";

export interface GatewayConfig {
  /** Static mode: merchant wallet that receives payment. */
  payTo?: Address;
  /** Static mode: price in USDC, e.g. 0.5. */
  amount?: string | number;
  /** Managed mode: an API key from the AgentPay control plane (hosted or self-hosted). */
  apiKey?: string;
  /** Managed mode: control-plane base URL. Defaults to AGENTPAY_BASE_URL or the cloud. */
  baseUrl?: string;
  /** Settlement network. Defaults to Base Sepolia. */
  network?: Network;
  resource?: string;
  description?: string;
  ttlSeconds?: number;
  /** Header the agent sends its paying tx hash in. Default "x-payment". */
  paymentHeader?: string;
  /** Replay guard. Default in-memory. */
  store?: PaymentStore;
}

export interface X402Body {
  x402Version: number;
  error: string | null;
  accepts: PaymentRequirement[];
}
export interface PaidResult {
  paid: true;
  payment: VerifyResult;
}
export interface UnpaidResult {
  paid: false;
  status: 402;
  requirement: PaymentRequirement;
  body: X402Body;
}
export type GatewayResult = PaidResult | UnpaidResult;

interface Resolved {
  payTo: Address;
  amount: string | number;
  description?: string;
}

function baseUrlOf(config: GatewayConfig): string {
  const env =
    typeof process !== "undefined"
      ? (process.env?.AGENTPAY_API_URL ?? process.env?.AGENTPAY_BASE_URL)
      : undefined;
  return config.baseUrl ?? env ?? DEFAULT_BASE_URL;
}

/**
 * Framework-agnostic payment gate. Works in two modes:
 *  - static:  { payTo, amount }            (self-hosted, inline config)
 *  - managed: { apiKey, baseUrl? }         (fetches config + reports events to the control plane)
 */
export function createPaymentGateway(config: GatewayConfig) {
  const store = config.store ?? memoryStore();
  const paymentHeader = (config.paymentHeader ?? DEFAULT_PAYMENT_HEADER).toLowerCase();
  const managed = !config.payTo && !!config.apiKey;
  let cache: { at: number; value: Resolved } | null = null;

  async function resolve(): Promise<Resolved> {
    if (config.payTo && config.amount != null) {
      return { payTo: config.payTo, amount: config.amount, description: config.description };
    }
    if (config.apiKey) {
      if (cache && Date.now() - cache.at < 60_000) return cache.value;
      const res = await fetch(`${baseUrlOf(config)}/api/cp/config`, {
        headers: { authorization: `Bearer ${config.apiKey}` },
      });
      if (!res.ok) throw new Error(`AgentPay config fetch failed (${res.status})`);
      const data = await res.json();
      const value: Resolved = {
        payTo: data.payTo as Address,
        amount: data.amountFormatted ?? data.amount,
        description: data.description,
      };
      cache = { at: Date.now(), value };
      return value;
    }
    throw new Error("paymentGateway requires either { payTo, amount } or { apiKey }");
  }

  function build(resolved: Resolved, resource?: string): PaymentRequirement {
    return createPaymentRequirement({
      payTo: resolved.payTo,
      amount: resolved.amount,
      resource: resource ?? config.resource ?? "/",
      description: resolved.description ?? config.description,
      network: config.network,
      ttlSeconds: config.ttlSeconds,
    });
  }

  function body(requirement: PaymentRequirement, error: string | null = null): X402Body {
    return { x402Version: X402_VERSION, error, accepts: [requirement] };
  }

  async function report(payment: VerifyResult, resource?: string): Promise<void> {
    if (!config.apiKey) return;
    try {
      await fetch(`${baseUrlOf(config)}/api/cp/events`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          txHash: payment.txHash,
          from: payment.from,
          amount: payment.paid,
          resource: resource ?? config.resource ?? "/",
        }),
      });
    } catch {
      // reporting is best-effort; never block the request on it
    }
  }

  async function check(opts: {
    resource?: string;
    paymentTxHash?: string | null;
  }): Promise<GatewayResult> {
    const resolved = await resolve();
    const requirement = build(resolved, opts.resource);
    const tx = opts.paymentTxHash?.trim();

    if (!tx) {
      return { paid: false, status: 402, requirement, body: body(requirement, "Payment required") };
    }
    if (await store.has(tx)) {
      return { paid: false, status: 402, requirement, body: body(requirement, "Payment already used") };
    }

    const result = await verifyPayment(requirement, { txHash: tx as Hex }, config.network);
    if (!result.ok) {
      return {
        paid: false,
        status: 402,
        requirement,
        body: body(requirement, result.reason ?? "Payment verification failed"),
      };
    }

    await store.add(tx);
    void report(result, opts.resource);
    return { paid: true, payment: result };
  }

  return { check, paymentHeader, managed };
}
