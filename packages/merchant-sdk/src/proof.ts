import type { Hex, PaymentProof } from "./types";

// Canonical message the paying agent signs. Binding to payTo + amount + resource + txHash
// means a signature is specific to this payment AND this resource (can't be reused for a
// different endpoint); requiring the signer to equal the on-chain payer proves control of
// the wallet that actually paid.
export function paymentMessage(
  payTo: string,
  amount: string,
  txHash: string,
  resource: string,
): string {
  return `agentpay-payment:v1:${payTo.toLowerCase()}:${amount}:${resource}:${txHash.toLowerCase()}`;
}

function b64encode(s: string): string {
  if (typeof btoa === "function") return btoa(s);
  return Buffer.from(s, "utf8").toString("base64");
}
function b64decode(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("utf8");
}

/** Encode a proof for the X-PAYMENT header (base64 JSON). */
export function encodeProof(proof: PaymentProof): string {
  return b64encode(JSON.stringify(proof));
}

const HEX_TX = /^0x[0-9a-fA-F]{64}$/;

/** Parse an X-PAYMENT header value: base64 JSON proof, or a legacy bare tx hash. */
export function decodeProof(headerValue: string | null | undefined): PaymentProof | null {
  const v = (headerValue ?? "").trim();
  if (!v) return null;
  if (HEX_TX.test(v)) return { txHash: v as Hex }; // legacy bare tx hash (unsigned)
  try {
    const obj = JSON.parse(b64decode(v));
    if (obj && typeof obj.txHash === "string") {
      return { txHash: obj.txHash as Hex, signer: obj.signer, signature: obj.signature };
    }
  } catch {
    // not base64 JSON
  }
  return null;
}
