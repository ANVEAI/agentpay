import { authContext } from "@/lib/cp/auth";
import { createProject, listProjectsByOwner, listAllProjects, type Project } from "@/lib/cp/store";
import { validateName, validateAmount, validatePayTo } from "@/lib/cp/validate";

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
  const nameErr = validateName(body.name);
  if (nameErr) return Response.json({ error: nameErr }, { status: 400 });
  const amountErr = validateAmount(body.amount);
  if (amountErr) return Response.json({ error: amountErr }, { status: 400 });

  let owner: string;
  let payTo: string;
  if (auth.kind === "session") {
    owner = auth.owner;
    payTo = auth.owner; // a valid address from SIWE
  } else {
    const payErr = validatePayTo(body.payTo);
    if (payErr) return Response.json({ error: payErr }, { status: 400 });
    payTo = String(body.payTo);
    owner = String(body.owner ?? body.payTo);
  }

  const { project, apiKey } = await createProject({
    owner,
    name: String(body.name).trim(),
    payTo,
    amount: String(body.amount),
    network: "base-sepolia",
    webhookUrl: body.webhookUrl ? String(body.webhookUrl) : undefined,
  });

  return Response.json({ project: strip(project), apiKey });
}
