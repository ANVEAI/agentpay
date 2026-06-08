import { createWebGateway } from "./web";
import type { GatewayConfig } from "./gateway";

type Handler = (request: Request, context?: unknown) => Response | Promise<Response>;

/**
 * Wrap a Next.js Route Handler so it requires an agent payment.
 *
 *   export const GET = withPayment(
 *     async () => Response.json({ data: "premium" }),
 *     { payTo: "0x…", amount: 0.1 },
 *   );
 */
export function withPayment(handler: Handler, config: GatewayConfig): Handler {
  const gw = createWebGateway(config);
  return async (request: Request, context?: unknown) => {
    const denied = await gw.guard(request);
    if (denied) return denied;
    return handler(request, context);
  };
}
