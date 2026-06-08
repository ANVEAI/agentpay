import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// File-backed store for the MVP control plane. Works self-hosted (mount a volume
// at AGENTPAY_DATA_DIR) and for single-node cloud. Swap for Postgres at scale.
const DATA_DIR = process.env.AGENTPAY_DATA_DIR ?? path.join(process.cwd(), ".agentpay-data");
const DB_FILE = path.join(DATA_DIR, "cp.json");

export interface Project {
  id: string;
  owner: string; // wallet that manages it (lowercased)
  name: string;
  payTo: string;
  amount: string; // USDC, human units
  network: string;
  keyHash: string;
  keyPrefix: string;
  createdAt: string;
}

export interface PaymentEvent {
  id: string;
  projectId: string;
  txHash: string;
  from: string;
  amount: string; // base units as reported by the gateway
  resource: string;
  at: string;
}

export interface Agent {
  id: string;
  projectId: string;
  label: string;
  address: string;
  dailyLimit: string; // USDC human units, "" = unlimited
  createdAt: string;
}

interface DB {
  projects: Project[];
  events: PaymentEvent[];
  agents: Agent[];
}

let writeChain: Promise<unknown> = Promise.resolve();

async function read(): Promise<DB> {
  try {
    const db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Partial<DB>;
    return { projects: db.projects ?? [], events: db.events ?? [], agents: db.agents ?? [] };
  } catch {
    return { projects: [], events: [], agents: [] };
  }
}

async function write(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

function mutate<T>(fn: (db: DB) => { db: DB; result: T }): Promise<T> {
  const run = writeChain.then(async () => {
    const db = await read();
    const { db: next, result } = fn(db);
    await write(next);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export const hashKey = (key: string) => crypto.createHash("sha256").update(key).digest("hex");
export const genApiKey = () => `ap_live_${crypto.randomBytes(24).toString("hex")}`;

export async function createProject(input: {
  owner: string;
  name: string;
  payTo: string;
  amount: string;
  network: string;
}): Promise<{ project: Project; apiKey: string }> {
  const apiKey = genApiKey();
  const project: Project = {
    id: crypto.randomUUID(),
    owner: input.owner.toLowerCase(),
    name: input.name,
    payTo: input.payTo,
    amount: input.amount,
    network: input.network,
    keyHash: hashKey(apiKey),
    keyPrefix: apiKey.slice(0, 12),
    createdAt: new Date().toISOString(),
  };
  await mutate((db) => {
    db.projects.push(project);
    return { db, result: project };
  });
  return { project, apiKey };
}

export async function listProjectsByOwner(owner: string): Promise<Project[]> {
  const db = await read();
  return db.projects.filter((p) => p.owner === owner.toLowerCase());
}

export async function listAllProjects(): Promise<Project[]> {
  return (await read()).projects;
}

export async function getProjectById(id: string): Promise<Project | null> {
  return (await read()).projects.find((p) => p.id === id) ?? null;
}

export async function getProjectByApiKey(apiKey: string): Promise<Project | null> {
  const h = hashKey(apiKey);
  const db = await read();
  return db.projects.find((p) => p.keyHash === h) ?? null;
}

export async function recordEvent(input: Omit<PaymentEvent, "id" | "at">): Promise<PaymentEvent> {
  const ev: PaymentEvent = { id: crypto.randomUUID(), at: new Date().toISOString(), ...input };
  await mutate((db) => {
    db.events.push(ev);
    return { db, result: ev };
  });
  return ev;
}

export async function listEventsByOwner(owner: string): Promise<PaymentEvent[]> {
  const db = await read();
  const ids = new Set(
    db.projects.filter((p) => p.owner === owner.toLowerCase()).map((p) => p.id),
  );
  return db.events.filter((e) => ids.has(e.projectId)).reverse();
}

export async function createAgent(input: {
  projectId: string;
  label: string;
  address: string;
  dailyLimit: string;
}): Promise<Agent> {
  const agent: Agent = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    label: input.label,
    address: input.address,
    dailyLimit: input.dailyLimit,
    createdAt: new Date().toISOString(),
  };
  await mutate((db) => {
    db.agents.push(agent);
    return { db, result: agent };
  });
  return agent;
}

export async function listAgentsByProject(projectId: string): Promise<Agent[]> {
  return (await read()).agents.filter((a) => a.projectId === projectId);
}

export async function listAgentsByOwner(owner: string): Promise<Agent[]> {
  const db = await read();
  const ids = new Set(
    db.projects.filter((p) => p.owner === owner.toLowerCase()).map((p) => p.id),
  );
  return db.agents.filter((a) => ids.has(a.projectId));
}
