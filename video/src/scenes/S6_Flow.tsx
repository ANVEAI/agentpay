import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise, pop, growX } from "../anim";
import { useVideoConfig } from "remotion";

// The 200 OK lights at local frame 270 (global 1320 = CHIME_AT) so the chime lands on it.
const Node: React.FC<{
  frame: number;
  fps: number;
  delay: number;
  label: string;
  variant: "plain" | "err" | "pay" | "ok";
}> = ({ frame, fps, delay, label, variant }) => {
  const styles: Record<string, React.CSSProperties> = {
    plain: { color: theme.text, borderColor: theme.border },
    err: { color: "#ffb4b4", borderColor: "rgba(255,107,107,.5)", boxShadow: "0 0 40px -8px rgba(255,107,107,.4)" },
    pay: { color: "#aeb8ff", borderColor: "rgba(108,124,255,.6)", boxShadow: "0 0 44px -6px rgba(108,124,255,.55)" },
    ok: { color: theme.accent2, borderColor: "rgba(0,212,160,.55)", boxShadow: "0 0 48px -6px rgba(0,212,160,.6)" },
  };
  return (
    <div
      style={{
        ...pop(frame, fps, delay),
        fontFamily: theme.mono,
        fontSize: 28,
        padding: "22px 28px",
        borderRadius: 14,
        border: "1px solid",
        background: theme.panel,
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {label}
    </div>
  );
};

const Conn: React.FC<{ frame: number; delay: number }> = ({ frame, delay }) => (
  <div
    style={{
      ...growX(frame, delay, 12),
      width: 64,
      height: 2,
      background: `linear-gradient(90deg, ${theme.border}, ${theme.accent})`,
    }}
  />
);

export const S6_Flow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <div
        style={{
          ...rise(frame, 0),
          fontFamily: display,
          fontWeight: 700,
          fontSize: 80,
          letterSpacing: "-0.02em",
          background: "linear-gradient(180deg,#fff,#b9c0d8)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        402 → pay → 200
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Node frame={frame} fps={fps} delay={20} label="GET /api/premium" variant="plain" />
        <Conn frame={frame} delay={60} />
        <Node frame={frame} fps={fps} delay={90} label="402 Payment Required" variant="err" />
        <Conn frame={frame} delay={150} />
        <Node frame={frame} fps={fps} delay={180} label="pays USDC ◎" variant="pay" />
        <Conn frame={frame} delay={240} />
        <Node frame={frame} fps={fps} delay={270} label="200 OK ✓" variant="ok" />
      </div>
      <div style={{ ...rise(frame, 300), fontSize: 36, color: theme.muted, fontFamily: display }}>
        Non-custodial · over the open x402 standard · gasless on Base
      </div>
    </AbsoluteFill>
  );
};
