import {
  createPublicClient,
  createWalletClient,
  http,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia as viemBaseSepolia } from "viem/chains";
import type { Network } from "./types";
import { baseSepolia } from "./chains";

// EIP-3009 TransferWithAuthorization. The agent SIGNS a USDC transfer authorization: it needs
// no ETH for gas and never sends the tx itself — the merchant (or a facilitator) submits it.
// This is the x402 "exact" settlement scheme: gasless, signed, pull-based. NOTE: this is a
// transfer primitive, not on-chain policy enforcement — a non-bypassable spend-limit module
// would be a separate, audited smart contract.

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export interface Eip712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

export interface TransferAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
  signature: Hex;
}

const EIP712_DOMAIN_ABI = [
  {
    name: "eip712Domain",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" },
    ],
  },
] as const;

const TRANSFER_WITH_AUTH_ABI = [
  {
    name: "transferWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

/** Build the EIP-712 typed data for a USDC TransferWithAuthorization. Pure + testable. */
export function buildTransferAuthorizationTypedData(
  domain: Eip712Domain,
  message: {
    from: Address;
    to: Address;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: Hex;
  },
) {
  return {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization" as const,
    message,
  };
}

/** Read the token's exact EIP-712 domain (ERC-5267), so signatures match the deployed contract. */
export async function resolveUsdcDomain(network: Network = baseSepolia): Promise<Eip712Domain> {
  const client = createPublicClient({ transport: http(network.rpcUrl) });
  try {
    const d = (await client.readContract({
      address: network.usdcAddress,
      abi: EIP712_DOMAIN_ABI,
      functionName: "eip712Domain",
    })) as readonly [Hex, string, string, bigint, Address, Hex, readonly bigint[]];
    return { name: d[1], version: d[2], chainId: Number(d[3]), verifyingContract: d[4] };
  } catch {
    // Fallback to Circle USDC defaults if the token predates ERC-5267.
    return { name: "USDC", version: "2", chainId: network.chainId, verifyingContract: network.usdcAddress };
  }
}

export interface SignAuthorizationOptions {
  privateKey: Hex;
  to: string;
  amountBaseUnits: string;
  network?: Network;
  validForSeconds?: number;
  /** Override the EIP-712 domain; otherwise it is resolved from the token on-chain. */
  domain?: Eip712Domain;
}

/** Sign a gasless USDC transfer authorization (EIP-3009). The agent needs no ETH. */
export async function signTransferAuthorization(
  opts: SignAuthorizationOptions,
): Promise<TransferAuthorization> {
  const network = opts.network ?? baseSepolia;
  const account = privateKeyToAccount(opts.privateKey);
  const domain = opts.domain ?? (await resolveUsdcDomain(network));
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + (opts.validForSeconds ?? 3600));
  const nonce = toHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const message = {
    from: account.address,
    to: opts.to as Address,
    value: BigInt(opts.amountBaseUnits),
    validAfter,
    validBefore,
    nonce,
  };
  const signature = await account.signTypedData(buildTransferAuthorizationTypedData(domain, message));
  return {
    from: account.address,
    to: opts.to as Address,
    value: message.value.toString(),
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce,
    signature,
  };
}

/** Merchant/facilitator submits a signed authorization on-chain (pays gas). Returns the tx hash. */
export async function settleTransferAuthorization(opts: {
  submitterPrivateKey: Hex;
  authorization: TransferAuthorization;
  network?: Network;
}): Promise<Hex> {
  const network = opts.network ?? baseSepolia;
  const account = privateKeyToAccount(opts.submitterPrivateKey);
  const wallet = createWalletClient({ account, chain: viemBaseSepolia, transport: http(network.rpcUrl) });
  const a = opts.authorization;
  return wallet.writeContract({
    address: network.usdcAddress,
    abi: TRANSFER_WITH_AUTH_ABI,
    functionName: "transferWithAuthorization",
    args: [a.from, a.to, BigInt(a.value), BigInt(a.validAfter), BigInt(a.validBefore), a.nonce, a.signature],
  });
}
