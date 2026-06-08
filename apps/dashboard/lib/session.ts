import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionOptions } from "iron-session";

export interface SessionData {
  nonce?: string;
  address?: string;
  chainId?: number;
}

const DEFAULT_DEV_SECRET = "agentpay-dev-only-insecure-session-password-change-me-please";
const secret = process.env.SESSION_SECRET;

// In production, refuse to start with a missing/weak/default secret — otherwise anyone who
// knows the (public, open-source) default could forge a session cookie for any wallet.
if (
  process.env.NODE_ENV === "production" &&
  (!secret || secret === DEFAULT_DEV_SECRET || secret.length < 32)
) {
  throw new Error(
    "SESSION_SECRET must be set to a strong value (>= 32 chars) in production. " +
      "Refusing to start with the insecure default.",
  );
}

// Persist the signed-in session for 30 days so merchants don't re-sign every visit.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const sessionOptions: SessionOptions = {
  password: secret || DEFAULT_DEV_SECRET,
  cookieName: "agentpay_siwe",
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
