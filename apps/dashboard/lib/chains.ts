import { baseSepolia } from "wagmi/chains";

export { baseSepolia };

/** Circle's official USDC on Base Sepolia testnet. */
export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const USDC_DECIMALS = 6;
export const EXPLORER = "https://sepolia.basescan.org";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";
