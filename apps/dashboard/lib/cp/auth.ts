import { getSession } from "@/lib/session";
import { timingSafeEqual } from "node:crypto";

// Two ways to authenticate against the control plane:
//  - a signed-in merchant (SIWE session) → manages their own wallet's projects
//  - an admin bearer token (AGENTPAY_ADMIN_TOKEN) → for CLIs and coding agents
//    provisioning programmatically, with no browser sign-in
export type Auth =
  | { kind: "session"; owner: string }
  | { kind: "admin" }
  | null;

// Constant-time compare so the admin token can't be recovered by response timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function authContext(req: Request): Promise<Auth> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
  const admin = process.env.AGENTPAY_ADMIN_TOKEN;

  if (token && admin && safeEqual(token, admin)) {
    return { kind: "admin" };
  }

  const session = await getSession();
  if (session.address) return { kind: "session", owner: session.address.toLowerCase() };

  return null;
}
