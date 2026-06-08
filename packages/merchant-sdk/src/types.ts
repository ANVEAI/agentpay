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

/** An EIP-3009 TransferWithAuthorization: a gasless USDC transfer signed by the payer. */
export interface TransferAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
  signature: Hex;
}

/**
 * Proof an agent submits that it paid. Either a settled tx hash (+ optional signature
 * binding it to the payer), or an EIP-3009 authorization the gateway settles on-chain.
 */
export interface PaymentProof {
  /** Settlement tx hash (send-tx flow). Absent for an unsettled EIP-3009 authorization. */
  txHash?: Hex;
  /** Wallet that signed this proof — must equal the on-chain payer. */
  signer?: Address;
  /** Signature over paymentMessage(payTo, amount, txHash). */
  signature?: Hex;
  /** EIP-3009 gasless authorization — the gateway settles it, then verifies the resulting tx. */
  authorization?: TransferAuthorization;
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
