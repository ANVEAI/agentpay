import { describe, it, expect } from "vitest";
import { verifyTypedData } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  signTransferAuthorization,
  buildTransferAuthorizationTypedData,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type Eip712Domain,
} from "../src/authorization";
import { baseSepolia } from "../src/chains";

const domain: Eip712Domain = {
  name: "USDC",
  version: "2",
  chainId: baseSepolia.chainId,
  verifyingContract: baseSepolia.usdcAddress,
};

describe("EIP-3009 transfer authorization", () => {
  it("signs a TransferWithAuthorization that recovers to the signer", async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const auth = await signTransferAuthorization({
      privateKey: pk,
      to: "0x000000000000000000000000000000000000dEaD",
      amountBaseUnits: "1000000",
      domain, // skip the on-chain domain read in the test
      network: baseSepolia,
    });

    expect(auth.from.toLowerCase()).toBe(account.address.toLowerCase());
    expect(auth.value).toBe("1000000");
    expect(auth.nonce).toMatch(/^0x[0-9a-f]{64}$/i);

    const valid = await verifyTypedData({
      address: account.address,
      domain,
      types: TRANSFER_WITH_AUTHORIZATION_TYPES,
      primaryType: "TransferWithAuthorization",
      message: {
        from: auth.from,
        to: auth.to,
        value: BigInt(auth.value),
        validAfter: BigInt(auth.validAfter),
        validBefore: BigInt(auth.validBefore),
        nonce: auth.nonce,
      },
      signature: auth.signature,
    });
    expect(valid).toBe(true);
  });

  it("builds typed data with the right primary type and domain", () => {
    const td = buildTransferAuthorizationTypedData(domain, {
      from: "0x000000000000000000000000000000000000aaaa",
      to: "0x000000000000000000000000000000000000bbbb",
      value: 1n,
      validAfter: 0n,
      validBefore: 2n,
      nonce: ("0x" + "0".repeat(64)) as `0x${string}`,
    });
    expect(td.primaryType).toBe("TransferWithAuthorization");
    expect(td.domain.verifyingContract).toBe(baseSepolia.usdcAddress);
    expect(td.domain.chainId).toBe(baseSepolia.chainId);
  });

  it("generates a unique nonce per authorization", async () => {
    const pk = generatePrivateKey();
    const opts = {
      privateKey: pk,
      to: "0x000000000000000000000000000000000000dEaD",
      amountBaseUnits: "1",
      domain,
    };
    const a = await signTransferAuthorization(opts);
    const b = await signTransferAuthorization(opts);
    expect(a.nonce).not.toBe(b.nonce);
  });
});
