"use client";

import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { useEffect, useState } from "react";
import { baseSepolia } from "wagmi/chains";
import { short } from "@/lib/format";

export function Account() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [authed, setAuthed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAuthed(d.address))
      .catch(() => {});
  }, []);

  async function signIn() {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const nonce = await fetch("/api/auth/nonce").then((r) => r.text());
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to the AgentPay merchant dashboard.",
        uri: window.location.origin,
        version: "1",
        chainId: chainId ?? baseSepolia.id,
        nonce,
      }).prepareMessage();

      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      }).then((r) => r.json());

      if (res.ok) setAuthed(res.address);
      else setError(res.error || "Sign-in failed");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(null);
  }

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <button
        className="btn"
        disabled={isPending || !connector}
        onClick={() => connector && connect({ connector })}
      >
        {isPending ? "Connecting…" : "Connect MetaMask"}
      </button>
    );
  }

  const isAuthed = !!authed && !!address && authed.toLowerCase() === address.toLowerCase();

  return (
    <div className="account">
      <span className="addr" title={address}>
        {short(address)}
      </span>
      {isAuthed ? (
        <>
          <span className="badge ok">signed in</span>
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </>
      ) : (
        <button className="btn" disabled={busy} onClick={signIn}>
          {busy ? "Check MetaMask…" : "Sign in with Ethereum"}
        </button>
      )}
      <button className="btn ghost" onClick={() => disconnect()}>
        Disconnect
      </button>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
