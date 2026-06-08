import { generateNonce } from "siwe";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return new Response(session.nonce, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
