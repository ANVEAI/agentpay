import { authContext } from "@/lib/cp/auth";
import {
  createAgent,
  listAgentsByProject,
  listAgentsByOwner,
  getProjectById,
  enrichAgentsWithSpend,
} from "@/lib/cp/store";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";

async function authorizeProject(req: Request, projectId: string) {
  const auth = await authContext(req);
  if (!auth) return { error: "unauthorized", status: 401 as const };
  const project = await getProjectById(projectId);
  if (!project) return { error: "project not found", status: 404 as const };
  if (auth.kind === "session" && project.owner !== auth.owner) {
    return { error: "forbidden", status: 403 as const };
  }
  return { project };
}

// Register a paying agent under a project. If no address is given, a wallet is
// generated and its private key is returned ONCE (fund it, then the agent pays).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const projectId = body.projectId ? String(body.projectId) : "";
  if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });

  const gate = await authorizeProject(req, projectId);
  if ("error" in gate) return Response.json({ error: gate.error }, { status: gate.status });

  let address = body.address ? String(body.address) : null;
  let privateKey: string | undefined;
  if (!address) {
    privateKey = generatePrivateKey();
    address = privateKeyToAccount(privateKey).address;
  }

  const agent = await createAgent({
    projectId,
    label: String(body.label ?? "agent"),
    address,
    dailyLimit: body.dailyLimit != null ? String(body.dailyLimit) : "",
  });

  return Response.json({ agent, privateKey });
}

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (projectId) {
    const gate = await authorizeProject(req, projectId);
    if ("error" in gate) return Response.json({ error: gate.error }, { status: gate.status });
    return Response.json({ agents: await enrichAgentsWithSpend(await listAgentsByProject(projectId)) });
  }
  // no projectId: list all of the signed-in merchant's agents (dashboard view)
  const auth = await authContext(req);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (auth.kind === "session") {
    return Response.json({ agents: await enrichAgentsWithSpend(await listAgentsByOwner(auth.owner)) });
  }
  return Response.json({ error: "projectId is required for admin token" }, { status: 400 });
}
