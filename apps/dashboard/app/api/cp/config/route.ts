import { getProjectByApiKey } from "@/lib/cp/store";
import { limited } from "@/lib/cp/ratelimit";

export const runtime = "nodejs";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

// The SDK (paymentGateway({ apiKey })) calls this to resolve a project's config.
export async function GET(req: Request) {
  const rl = limited(req, "config", 120);
  if (rl) return rl;
  const key = bearer(req);
  if (!key) return Response.json({ error: "missing api key" }, { status: 401 });

  const project = await getProjectByApiKey(key);
  if (!project) return Response.json({ error: "invalid api key" }, { status: 401 });

  return Response.json({
    projectId: project.id,
    payTo: project.payTo,
    amount: project.amount,
    amountFormatted: project.amount,
    network: project.network,
    description: project.name,
  });
}
