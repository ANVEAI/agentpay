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
export async function verifyPayment(
  requirement: PaymentRequirement,
  proof: PaymentProof,
  network: Network = baseSepolia,
): Promise<VerifyResult> {
  const client = createPublicClient({ transport: http(network.rpcUrl) });

  const receipt = await client.getTransactionReceipt({ hash: proof.txHash }).catch(() => null);
  if (!receipt) {
    return { ok: false, reason: "transaction not found or not yet mined", txHash: proof.txHash };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "transaction reverted", txHash: proof.txHash };
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
