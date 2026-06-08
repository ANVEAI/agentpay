import { describe, it, expect } from "vitest";
import { paymentMessage, encodeProof, decodeProof } from "../src/proof";

describe("proof", () => {
  it("paymentMessage is canonical and lowercased", () => {
    expect(paymentMessage("0xABC", "100000", "0xDEF", "/r")).toBe(
      "agentpay-payment:v1:0xabc:100000:/r:0xdef",
    );
  });

  it("encode/decode round-trips a signed proof", () => {
    const p = {
      txHash: ("0x" + "a".repeat(64)) as `0x${string}`,
      signer: "0xabc" as `0x${string}`,
      signature: "0xsig" as `0x${string}`,
    };
    expect(decodeProof(encodeProof(p))).toEqual(p);
  });

  it("decodes a legacy bare tx hash", () => {
    const tx = "0x" + "b".repeat(64);
    expect(decodeProof(tx)).toEqual({ txHash: tx });
  });

  it("returns null for empty or junk input", () => {
    expect(decodeProof("")).toBeNull();
    expect(decodeProof(null)).toBeNull();
    expect(decodeProof("!!not-valid!!")).toBeNull();
  });
});
