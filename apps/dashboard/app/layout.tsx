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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://agentpay.citerlabs.com";
const TITLE = "AgentPay — Accept AI-agent payments in USDC";
const DESCRIPTION =
  "The drop-in payment rail for AI agents. x402-compatible, USDC, non-custodial, open source. A Citerlabs project.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "AgentPay",
  authors: [{ name: "Citerlabs", url: "https://citerlabs.com" }],
  creator: "Citerlabs",
  publisher: "Citerlabs",
  keywords: ["AI agents", "agent payments", "x402", "USDC", "Base", "payment rail", "Citerlabs"],
  openGraph: {
    type: "website",
    siteName: "AgentPay",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AgentPay — the payment rail for AI agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport = {
  themeColor: "#0a0b0f",
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
