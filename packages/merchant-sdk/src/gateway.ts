import type { Address, Hex, Network, PaymentRequirement, TransferAuthorization, VerifyResult } from "./types";
import { createPaymentRequirement } from "./requirement";
import { verifyPayment } from "./verify";
import { decodeProof } from "./proof";
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
  /**
   * Require a signed payment proof (signer == on-chain payer). Default true — set false
   * only to accept legacy unsigned tx-hash proofs.
   */
  requireSignature?: boolean;
  /**
   * Enable EIP-3009 gasless payments: given a signed authorization, submit it on-chain and
   * return the tx hash (e.g. `(a) => settleTransferAuthorization({ submitterPrivateKey, authorization: a })`).
   * If unset, the gateway rejects authorization proofs.
   */
  settle?: (authorization: TransferAuthorization) => Promise<Hex>;
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

  // Managed mode: record the payment to the control plane, which de-dups by
  // (project, txHash) and tells us whether it was a duplicate. This is the durable,
  // restart-safe replay guard. If the control plane is unreachable we fail open —
  // the on-chain freshness check still bounds any replay window.
  async function recordManaged(
    payment: VerifyResult,
    resource?: string,
  ): Promise<{ duplicate: boolean }> {
    try {
      const res = await fetch(`${baseUrlOf(config)}/api/cp/events`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          txHash: payment.txHash,
          from: payment.from,
          amount: payment.paid,
          resource: resource ?? config.resource ?? "/",
        }),
      });
      if (!res.ok) return { duplicate: false };
      const data = await res.json().catch(() => ({}));
      return { duplicate: !!data.duplicate };
    } catch {
      return { duplicate: false };
    }
  }

  async function check(opts: {
    resource?: string;
    payment?: string | null;
  }): Promise<GatewayResult> {
    const resolved = await resolve();
    const requirement = build(resolved, opts.resource);
    const proof = decodeProof(opts.payment ?? null);

    if (!proof) {
      return { paid: false, status: 402, requirement, body: body(requirement, "Payment required") };
    }

    // EIP-3009 gasless: settle the signed authorization on-chain, then verify the resulting tx.
    let toVerify = proof;
    let requireSig = config.requireSignature !== false;
    if (proof.authorization) {
      if (!config.settle) {
        return {
          paid: false,
          status: 402,
          requirement,
          body: body(requirement, "Gasless (EIP-3009) payments are not enabled on this gateway"),
        };
      }
      try {
        const txHash = await config.settle(proof.authorization);
        toVerify = { txHash };
        requireSig = false; // the EIP-3009 authorization is itself the payer's signature
      } catch {
        return { paid: false, status: 402, requirement, body: body(requirement, "Settlement failed") };
      }
    }

    // Static mode: local replay pre-check. (Managed mode de-dups durably at commit.)
    if (!config.apiKey && toVerify.txHash && (await store.has(toVerify.txHash))) {
      return { paid: false, status: 402, requirement, body: body(requirement, "Payment already used") };
    }

    const result = await verifyPayment(requirement, toVerify, config.network, {
      requireSignature: requireSig,
    });
    if (!result.ok) {
      return {
        paid: false,
        status: 402,
        requirement,
        body: body(requirement, result.reason ?? "Payment verification failed"),
      };
    }

    if (config.apiKey) {
      const { duplicate } = await recordManaged(result, opts.resource);
      if (duplicate) {
        return { paid: false, status: 402, requirement, body: body(requirement, "Payment already used") };
      }
    } else if (toVerify.txHash) {
      await store.add(toVerify.txHash);
    }

    return { paid: true, payment: result };
  }

  return { check, paymentHeader, managed };
}
