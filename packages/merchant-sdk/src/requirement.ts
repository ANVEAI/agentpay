import { parseUnits, formatUnits } from "viem";
import type { Address, Network, PaymentRequirement } from "./types";
import { baseSepolia } from "./chains";

export interface CreateRequirementParams {
  /** Merchant wallet that receives the funds. */
  payTo: Address;
  /** Human amount in USDC, e.g. "5" or 5. */
  amount: string | number;
  /** What is being paid for (URL, product id, or label). */
  resource: string;
  description?: string;
  /** Settlement network. Defaults to Base Sepolia. */
  network?: Network;
  /** How long the requirement stays valid, in seconds. Default 600. */
  ttlSeconds?: number;
}

/**
 * Build an x402-style payment requirement to send back to a paying agent
 * (typically as the body of an HTTP 402 response).
 */
export function createPaymentRequirement(params: CreateRequirementParams): PaymentRequirement {
  const network = params.network ?? baseSepolia;
  const amountStr = typeof params.amount === "number" ? String(params.amount) : params.amount;
  const base = parseUnits(amountStr, network.usdcDecimals);
  const ttl = params.ttlSeconds ?? 600;
  const now = Math.floor(Date.now() / 1000);

  return {
    scheme: "exact",
    network: network.name,
    chainId: network.chainId,
    asset: network.usdcAddress,
    assetSymbol: "USDC",
    assetDecimals: network.usdcDecimals,
    maxAmountRequired: base.toString(),
    amountFormatted: formatUnits(base, network.usdcDecimals),
    payTo: params.payTo,
    resource: params.resource,
    description: params.description,
    nonce: crypto.randomUUID(),
    issuedAt: now,
    expiresAt: now + ttl,
  };
}

/** True if the requirement's validity window has passed. */
export function isExpired(requirement: PaymentRequirement, now: number = Math.floor(Date.now() / 1000)): boolean {
  return now > requirement.expiresAt;
}
