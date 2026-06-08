import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise, pop } from "../anim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Node: React.FC<{ label: string; lit?: boolean }> = ({ label, lit }) => (
  <div
    style={{
      fontFamily: theme.mono,
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: lit ? theme.accent2 : theme.muted,
      border: `1px solid ${lit ? "rgba(0,212,160,.5)" : theme.border}`,
      borderRadius: 12,
      padding: "14px 20px",
      background: lit ? "rgba(0,212,160,.08)" : "rgba(255,255,255,.02)",
      boxShadow: lit ? "0 0 40px -8px rgba(0,212,160,.5)" : "none",
      whiteSpace: "nowrap",
    }}
  >
    {lit ? "✓ " : ""}
    {label}
  </div>
);

const Arrow: React.FC<{ on: boolean }> = ({ on }) => (
  <div style={{ color: on ? theme.accent : theme.border, fontSize: 40, fontWeight: 700, transition: "none" }}>→</div>
);

export const S1_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amount = interpolate(frame, [8, 76], [0, 0.42], clamp);
  const paid = frame > 70;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 }}>
      <div
        style={{
          ...rise(frame, 0, 14),
          fontFamily: display,
          fontSize: 22,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: theme.accent2,
        }}
      >
        ● live · base sepolia
      </div>

      <div
        style={{
          ...pop(frame, fps, 2),
          display: "flex",
          alignItems: "center",
          gap: 26,
          background: "linear-gradient(180deg,#14161d,#1b1e27)",
          border: `1px solid ${theme.border}`,
          borderRadius: 24,
          padding: "32px 44px",
          boxShadow: "0 50px 140px -30px rgba(108,124,255,.55)",
        }}
      >
        <Node label="AGENT" />
        <Arrow on={frame > 6} />
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: "#fff",
            minWidth: 380,
            textAlign: "center",
          }}
        >
          ${amount.toFixed(2)} <span style={{ fontSize: 36, color: theme.accent2, fontWeight: 600 }}>USDC</span>
        </div>
        <Arrow on={frame > 60} />
        <Node label="MERCHANT" lit={paid} />
      </div>

      <div
        style={{
          ...rise(frame, 28),
          fontFamily: display,
          fontWeight: 700,
          fontSize: 68,
          letterSpacing: "-0.02em",
          color: theme.text,
          textAlign: "center",
        }}
      >
        Your AI agent just <span style={{ color: theme.accent }}>paid its own bill.</span>
      </div>
    </AbsoluteFill>
  );
};
