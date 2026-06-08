import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise, slideIn } from "../anim";

type Kind = "ok" | "no" | "cap";
const tint: Record<Kind, { bg: string; bd: string; fg: string }> = {
  ok: { bg: "rgba(0,212,160,.14)", bd: "rgba(0,212,160,.4)", fg: theme.accent2 },
  no: { bg: "rgba(255,107,107,.14)", bd: "rgba(255,107,107,.4)", fg: theme.danger },
  cap: { bg: "rgba(108,124,255,.14)", bd: "rgba(108,124,255,.4)", fg: "#aeb8ff" },
};

const Row: React.FC<{
  frame: number;
  delay: number;
  kind: Kind;
  icon: string;
  label: string;
  meta: string;
  last?: boolean;
}> = ({ frame, delay, kind, icon, label, meta, last }) => (
  <div
    style={{
      ...slideIn(frame, delay),
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "26px 30px",
      fontSize: 34,
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,.05)",
    }}
  >
    <span
      style={{
        width: 46,
        height: 46,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: 26,
        background: tint[kind].bg,
        border: `1px solid ${tint[kind].bd}`,
        color: tint[kind].fg,
      }}
    >
      {icon}
    </span>
    <b style={{ fontWeight: 600, color: theme.text }}>{label}</b>
    <span style={{ marginLeft: "auto", color: theme.muted, fontFamily: theme.mono, fontSize: 28 }}>{meta}</span>
  </div>
);

export const S5_Policy: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div
        style={{
          ...rise(frame, 0),
          fontFamily: display,
          fontSize: 24,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: theme.accent,
        }}
      >
        you decide what it can pay
      </div>
      <div
        style={{
          width: 1120,
          background: "linear-gradient(180deg,#14161d,#1b1e27)",
          border: `1px solid ${theme.border}`,
          borderRadius: 22,
          padding: 16,
          boxShadow: "0 50px 140px -30px rgba(0,0,0,.6)",
        }}
      >
        <Row frame={frame} delay={8} kind="ok" icon="✓" label="Allowed vendors" meta="api.openai.com" />
        <Row frame={frame} delay={18} kind="no" icon="✕" label="Blocked sites" meta="refused on sight" />
        <Row frame={frame} delay={28} kind="cap" icon="≤" label="Intent caps" meta="data · max 2 USDC" />
        <Row frame={frame} delay={38} kind="cap" icon="◆" label="Authorized models" meta="claude · gpt-5" />
        <Row frame={frame} delay={48} kind="ok" icon="$" label="Daily budget" meta="10 USDC / day" last />
      </div>
    </AbsoluteFill>
  );
};
