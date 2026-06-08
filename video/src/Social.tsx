import "./fonts";
import { AbsoluteFill } from "remotion";
import { theme } from "./theme";
import { body, display } from "./fonts";
import { Background } from "./Background";
import { SceneBand } from "./Composition";
import { AudioLayer } from "./audio/AudioLayer";

// 9:16 social cut: the 16:9 scene band scaled to fill the width, centered, with a brand
// header + handle filling the vertical space. Reuses the same scenes + audio as the master.
export const Social: React.FC = () => {
  const scale = 1080 / 1920; // 0.5625 -> band renders 1080 x 607.5
  const top = (1920 - 1080 * scale) / 2;
  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: body, color: theme.text }}>
      <Background />

      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ color: theme.accent, fontSize: 58, filter: "drop-shadow(0 0 22px rgba(108,124,255,.7))" }}>◢</span>
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 62, color: "#fff" }}>AgentPay</span>
      </div>

      <div style={{ position: "absolute", top, left: 0, width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <SceneBand />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 170,
          width: "100%",
          textAlign: "center",
          fontFamily: theme.mono,
          fontSize: 42,
          color: theme.muted,
        }}
      >
        github.com/ANVEAI/agentpay
      </div>

      <AudioLayer />
    </AbsoluteFill>
  );
};
