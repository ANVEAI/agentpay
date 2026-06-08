import { createWalletClient, createPublicClient, http, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia as viemBaseSepolia } from "viem/chains";
import type { Hex, Network } from "./types";
import { baseSepolia } from "./chains";

export interface PayAndFetchOptions {
  /** Agent wallet private key (0x-prefixed). Keep this in env, never in client code. */
  privateKey: Hex;
  network?: Network;
  init?: RequestInit;
  fetchImpl?: typeof fetch;
  paymentHeader?: string;
}

/**
 * The agent-side counterpart to the gateway. Fetch a resource; if it returns
 * HTTP 402, pay the x402 requirement in USDC on-chain and retry once with proof.
 *
 *   const res = await payAndFetch("https://api.site.com/premium", { privateKey });
 */
export async function payAndFetch(url: string, opts: PayAndFetchOptions): Promise<Response> {
  const network = opts.network ?? baseSepolia;
  const doFetch = opts.fetchImpl ?? fetch;
  const header = opts.paymentHeader ?? "x-payment";

  const first = await doFetch(url, opts.init);
  if (first.status !== 402) return first;

  const body = await first.json().catch(() => null);
  const requirement = body?.accepts?.[0] ?? body;
  if (!requirement?.payTo || !requirement?.maxAmountRequired || !requirement?.asset) {
    throw new Error("402 response did not include a valid x402 payment requirement");
  }

  const account = privateKeyToAccount(opts.privateKey);
  const wallet = createWalletClient({ account, chain: viemBaseSepolia, transport: http(network.rpcUrl) });
  const pub = createPublicClient({ chain: viemBaseSepolia, transport: http(network.rpcUrl) });

  const hash = await wallet.writeContract({
    address: requirement.asset as Hex,
    abi: erc20Abi,
    functionName: "transfer",
    args: [requirement.payTo as Hex, BigInt(requirement.maxAmountRequired)],
  });
  await pub.waitForTransactionReceipt({ hash });

  const headers = new Headers(opts.init?.headers);
  headers.set(header, hash);
  return doFetch(url, { ...opts.init, headers });
}
