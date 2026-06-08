import { SiweMessage } from "siwe";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { limited } from "@/lib/cp/ratelimit";

export async function POST(req: Request) {
  // Throttle to blunt account-takeover / signature brute-force.
  const rl = limited(req, "auth-verify", 15);
  if (rl) return rl;

  const session = await getSession();
  const expectedNonce = session.nonce;
  // Single-use nonce: consume it now, regardless of outcome, so a signature can't be
  // replayed against a fixed nonce.
  session.nonce = undefined;
  await session.save();

  try {
    if (!expectedNonce) {
      return Response.json({ ok: false, error: "no active nonce; request a new one" }, { status: 401 });
    }
    const { message, signature } = await req.json();
    const h = await headers();
    const domain = h.get("x-forwarded-host") ?? h.get("host") ?? undefined;

    const siwe = new SiweMessage(message);
    // Bind the signature to this domain + nonce so it can't be replayed cross-site.
    const result = await siwe.verify({ signature, nonce: expectedNonce, domain });
    if (!result.success) {
      return Response.json({ ok: false, error: "Signature verification failed" }, { status: 401 });
    }

    session.address = result.data.address;
    session.chainId = result.data.chainId;
    await session.save();
    return Response.json({ ok: true, address: session.address });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 401 });
  }
}
