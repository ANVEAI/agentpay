import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return Response.json({
    address: session.address ?? null,
    chainId: session.chainId ?? null,
  });
}
