import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise } from "../anim";

const Bad: React.FC<{ frame: number; delay: number; children: React.ReactNode }> = ({ frame, delay, children }) => (
  <div
    style={{
      ...rise(frame, delay),
      display: "flex",
      alignItems: "center",
      gap: 18,
      fontFamily: display,
      fontWeight: 500,
      fontSize: 46,
      color: theme.text,
    }}
  >
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,107,107,.14)",
        border: "1px solid rgba(255,107,107,.4)",
        color: theme.danger,
        fontWeight: 700,
        fontSize: 26,
      }}
    >
      ✕
    </span>
    {children}
  </div>
);

export const S2_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div
        style={{
          ...rise(frame, 0),
          fontFamily: display,
          fontWeight: 700,
          fontSize: 60,
          letterSpacing: "-0.02em",
          color: theme.muted,
          marginBottom: 14,
        }}
      >
        But agents can't spend money safely.
      </div>
      <Bad frame={frame} delay={18}>Blocked at the paywall</Bad>
      <Bad frame={frame} delay={34}>Shared cards &amp; manual reviews</Bad>
      <Bad frame={frame} delay={50}>You&apos;re on the hook for the bill</Bad>
    </AbsoluteFill>
  );
};
