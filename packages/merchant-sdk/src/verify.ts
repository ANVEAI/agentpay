import {
  createPublicClient,
  http,
  parseAbiItem,
  decodeEventLog,
  formatUnits,
  getAddress,
} from "viem";
import type { Address, Network, PaymentProof, PaymentRequirement, VerifyResult } from "./types";
import { baseSepolia } from "./chains";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/**
 * Verify on-chain that `proof.txHash` settled at least the required amount of
 * USDC to the requirement's `payTo` address. Reads the transaction receipt and
 * sums matching ERC-20 Transfer logs.
 */
export interface VerifyOptions {
  /**
   * Reject payments whose transaction is older than this many seconds. Stops an agent
   * replaying an old, unrelated transfer as proof. Default 900. Set 0 to disable.
   */
  maxAgeSeconds?: number;
}

export async function verifyPayment(
  requirement: PaymentRequirement,
  proof: PaymentProof,
  network: Network = baseSepolia,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const client = createPublicClient({ transport: http(network.rpcUrl) });

  const receipt = await client.getTransactionReceipt({ hash: proof.txHash }).catch(() => null);
  if (!receipt) {
    return { ok: false, reason: "transaction not found or not yet mined", txHash: proof.txHash };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "transaction reverted", txHash: proof.txHash };
  }

  // Freshness: reject replays of old transfers (the requirement is short-lived).
  const maxAge = options.maxAgeSeconds ?? 900;
  if (maxAge > 0) {
    const block = await client.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null);
    if (block) {
      const age = Math.floor(Date.now() / 1000) - Number(block.timestamp);
      if (age > maxAge) {
        return {
          ok: false,
          reason: `payment is stale (${age}s old, max ${maxAge}s) — a fresh payment is required`,
          txHash: proof.txHash,
        };
      }
    }
  }

  const usdc = network.usdcAddress.toLowerCase();
  const payTo = requirement.payTo.toLowerCase();
  let total = 0n;
  let from: Address | undefined;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdc) continue;
    try {
      const { args } = decodeEventLog({ abi: [TRANSFER], data: log.data, topics: log.topics });
      const to = (args.to as string).toLowerCase();
      if (to === payTo) {
        total += args.value as bigint;
        from = getAddress(args.from as string);
      }
    } catch {
      // not a Transfer event from this contract; skip
    }
  }

  const required = BigInt(requirement.maxAmountRequired);
  if (total < required) {
    return {
      ok: false,
      reason: `insufficient payment: received ${formatUnits(total, network.usdcDecimals)} of ${requirement.amountFormatted} USDC`,
      paid: total.toString(),
      from,
      txHash: proof.txHash,
    };
  }

  return { ok: true, paid: total.toString(), from, txHash: proof.txHash };
}
