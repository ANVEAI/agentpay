import { getSession } from "@/lib/session";
import { getProjectByApiKey, recordEvent, listEventsByOwner } from "@/lib/cp/store";
import { fireWebhook } from "@/lib/cp/webhook";
import { limited } from "@/lib/cp/ratelimit";

export const runtime = "nodejs";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

// The SDK posts an accepted payment here. recordEvent de-dups by (project, txHash) —
// a duplicate is the durable replay signal the gateway uses to deny reuse.
export async function POST(req: Request) {
  const rl = limited(req, "events-post", 120);
  if (rl) return rl;
  const key = bearer(req);
  if (!key) return Response.json({ error: "missing api key" }, { status: 401 });

  const project = await getProjectByApiKey(key);
  if (!project) return Response.json({ error: "invalid api key" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const { event, duplicate } = await recordEvent({
    projectId: project.id,
    txHash: String(b.txHash ?? ""),
    from: String(b.from ?? ""),
    amount: String(b.amount ?? ""),
    resource: String(b.resource ?? ""),
  });

  if (!duplicate && project.webhookUrl) void fireWebhook(project, event);

  return Response.json({ ok: !duplicate, duplicate, id: event.id });
}

// The dashboard reads recorded payments for the signed-in merchant.
export async function GET() {
  const session = await getSession();
  if (!session.address) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ events: await listEventsByOwner(session.address) });
}
