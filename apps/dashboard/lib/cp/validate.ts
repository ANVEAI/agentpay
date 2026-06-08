import { isAddress } from "viem";

// Input validation for the control-plane API. Return null if valid, else an error string.

export function validateName(name: unknown): string | null {
  const s = String(name ?? "").trim();
  if (!s) return "name is required";
  if (s.length > 80) return "name too long (max 80 chars)";
  return null;
}

export function validateAmount(amount: unknown): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "amount must be a positive number";
  if (n > 1_000_000) return "amount is implausibly large";
  return null;
}

export function validatePayTo(payTo: unknown): string | null {
  if (!isAddress(String(payTo ?? ""))) return "payTo must be a valid EVM address (0x…)";
  return null;
}

export function validateDailyLimit(limit: unknown): string | null {
  if (limit === undefined || limit === null || limit === "") return null; // optional
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 0) return "dailyLimit must be a non-negative number";
  return null;
}
