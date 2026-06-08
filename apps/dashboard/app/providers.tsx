"use client";

import { WagmiProvider, type State } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    // initialState (hydrated from cookies) + reconnectOnMount restore the wallet
    // connection across reloads, so the merchant doesn't reconnect every visit.
    <WagmiProvider config={wagmiConfig} initialState={initialState} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
