import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth + the store so we can drive the route handlers directly and assert the
// authorization gate (the IDOR protection) without a real DB or session.
vi.mock("@/lib/cp/auth", () => ({ authContext: vi.fn() }));
vi.mock("@/lib/cp/store", () => ({
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  rotateProjectKey: vi.fn(),
  deleteProject: vi.fn(),
  createAgent: vi.fn(),
  listAgentsByProject: vi.fn(),
  listAgentsByOwner: vi.fn(),
  enrichAgentsWithSpend: vi.fn(async (a: unknown) => a),
}));

import { authContext } from "@/lib/cp/auth";
import { getProjectById, updateProject, deleteProject, createAgent } from "@/lib/cp/store";
import { PATCH, DELETE } from "@/app/api/cp/projects/[id]/route";
import { POST as AGENTS_POST } from "@/app/api/cp/agents/route";

const mAuth = vi.mocked(authContext);
const mGet = vi.mocked(getProjectById);
const mUpdate = vi.mocked(updateProject);
const mDelete = vi.mocked(deleteProject);
const mCreate = vi.mocked(createAgent);

const A = "0xaaaa000000000000000000000000000000000000";
const B = "0xbbbb000000000000000000000000000000000000";
const project = (owner: string) =>
  ({
    id: "p1",
    owner,
    name: "P",
    payTo: owner,
    amount: "0.1",
    network: "base-sepolia",
    keyHash: "secret-hash",
    keyPrefix: "ap_live_x",
    webhookUrl: "",
    webhookSecret: "secret-whsec",
    createdAt: "t",
  }) as never;

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const patchReq = (body: object) =>
  new Request("http://x/api/cp/projects/p1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("control-plane route authorization (IDOR)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH: rejects an unauthenticated caller (401)", async () => {
    mAuth.mockResolvedValue(null);
    expect((await PATCH(patchReq({ amount: "0.5" }), ctx("p1"))).status).toBe(401);
  });

  it("PATCH another owner's project: forbidden (403), never mutates", async () => {
    mAuth.mockResolvedValue({ kind: "session", owner: A });
    mGet.mockResolvedValue(project(B)); // owned by someone else
    const res = await PATCH(patchReq({ amount: "0.5" }), ctx("p1"));
    expect(res.status).toBe(403);
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it("PATCH own project: allowed, and the response strips keyHash + webhookSecret", async () => {
    mAuth.mockResolvedValue({ kind: "session", owner: A });
    mGet.mockResolvedValue(project(A));
    mUpdate.mockResolvedValue(project(A));
    const res = await PATCH(patchReq({ amount: "0.5" }), ctx("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.keyHash).toBeUndefined();
    expect(body.project.webhookSecret).toBeUndefined();
  });

  it("PATCH as admin: allowed on any project", async () => {
    mAuth.mockResolvedValue({ kind: "admin" });
    mGet.mockResolvedValue(project(B));
    mUpdate.mockResolvedValue(project(B));
    expect((await PATCH(patchReq({ amount: "0.5" }), ctx("p1"))).status).toBe(200);
  });

  it("PATCH a missing project: 404", async () => {
    mAuth.mockResolvedValue({ kind: "session", owner: A });
    mGet.mockResolvedValue(null);
    expect((await PATCH(patchReq({ amount: "0.5" }), ctx("p1"))).status).toBe(404);
  });

  it("DELETE another owner's project: forbidden (403), never deletes", async () => {
    mAuth.mockResolvedValue({ kind: "session", owner: A });
    mGet.mockResolvedValue(project(B));
    const res = await DELETE(new Request("http://x", { method: "DELETE" }), ctx("p1"));
    expect(res.status).toBe(403);
    expect(mDelete).not.toHaveBeenCalled();
  });

  it("agents POST under another owner's project: forbidden (403), no agent created", async () => {
    mAuth.mockResolvedValue({ kind: "session", owner: A });
    mGet.mockResolvedValue(project(B));
    const req = new Request("http://x/api/cp/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "p1", label: "bot" }),
    });
    const res = await AGENTS_POST(req);
    expect(res.status).toBe(403);
    expect(mCreate).not.toHaveBeenCalled();
  });
});
