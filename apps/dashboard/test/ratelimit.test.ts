import { describe, it, expect } from "vitest";
import { rateLimit } from "../lib/cp/ratelimit";

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a retry-after", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("rl-allow", 3, 1000).ok).toBe(true);
    const blocked = rateLimit("rl-allow", 3, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", async () => {
    expect(rateLimit("rl-reset", 1, 40).ok).toBe(true);
    expect(rateLimit("rl-reset", 1, 40).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 55));
    expect(rateLimit("rl-reset", 1, 40).ok).toBe(true);
  });
});
