import { beforeAll, describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";

type Store = typeof import("../lib/cp/store");
let store: Store;

beforeAll(async () => {
  // Point the file store at a throwaway dir before it loads (DATA_DIR is read at import).
  process.env.AGENTPAY_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "agentpay-cp-"));
  store = await import("../lib/cp/store");
});

describe("control-plane store", () => {
  it("creates a project resolvable by its API key", async () => {
    const { project, apiKey } = await store.createProject({
      owner: "0xOwner",
      name: "T",
      payTo: "0xPay",
      amount: "0.1",
      network: "base-sepolia",
    });
    expect(apiKey).toMatch(/^ap_live_/);
    const found = await store.getProjectByApiKey(apiKey);
    expect(found?.id).toBe(project.id);
    expect(found?.payTo).toBe("0xPay");
  });

  it("de-duplicates payment events by tx hash (durable replay guard)", async () => {
    const { project } = await store.createProject({
      owner: "0xO",
      name: "T2",
      payTo: "0xP",
      amount: "0.1",
      network: "base-sepolia",
    });
    const first = await store.recordEvent({
      projectId: project.id,
      txHash: "0xAA",
      from: "0xa",
      amount: "100000",
      resource: "/x",
    });
    expect(first.duplicate).toBe(false);
    const second = await store.recordEvent({
      projectId: project.id,
      txHash: "0xaa", // same tx, different case
      from: "0xa",
      amount: "100000",
      resource: "/x",
    });
    expect(second.duplicate).toBe(true);
    expect(second.event.id).toBe(first.event.id);
  });

  it("updates, rotates keys, and deletes projects", async () => {
    const { project, apiKey } = await store.createProject({
      owner: "0xO",
      name: "T3",
      payTo: "0xP",
      amount: "0.1",
      network: "base-sepolia",
    });

    await store.updateProject(project.id, { amount: "0.9" });
    expect((await store.getProjectById(project.id))?.amount).toBe("0.9");

    const newKey = await store.rotateProjectKey(project.id);
    expect(newKey).toMatch(/^ap_live_/);
    expect(await store.getProjectByApiKey(apiKey)).toBeNull(); // old key revoked
    expect((await store.getProjectByApiKey(newKey as string))?.id).toBe(project.id);

    expect(await store.deleteProject(project.id)).toBe(true);
    expect(await store.getProjectById(project.id)).toBeNull();
  });
});
