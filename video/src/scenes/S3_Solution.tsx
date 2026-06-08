import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise, pop } from "../anim";

export const S3_Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div style={{ ...pop(frame, fps, 0), display: "flex", alignItems: "center", gap: 26 }}>
        <span style={{ color: theme.accent, fontSize: 96, filter: "drop-shadow(0 0 30px rgba(108,124,255,.75))" }}>◢</span>
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 104, letterSpacing: "-0.02em", color: "#fff" }}>
          AgentPay
        </span>
      </div>
      <div style={{ ...rise(frame, 24), fontSize: 38, color: theme.muted, fontFamily: display }}>
        The drop-in payment rail for AI agents.
      </div>
    </AbsoluteFill>
  );
};
