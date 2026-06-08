export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/** A supported settlement network. */
export interface Network {
  /** Short id, e.g. "base-sepolia". */
  name: string;
  chainId: number;
  rpcUrl: string;
  /** ERC-20 USDC contract on this network. */
  usdcAddress: Address;
  usdcDecimals: number;
  explorerUrl: string;
}

/**
 * An x402-style payment requirement returned to a paying agent.
 * This is the JSON body a merchant sends back with an HTTP 402.
 */
export interface PaymentRequirement {
  /** x402 scheme. "exact" = pay an exact amount. */
  scheme: "exact";
  /** Network id the payment must occur on, e.g. "base-sepolia". */
  network: string;
  chainId: number;
  /** ERC-20 token contract the payment must use (USDC). */
  asset: Address;
  assetSymbol: string;
  assetDecimals: number;
  /** Amount required in base units (e.g. "5000000" = 5 USDC at 6 decimals). */
  maxAmountRequired: string;
  /** Human-readable amount (e.g. "5"). */
  amountFormatted: string;
  /** Address the funds must be sent to (the merchant wallet). */
  payTo: Address;
  /** What is being paid for (a URL, product id, or label). */
  resource: string;
  description?: string;
  /** Unique id for this payment request. */
  nonce: string;
  /** Unix seconds when this requirement was issued. */
  issuedAt: number;
  /** Unix seconds after which this requirement is no longer valid. */
  expiresAt: number;
}

/**
 * Proof an agent submits that it paid.
 * MVP: a transaction hash. The full x402 scheme uses a signed `X-PAYMENT`
 * payload verified by a facilitator; this verifies the settled transfer directly.
 */
export interface PaymentProof {
  txHash: Hex;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  /** Base units actually received by `payTo` in the proof transaction. */
  paid?: string;
  /** The payer address, if found. */
  from?: Address;
  txHash?: Hex;
}
