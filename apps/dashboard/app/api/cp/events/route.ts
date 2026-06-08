import { getSession } from "@/lib/session";
import { getProjectByApiKey, recordEvent, listEventsByOwner } from "@/lib/cp/store";

export const runtime = "nodejs";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

// The SDK posts an accepted payment here (managed mode).
export async function POST(req: Request) {
  const key = bearer(req);
  if (!key) return Response.json({ error: "missing api key" }, { status: 401 });

  const project = await getProjectByApiKey(key);
  if (!project) return Response.json({ error: "invalid api key" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const ev = await recordEvent({
    projectId: project.id,
    txHash: String(b.txHash ?? ""),
    from: String(b.from ?? ""),
    amount: String(b.amount ?? ""),
    resource: String(b.resource ?? ""),
  });
  return Response.json({ ok: true, id: ev.id });
}

// The dashboard reads recorded payments for the signed-in merchant.
export async function GET() {
  const session = await getSession();
  if (!session.address) return Response.json({ error: "unauthorized" }, { status: 401 });
  const events = await listEventsByOwner(session.address);
  return Response.json({ events });
}
