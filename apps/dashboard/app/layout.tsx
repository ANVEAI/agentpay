import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import "./globals.css";
import { Providers } from "./providers";
import { wagmiConfig } from "@/lib/wagmi";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentPay — Merchant Dashboard",
  description: "Accept AI-agent payments in USDC. x402-compatible, self-hosted.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Hydrate wagmi from the connection cookie so the wallet stays connected across reloads.
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
