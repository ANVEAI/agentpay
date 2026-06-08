import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise } from "../anim";

export const S8_Statement: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...rise(frame, 0),
          fontFamily: display,
          fontWeight: 700,
          fontSize: 110,
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          textAlign: "center",
          color: "#fff",
        }}
      >
        Stripe for AI agents.
        <br />
        <span style={{ color: theme.accent }}>Open source.</span>
      </div>
    </AbsoluteFill>
  );
};
