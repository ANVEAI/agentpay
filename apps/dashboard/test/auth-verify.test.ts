import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock siwe's verify so we can drive the route's nonce/domain/gate logic deterministically.
const { mVerify } = vi.hoisted(() => ({ mVerify: vi.fn() }));
vi.mock("siwe", () => ({ SiweMessage: vi.fn(() => ({ verify: mVerify })) }));
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { POST } from "@/app/api/auth/verify/route";

const mGetSession = vi.mocked(getSession);
const mHeaders = vi.mocked(headers);

function session(nonce?: string) {
  return {
    nonce,
    address: undefined as string | undefined,
    chainId: undefined as number | undefined,
    save: vi.fn(async () => {}),
  };
}
function setHeaders(host = "pay.example.com") {
  mHeaders.mockResolvedValue({ get: (k: string) => (k === "x-forwarded-host" ? host : null) } as never);
}
const req = (body: object) =>
  new Request("http://x/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("SIWE verify route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHeaders();
  });

  it("rejects when there is no active nonce (401)", async () => {
    const s = session(undefined);
    mGetSession.mockResolvedValue(s as never);
    const res = await POST(req({ message: "m", signature: "0xsig" }));
    expect(res.status).toBe(401);
    expect(s.save).toHaveBeenCalled();
  });

  it("burns the nonce BEFORE verifying — single-use even on a bad signature", async () => {
    const s = session("nonce123");
    mGetSession.mockResolvedValue(s as never);
    mVerify.mockResolvedValue({ success: false });
    await POST(req({ message: "m", signature: "0xbad" }));
    expect(s.nonce).toBeUndefined(); // consumed regardless of outcome → no replay
  });

  it("binds the signature to the request domain + the nonce", async () => {
    const s = session("nonce123");
    mGetSession.mockResolvedValue(s as never);
    mVerify.mockResolvedValue({ success: true, data: { address: "0xAbc", chainId: 84532 } });
    await POST(req({ message: "m", signature: "0xsig" }));
    expect(mVerify).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: "nonce123", domain: "pay.example.com" }),
    );
  });

  it("signs in on a valid signature (200) and sets the session address", async () => {
    const s = session("nonce123");
    mGetSession.mockResolvedValue(s as never);
    mVerify.mockResolvedValue({ success: true, data: { address: "0xAbc", chainId: 84532 } });
    const res = await POST(req({ message: "m", signature: "0xsig" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(s.address).toBe("0xAbc");
  });

  it("rejects an invalid signature (401), no sign-in", async () => {
    const s = session("nonce123");
    mGetSession.mockResolvedValue(s as never);
    mVerify.mockResolvedValue({ success: false });
    const res = await POST(req({ message: "m", signature: "0xbad" }));
    expect(res.status).toBe(401);
    expect(s.address).toBeUndefined();
  });
});
