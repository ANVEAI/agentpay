import { createPaymentGateway, type GatewayConfig } from "./gateway";

/**
 * Gate for any Fetch API server (Next.js route handlers, Hono, Bun, Deno).
 * `guard(request)` returns a 402 Response if payment is required/invalid,
 * or null if the request is paid and should proceed.
 */
export function createWebGateway(config: GatewayConfig) {
  const gw = createPaymentGateway(config);
  return {
    async guard(request: Request): Promise<Response | null> {
      const value = request.headers.get(gw.paymentHeader);
      let resource = "/";
      try {
        resource = new URL(request.url).pathname;
      } catch {
        // non-absolute URL; keep default
      }
      const result = await gw.check({ resource, payment: value });
      if (result.paid) return null;
      return Response.json(result.body, { status: 402 });
    },
  };
}
