import { authContext } from "@/lib/cp/auth";
import { getProjectById, updateProject, rotateProjectKey, deleteProject } from "@/lib/cp/store";
import { validateAmount } from "@/lib/cp/validate";

export const runtime = "nodejs";

async function authorize(req: Request, id: string) {
  const auth = await authContext(req);
  if (!auth) return { error: "unauthorized", status: 401 as const };
  const project = await getProjectById(id);
  if (!project) return { error: "project not found", status: 404 as const };
  if (auth.kind === "session" && project.owner !== auth.owner) {
    return { error: "forbidden", status: 403 as const };
  }
  return { project };
}

type Ctx = { params: Promise<{ id: string }> };

// Edit name/amount/webhookUrl, or rotate the API key with { rotateKey: true }.
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const gate = await authorize(req, id);
  if ("error" in gate) return Response.json({ error: gate.error }, { status: gate.status });

  const b = await req.json().catch(() => ({}));
  if (b.rotateKey) {
    const apiKey = await rotateProjectKey(id);
    return Response.json({ ok: true, apiKey });
  }

  if (b.amount !== undefined) {
    const e = validateAmount(b.amount);
    if (e) return Response.json({ error: e }, { status: 400 });
  }
  const patch: { name?: string; amount?: string; webhookUrl?: string } = {};
  if (b.name !== undefined) patch.name = String(b.name);
  if (b.amount !== undefined) patch.amount = String(b.amount);
  if (b.webhookUrl !== undefined) patch.webhookUrl = String(b.webhookUrl);
  const p = await updateProject(id, patch);
  if (!p) return Response.json({ error: "project not found" }, { status: 404 });
  const { keyHash, webhookSecret, ...safe } = p;
  return Response.json({ ok: true, project: safe });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const gate = await authorize(req, id);
  if ("error" in gate) return Response.json({ error: gate.error }, { status: gate.status });
  await deleteProject(id);
  return Response.json({ ok: true });
}
