import { getProjectById } from "@/lib/cp/store";
import Script from "next/script";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hosted payment link: a merchant shares /pay/<projectId> and anyone can pay it.
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    return (
      <main className="container">
        <section className="card empty">
          <p>Payment link not found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card pay">
        <div className="label">Pay with AgentPay</div>
        <div className="pay-amount">
          {project.amount} <span className="unit">USDC</span>
        </div>
        <p className="muted">{project.name}</p>
        {createElement("agentpay-button", {
          to: project.payTo,
          amount: project.amount,
          label: `Pay ${project.amount} USDC`,
        })}
        <p className="muted small">
          Base Sepolia · non-custodial · paid straight to the merchant wallet
        </p>
      </section>
      <Script src="/agentpay-button.js" strategy="afterInteractive" />
    </main>
  );
}
