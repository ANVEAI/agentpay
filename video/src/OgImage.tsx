import "./fonts";
import { AbsoluteFill } from "remotion";
import { theme } from "./theme";
import { body, display } from "./fonts";

// 1200x630 social-share card (og:image). Static — render with `remotion still ... Og`.
export const OgImage: React.FC = () => (
  <AbsoluteFill
    style={{ background: theme.bgGradient, fontFamily: body, color: theme.text, padding: 90, justifyContent: "center" }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(108,124,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(108,124,255,.07) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(700px 460px at 30% 30%,#000 20%,transparent 75%)",
        WebkitMaskImage: "radial-gradient(700px 460px at 30% 30%,#000 20%,transparent 75%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 520,
        height: 520,
        left: -130,
        top: -150,
        borderRadius: "50%",
        background: "rgba(108,124,255,.4)",
        filter: "blur(90px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 460,
        height: 460,
        right: -130,
        bottom: -160,
        borderRadius: "50%",
        background: "rgba(0,212,160,.2)",
        filter: "blur(90px)",
      }}
    />

    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 26 }}>
      <span style={{ color: theme.accent, fontSize: 80, filter: "drop-shadow(0 0 24px rgba(108,124,255,.8))" }}>◢</span>
      <span style={{ fontFamily: display, fontWeight: 700, fontSize: 92, letterSpacing: "-0.02em", color: "#fff" }}>
        AgentPay
      </span>
    </div>

    <div
      style={{
        fontFamily: display,
        fontWeight: 700,
        fontSize: 58,
        letterSpacing: "-0.02em",
        lineHeight: 1.08,
        maxWidth: 920,
        color: theme.text,
      }}
    >
      The drop-in payment rail for <span style={{ color: theme.accent }}>AI agents.</span>
    </div>
    <div style={{ fontSize: 29, color: theme.muted, marginTop: 22 }}>
      x402-compatible · USDC on Base · non-custodial · open source
    </div>

    <div
      style={{
        position: "absolute",
        bottom: 64,
        left: 90,
        fontSize: 24,
        color: theme.muted,
        fontFamily: display,
        fontWeight: 500,
        letterSpacing: "0.12em",
      }}
    >
      A CITERLABS PROJECT
    </div>
    <div
      style={{ position: "absolute", bottom: 64, right: 90, fontFamily: theme.mono, fontSize: 25, color: theme.accent2 }}
    >
      github.com/ANVEAI/agentpay
    </div>
  </AbsoluteFill>
);
