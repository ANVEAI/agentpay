import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => store[k.toLowerCase()] ?? null }),
}));

import { getServerOrigin } from "../lib/origin";

describe("getServerOrigin", () => {
  beforeEach(() => {
    store = {};
  });

  it("uses x-forwarded-host + x-forwarded-proto behind a proxy", async () => {
    store = { "x-forwarded-host": "pay.example.com", "x-forwarded-proto": "https" };
    expect(await getServerOrigin()).toBe("https://pay.example.com");
  });

  it("defaults a localhost host to http", async () => {
    store = { host: "localhost:3000" };
    expect(await getServerOrigin()).toBe("http://localhost:3000");
  });

  it("defaults a public host to https", async () => {
    store = { host: "app.example.com" };
    expect(await getServerOrigin()).toBe("https://app.example.com");
  });
});
