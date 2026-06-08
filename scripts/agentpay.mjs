#!/usr/bin/env node
// AgentPay CLI — provision projects, API keys, and paying agents programmatically.
// For coding/developer agents to configure AgentPay with no GUI.
//
//   AGENTPAY_BASE_URL=http://localhost:3000 AGENTPAY_ADMIN_TOKEN=… \
//     node scripts/agentpay.mjs create-project --name "My API" --amount 0.1 --pay-to 0xMerchant
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = process.env.AGENTPAY_BASE_URL || "http://localhost:3000";
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

function needToken() {
  if (!TOKEN) {
    console.error("Set AGENTPAY_ADMIN_TOKEN (and optionally AGENTPAY_BASE_URL).");
    process.exit(1);
  }
}

async function api(path, method, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json" },
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

function out(o) {
  console.log(JSON.stringify(o, null, 2));
}

try {
  switch (cmd) {
    case "gen-wallet": {
      const pk = generatePrivateKey();
      out({ address: privateKeyToAccount(pk).address, privateKey: pk });
      break;
    }
    case "create-project": {
      needToken();
      out(
        await api("/api/cp/projects", "POST", {
          name: args.name || "project",
          amount: args.amount || "0.1",
          payTo: args["pay-to"] || args.payto,
        }),
      );
      break;
    }
    case "list-projects": {
      needToken();
      out(await api("/api/cp/projects", "GET"));
      break;
    }
    case "add-agent": {
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
    }
    case "list-agents": {
      needToken();
      out(await api("/api/cp/agents?projectId=" + (args.project || ""), "GET"));
      break;
    }
    default:
      console.log(`AgentPay CLI

Usage: agentpay <command> [--flags]
Env:   AGENTPAY_ADMIN_TOKEN (required for write ops), AGENTPAY_BASE_URL (default http://localhost:3000)

  gen-wallet                                              generate an agent wallet keypair (local, no server)
  create-project --name N --amount A --pay-to 0x...       create a project, mint an API key
  list-projects
  add-agent --project <id> --label L [--budget 10] [--address 0x...]   register a paying agent (generates a wallet if no --address)
  list-agents --project <id>`);
  }
} catch (e) {
  console.error("error:", e.message);
  process.exit(1);
}
