// A spend policy the paying agent enforces BEFORE paying any x402 402. This is the
// "spend firewall": exact-vendor allow-list, blocked sites, intent-based per-payment caps,
// and a model allow-list. Pure + deterministic so it's easy to test and reason about.

export interface IntentRule {
  /** What this spend is for, e.g. "data", "compute", "inference". */
  label: string;
  /** Hostname (or suffix) this rule applies to, e.g. "api.vendor.com" or "vendor.com". */
  host: string;
  /** Per-payment cap in USDC for payments matching this intent. */
  maxUsdc: number;
}

export interface SpendPolicy {
  /** Hostnames or payTo addresses the agent may pay. Empty/absent = any (subject to other rules). */
  allowedVendors?: string[];
  /** Hostnames the agent must NEVER pay. Always wins. */
  blockedHosts?: string[];
  /** Intent-based per-payment caps, matched by host. */
  intents?: IntentRule[];
  /** Model ids the agent is authorised to use. Empty = all. Advisory: enforced by the agent, not the payer. */
  allowedModels?: string[];
}

export interface PolicyContext {
  url: string;
  payTo?: string;
  amountUsdc: number;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  intent?: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Pattern matches a host if it's equal, a dot-suffix (vendor.com matches api.vendor.com),
// or appears within it. Case-insensitive.
function hostMatches(host: string, pattern: string): boolean {
  const h = host.toLowerCase();
  const p = (pattern || "").trim().toLowerCase();
  if (!p) return false;
  return h === p || h.endsWith("." + p) || h.includes(p);
}

/** Decide whether the agent may pay this request under the policy. */
export function evaluatePolicy(policy: SpendPolicy, ctx: PolicyContext): PolicyDecision {
  const host = hostOf(ctx.url);
  const payTo = (ctx.payTo ?? "").toLowerCase();

  // 1. Blocklist always wins.
  if ((policy.blockedHosts ?? []).some((h) => hostMatches(host, h))) {
    return { allow: false, reason: `blocked site: ${host || ctx.url}` };
  }

  // 2. Vendor allow-list (if set): the host OR the payTo address must be listed.
  const vendors = policy.allowedVendors ?? [];
  if (vendors.length > 0) {
    const ok = vendors.some((v) => hostMatches(host, v) || v.trim().toLowerCase() === payTo);
    if (!ok) {
      return { allow: false, reason: `vendor not allow-listed: ${host || payTo || ctx.url}` };
    }
  }

  // 3. Intent rules: if any match this host, enforce the tightest cap.
  const matched = (policy.intents ?? []).filter((r) => hostMatches(host, r.host));
  if (matched.length > 0) {
    const rule = matched.reduce((a, b) => (a.maxUsdc <= b.maxUsdc ? a : b));
    if (ctx.amountUsdc > rule.maxUsdc) {
      return {
        allow: false,
        reason: `over '${rule.label}' cap: ${ctx.amountUsdc} > ${rule.maxUsdc} USDC`,
        intent: rule.label,
      };
    }
    return { allow: true, reason: `within '${rule.label}' cap`, intent: rule.label };
  }

  // 4. No matching intent rule: allowed (createPaidFetch's daily limit still applies).
  return { allow: true, reason: "allowed" };
}

/** Is this model authorised? Empty allow-list = all models allowed. */
export function isModelAllowed(policy: SpendPolicy, model: string): boolean {
  const list = policy.allowedModels ?? [];
  if (list.length === 0) return true;
  return list.map((m) => m.trim().toLowerCase()).includes((model || "").trim().toLowerCase());
}
