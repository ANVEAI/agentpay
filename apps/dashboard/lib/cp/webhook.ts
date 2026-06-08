import crypto from "node:crypto";
import type { Project, PaymentEvent } from "./store";

// Best-effort webhook delivery on a recorded payment. The body is HMAC-signed with the
// project's webhookSecret (header x-agentpay-signature) so the merchant can verify it.
// Retries/queueing are roadmap.
export async function fireWebhook(project: Project, event: PaymentEvent): Promise<void> {
  if (!project.webhookUrl) return;
  const payload = JSON.stringify({
    type: "payment.received",
    projectId: project.id,
    txHash: event.txHash,
    from: event.from,
    amount: event.amount,
    resource: event.resource,
    at: event.at,
  });
  const signature = crypto
    .createHmac("sha256", project.webhookSecret)
    .update(payload)
    .digest("hex");
  try {
    await fetch(project.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-agentpay-signature": signature },
      body: payload,
    });
  } catch {
    // best-effort; do not block the payment response on webhook delivery
  }
}
