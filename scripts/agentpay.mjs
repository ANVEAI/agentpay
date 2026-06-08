#!/usr/bin/env node
// AgentPay CLI — provision projects, API keys, and paying agents.
// Interactive: `agentpay init`. Agent prompt: `agentpay prompt`. Or use flags below.
//
// Endpoint (where the CLI/SDK hit the control plane):
//   AGENTPAY_API_URL  (preferred)  e.g. https://pay.you.com  or  http://localhost:3000
//   AGENTPAY_BASE_URL (alias)
// Auth for write ops: AGENTPAY_ADMIN_TOKEN
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENDPOINT =
  process.env.AGENTPAY_API_URL || process.env.AGENTPAY_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.AGENTPAY_ADMIN_TOKEN;
const [cmd, ...rest] = process.argv.slice(2);

function parseArgs(a) {
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : "true";
      o[k] = v;
    }
  }
  return o;
}
const args = parseArgs(rest);

async function api(path, method, body, base = ENDPOINT, token = TOKEN) {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return json;
}

const out = (o) => console.log(JSON.stringify(o, null, 2));
function needToken() {
  if (!TOKEN) {
    console.error("Set AGENTPAY_ADMIN_TOKEN (and AGENTPAY_API_URL).");
    process.exit(1);
  }
}

async function init() {
  if (!stdin.isTTY) {
    console.error(
      "`agentpay init` is interactive — run it in a terminal, or use the flag commands " +
        "(create-project / add-agent) for scripting.",
    );
    process.exit(1);
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ask = async (q, def) => {
    const a = (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim();
    return a || def || "";
  };
  console.log("AgentPay init\n");
  const endpoint = await ask("Control-plane endpoint URL (AGENTPAY_API_URL)", ENDPOINT);
  const token = await ask("Admin token (AGENTPAY_ADMIN_TOKEN)", TOKEN || "");
  if ((await ask("Create a project now? (Y/n)", "Y")).toLowerCase().startsWith("y")) {
    const name = await ask("  Project name", "my-api");
    const amount = await ask("  Price in USDC", "0.1");
    const payTo = await ask("  Receiving wallet (payTo)");
    const r = await api("/api/cp/projects", "POST", { name, amount, payTo }, endpoint, token);
    console.log("\n✓ Project created. API key (save it now):", r.apiKey);
    console.log(`  Integrate:  paymentGateway({ apiKey: "${r.apiKey}", baseUrl: "${endpoint}" })`);
    if ((await ask("\nAdd a paying agent now? (y/N)", "N")).toLowerCase().startsWith("y")) {
      const label = await ask("  Agent label", "agent");
      const budget = await ask("  Daily limit USDC (blank = unlimited)", "");
      const a = await api(
        "/api/cp/agents",
        "POST",
        { projectId: r.project.id, label, dailyLimit: budget || undefined },
        endpoint,
        token,
      );
      console.log("✓ Agent:", a.agent.address, a.privateKey ? `(fund it; key ${a.privateKey})` : "");
    }
  }
  console.log(`\nDone. Set AGENTPAY_API_URL=${endpoint} for the SDK/CLI. See AGENTS.md.`);
  rl.close();
}

function promptCmd() {
  console.log(`Configure AgentPay (agentic payments over x402 / USDC) for me.

Endpoint (control plane): ${ENDPOINT}
Auth: admin bearer token in env AGENTPAY_ADMIN_TOKEN.

1. Create a merchant project:
   POST ${ENDPOINT}/api/cp/projects   Authorization: Bearer $AGENTPAY_ADMIN_TOKEN
   body { "name": "<name>", "amount": "<usdc>", "payTo": "0x<merchant wallet>" }  -> { apiKey }
2. (optional) Register a paying agent:
   POST ${ENDPOINT}/api/cp/agents   body { "projectId": "<id>", "label": "<name>", "dailyLimit": "<usdc>" }
   -> { agent, privateKey }   (fund the wallet on Base Sepolia)
3. Gate the merchant route:
   import { paymentGateway } from "@agentpay/merchant-sdk/express";
   app.use("/api/premium", paymentGateway({ apiKey: "<apiKey>", baseUrl: "${ENDPOINT}" }));
4. Pay autonomously from the agent:
   import { createPaidFetch } from "@agentpay/merchant-sdk/client";
   const fetch = createPaidFetch({ privateKey: process.env.AGENT_KEY });
   await fetch("<merchant url>");

Report the project id, apiKey, and agent address when done.`);
}

try {
  switch (cmd) {
    case "init":
      await init();
      break;
    case "prompt":
      promptCmd();
      break;
    case "gen-wallet": {
      const pk = generatePrivateKey();
      out({ address: privateKeyToAccount(pk).address, privateKey: pk });
      break;
    }
    case "create-project":
      needToken();
      out(
        await api("/api/cp/projects", "POST", {
          name: args.name || "project",
          amount: args.amount || "0.1",
          payTo: args["pay-to"] || args.payto,
        }),
      );
      break;
    case "list-projects":
      needToken();
      out(await api("/api/cp/projects", "GET"));
      break;
    case "add-agent":
      needToken();
      out(
        await api("/api/cp/agents", "POST", {
          projectId: args.project,
          label: args.label || "agent",
          address: args.address,
          dailyLimit: args.budget,
        }),
      );
      break;
    case "list-agents":
      needToken();
      out(await api("/api/cp/agents?projectId=" + (args.project || ""), "GET"));
      break;
    default:
      console.log(`AgentPay CLI

Usage: agentpay <command> [--flags]
Env:   AGENTPAY_API_URL (endpoint, default http://localhost:3000), AGENTPAY_ADMIN_TOKEN

  init                                                    interactive setup (prompts you)
  prompt                                                  print a setup prompt to hand to an AI agent
  gen-wallet                                              generate an agent wallet keypair (local)
  create-project --name N --amount A --pay-to 0x...       create a project, mint an API key
  list-projects
  add-agent --project <id> --label L [--budget 10] [--address 0x...]
  list-agents --project <id>`);
  }
} catch (e) {
  console.error("error:", e.message);
  process.exit(1);
}
