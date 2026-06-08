import { generateNonce } from "siwe";
import { getSession } from "@/lib/session";
import { limited } from "@/lib/cp/ratelimit";

export async function GET(req: Request) {
  const rl = limited(req, "auth-nonce", 30);
  if (rl) return rl;

  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return new Response(session.nonce, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
