import {
  createPublicClient,
  http,
  parseAbiItem,
  decodeEventLog,
  formatUnits,
  getAddress,
  verifyMessage,
} from "viem";
import type { Address, Network, PaymentProof, PaymentRequirement, VerifyResult } from "./types";
import { baseSepolia } from "./chains";
import { paymentMessage } from "./proof";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/**
 * Verify on-chain that `proof.txHash` settled at least the required amount of
 * USDC to the requirement's `payTo` address. Reads the transaction receipt and
 * sums matching ERC-20 Transfer logs.
 */
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export interface VerifyOptions {
  /**
   * Reject payments whose transaction is older than this many seconds. Stops an agent
   * replaying an old, unrelated transfer as proof. Default 900. Set 0 to disable.
   */
  maxAgeSeconds?: number;
  /**
   * Require the tx to be at least this many blocks deep before accepting, so a chain
   * reorg can't reverse a payment you've already honored. Default 1 (mined). Raise for
   * high-value payments.
   */
  minConfirmations?: number;
  /**
   * Require a signed proof whose signer equals the on-chain payer. Binds the proof to
   * the paying wallet so a leaked tx hash can't be replayed by a third party.
   */
  requireSignature?: boolean;
}

export async function verifyPayment(
  requirement: PaymentRequirement,
  proof: PaymentProof,
  network: Network = baseSepolia,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  if (!TX_HASH_RE.test(proof.txHash)) {
    return { ok: false, reason: "invalid transaction hash", txHash: proof.txHash };
  }

  const client = createPublicClient({ transport: http(network.rpcUrl) });

  const receipt = await client.getTransactionReceipt({ hash: proof.txHash }).catch(() => null);
  if (!receipt) {
    return { ok: false, reason: "transaction not found or not yet mined", txHash: proof.txHash };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "transaction reverted", txHash: proof.txHash };
  }

  const minConf = options.minConfirmations ?? 1;
  const maxAge = options.maxAgeSeconds ?? 900;
  if (minConf > 0 || maxAge > 0) {
    const [latest, block] = await Promise.all([
      client.getBlockNumber().catch(() => null),
      client.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null),
    ]);
    // Reorg safety: require enough confirmations before honoring the payment.
    if (minConf > 0 && latest != null) {
      const confs = Number(latest - receipt.blockNumber) + 1;
      if (confs < minConf) {
        return {
          ok: false,
          reason: `awaiting confirmations (${confs}/${minConf}) — retry shortly`,
          txHash: proof.txHash,
        };
      }
    }
    // Freshness: reject replays of old transfers (the requirement is short-lived).
    if (maxAge > 0 && block) {
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

  // Signature binding: prove the submitter controls the wallet that actually paid.
  if (options.requireSignature || proof.signature || proof.signer) {
    if (!proof.signature || !proof.signer) {
      return { ok: false, reason: "payment proof is not signed", paid: total.toString(), from, txHash: proof.txHash };
    }
    const message = paymentMessage(
      requirement.payTo,
      requirement.maxAmountRequired,
      proof.txHash,
      requirement.resource,
    );
    const validSig = await verifyMessage({
      address: proof.signer,
      message,
      signature: proof.signature,
    }).catch(() => false);
    if (!validSig) {
      return { ok: false, reason: "invalid payment signature", paid: total.toString(), from, txHash: proof.txHash };
    }
    if (!from || from.toLowerCase() !== proof.signer.toLowerCase()) {
      return { ok: false, reason: "proof signer is not the payer", paid: total.toString(), from, txHash: proof.txHash };
    }
  }

  return { ok: true, paid: total.toString(), from, txHash: proof.txHash };
}
