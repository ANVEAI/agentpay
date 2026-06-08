"use client";

import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { useEffect, useState } from "react";
import { baseSepolia } from "wagmi/chains";
import { short } from "@/lib/format";

export function Account() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
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

  async function signIn(addr?: string, cid?: number) {
    const useAddr = addr ?? address;
    if (!useAddr) return;
    setBusy(true);
    setError(null);
    try {
      const nonce = await fetch("/api/auth/nonce").then((r) => r.text());
      const message = new SiweMessage({
        domain: window.location.host,
        address: useAddr,
        statement: "Sign in to the AgentPay merchant dashboard.",
        uri: window.location.origin,
        version: "1",
        chainId: cid ?? chainId ?? baseSepolia.id,
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

  // One click: connect the wallet, then sign in — no connect-then-find-a-second-button.
  async function connectAndSignIn() {
    const connector = connectors[0];
    if (!connector) return;
    setError(null);
    try {
      const res = await connectAsync({ connector });
      await signIn(res.accounts[0], res.chainId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(null);
  }

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <button className="btn" disabled={isPending || busy || !connector} onClick={connectAndSignIn}>
        {isPending || busy ? "Connecting…" : "Connect MetaMask"}
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
        <button className="btn" disabled={busy} onClick={() => signIn()}>
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
