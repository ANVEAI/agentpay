import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise, pop } from "../anim";

export const S9_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = 30 + 22 * Math.sin(frame / 9); // pulsing logo glow

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div style={{ ...pop(frame, fps, 0), display: "flex", alignItems: "center", gap: 26 }}>
        <span style={{ color: theme.accent, fontSize: 116, filter: `drop-shadow(0 0 ${glow}px rgba(108,124,255,.9))` }}>
          ◢
        </span>
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 116, letterSpacing: "-0.02em", color: "#fff" }}>
          AgentPay
        </span>
      </div>

      {/* Product Hunt badge (brand-styled; swap for the official embed badge if you like) */}
      <div
        style={{
          ...pop(frame, fps, 12),
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 26px",
          borderRadius: 12,
          background: "rgba(218,85,47,.14)",
          border: "1px solid rgba(218,85,47,.55)",
          color: "#ff8a5c",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ fontSize: 26 }}>▲</span> LAUNCHING ON PRODUCT HUNT
      </div>

      <div
        style={{
          ...rise(frame, 26),
          fontFamily: theme.mono,
          fontSize: 40,
          color: theme.text,
          padding: "16px 30px",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          background: "rgba(108,124,255,.07)",
        }}
      >
        github.com/ANVEAI/agentpay
      </div>

      <div
        style={{
          ...rise(frame, 40),
          fontFamily: display,
          fontWeight: 700,
          fontSize: 42,
          color: "#ffd54a",
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        ★ Star it — built in the open
      </div>
    </AbsoluteFill>
  );
};
