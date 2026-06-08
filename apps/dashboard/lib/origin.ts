import { headers } from "next/headers";

// Detect the public origin this instance is served from — works behind proxies
// (x-forwarded-*) so self-hosters get their real URL with no config.
export async function getServerOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}
