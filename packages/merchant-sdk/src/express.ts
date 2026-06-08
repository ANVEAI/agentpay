import { createPaymentGateway, type GatewayConfig } from "./gateway";

// Structural types so the SDK never depends on express itself.
interface ReqLike {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  originalUrl?: string;
  [k: string]: unknown;
}
interface ResLike {
  status(code: number): ResLike;
  json(body: unknown): unknown;
  [k: string]: unknown;
}
type NextLike = (err?: unknown) => void;

/**
 * Express / Connect middleware. Gates a route behind an agent payment.
 *
 *   app.use("/api/premium", paymentGateway({ payTo: "0x…", amount: 0.5 }));
 *
 * On success the verified payment is attached as `req.agentpay`.
 */
export function paymentGateway(config: GatewayConfig) {
  const gw = createPaymentGateway(config);
  return async function agentpayMiddleware(req: ReqLike, res: ResLike, next: NextLike) {
    try {
      const raw = req.headers[gw.paymentHeader];
      const value = Array.isArray(raw) ? raw[0] : raw;
      const result = await gw.check({
        resource: (req.originalUrl as string) ?? (req.url as string),
        payment: value ?? null,
      });
      if (result.paid) {
        (req as Record<string, unknown>).agentpay = result.payment;
        return next();
      }
      res.status(402).json(result.body);
    } catch (e) {
      next(e);
    }
  };
}
