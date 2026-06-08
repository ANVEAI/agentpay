import { describe, it, expect } from "vitest";
import {
  validateName,
  validateAmount,
  validatePayTo,
  validateDailyLimit,
  validateWebhookUrl,
} from "../lib/cp/validate";

const ADDR = "0x2cF32e45fE9266176D0373e17bE8029E6cfcb78D";

describe("control-plane validation", () => {
  it("name: required, length-capped", () => {
    expect(validateName("My API")).toBeNull();
    expect(validateName("  ")).toMatch(/required/);
    expect(validateName("x".repeat(81))).toMatch(/too long/);
  });

  it("amount: positive finite number", () => {
    expect(validateAmount("0.1")).toBeNull();
    expect(validateAmount("0")).toMatch(/positive/);
    expect(validateAmount("-1")).toMatch(/positive/);
    expect(validateAmount("abc")).toMatch(/positive/);
  });

  it("payTo: valid EVM address", () => {
    expect(validatePayTo(ADDR)).toBeNull();
    expect(validatePayTo("0xnope")).toMatch(/valid EVM/);
    expect(validatePayTo("")).toMatch(/valid EVM/);
  });

  it("dailyLimit: optional, non-negative", () => {
    expect(validateDailyLimit(undefined)).toBeNull();
    expect(validateDailyLimit("")).toBeNull();
    expect(validateDailyLimit("10")).toBeNull();
    expect(validateDailyLimit("-5")).toMatch(/non-negative/);
  });

  it("webhookUrl: optional, http(s) only, rejects junk + dangerous schemes", () => {
    expect(validateWebhookUrl(undefined)).toBeNull();
    expect(validateWebhookUrl("")).toBeNull();
    expect(validateWebhookUrl("https://example.com/hook")).toBeNull();
    expect(validateWebhookUrl("javascript:alert(1)")).toMatch(/http/);
    expect(validateWebhookUrl("not a url")).toMatch(/valid URL/);
  });
});
