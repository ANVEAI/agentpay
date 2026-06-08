import { authContext } from "@/lib/cp/auth";
import { createProject, listProjectsByOwner, listAllProjects, type Project } from "@/lib/cp/store";

export const runtime = "nodejs";

// Never expose the key hash or webhook secret.
function strip(p: Project) {
  const { keyHash, webhookSecret, ...safe } = p;
  return safe;
}

export async function GET(req: Request) {
  const auth = await authContext(req);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  const projects =
    auth.kind === "admin" ? await listAllProjects() : await listProjectsByOwner(auth.owner);
  return Response.json({ projects: projects.map(strip) });
}

export async function POST(req: Request) {
  const auth = await authContext(req);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, amount } = body;
  if (!name || amount == null) {
    return Response.json({ error: "name and amount are required" }, { status: 400 });
  }

  let owner: string;
  let payTo: string;
  if (auth.kind === "session") {
    owner = auth.owner;
    payTo = auth.owner;
  } else {
    if (!body.payTo) {
      return Response.json({ error: "payTo is required for admin-token requests" }, { status: 400 });
    }
    payTo = String(body.payTo);
    owner = String(body.owner ?? body.payTo);
  }

  const { project, apiKey } = await createProject({
    owner,
    name: String(name),
    payTo,
    amount: String(amount),
    network: "base-sepolia",
    webhookUrl: body.webhookUrl ? String(body.webhookUrl) : undefined,
  });

  return Response.json({ project: strip(project), apiKey });
}
