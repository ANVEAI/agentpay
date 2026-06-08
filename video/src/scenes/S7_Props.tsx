import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { pop } from "../anim";

const PROPS = [
  "Non-custodial",
  "x402-compatible",
  "USDC on Base",
  "Gasless · EIP-3009",
  "Your keys",
  "Open source",
];

export const S7_Props: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 180px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "22px 24px", justifyContent: "center", maxWidth: 1500 }}>
        {PROPS.map((p, i) => (
          <div
            key={p}
            style={{
              ...pop(frame, fps, i * 5),
              fontFamily: display,
              fontWeight: 500,
              fontSize: 50,
              padding: "20px 36px",
              borderRadius: 999,
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,.02)",
              color: theme.text,
            }}
          >
            <span style={{ color: theme.accent }}>●</span> {p}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
