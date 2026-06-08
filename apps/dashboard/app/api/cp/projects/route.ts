import { getSession } from "@/lib/session";
import { createProject, listProjectsByOwner } from "@/lib/cp/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session.address) return Response.json({ error: "unauthorized" }, { status: 401 });
  const projects = await listProjectsByOwner(session.address);
  // never return keyHash
  return Response.json({ projects: projects.map(({ keyHash, ...p }) => p) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.address) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { name, amount } = await req.json().catch(() => ({}));
  if (!name || amount == null) {
    return Response.json({ error: "name and amount are required" }, { status: 400 });
  }

  const { project, apiKey } = await createProject({
    owner: session.address,
    name: String(name),
    payTo: session.address, // payments go to the merchant's connected wallet
    amount: String(amount),
    network: "base-sepolia",
  });

  const { keyHash, ...safe } = project;
  // apiKey is returned exactly once, here.
  return Response.json({ project: safe, apiKey });
}
