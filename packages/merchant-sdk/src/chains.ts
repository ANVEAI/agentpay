import type { Network } from "./types";

/** Base Sepolia testnet with Circle's official testnet USDC. */
export const baseSepolia: Network = {
  name: "base-sepolia",
  chainId: 84532,
  rpcUrl: "https://sepolia.base.org",
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  usdcDecimals: 6,
  explorerUrl: "https://sepolia.basescan.org",
};

export const networks: Record<string, Network> = {
  [baseSepolia.name]: baseSepolia,
};

export function getNetwork(name: string): Network | undefined {
  return networks[name];
}
