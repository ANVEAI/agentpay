import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "./theme";

// Always-on layer (not inside a Sequence), so it animates off the GLOBAL frame for the
// whole 60s: a drifting grid + two slowly floating glow blobs over the radial gradient.
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const shift = (f / 24) % 64;
  return (
    <AbsoluteFill style={{ background: theme.bgGradient }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(108,124,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(108,124,255,.06) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
          backgroundPosition: `${shift}px ${shift}px`,
          maskImage: "radial-gradient(900px 600px at 50% 40%,#000 30%,transparent 78%)",
          WebkitMaskImage: "radial-gradient(900px 600px at 50% 40%,#000 30%,transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          left: -160,
          top: -160,
          borderRadius: "50%",
          background: "rgba(108,124,255,.4)",
          filter: "blur(80px)",
          transform: `translate(${60 * Math.sin(f / 70)}px,${45 * Math.cos(f / 70)}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -120,
          bottom: -140,
          borderRadius: "50%",
          background: "rgba(0,212,160,.22)",
          filter: "blur(80px)",
          transform: `translate(${-55 * Math.sin(f / 85)}px,${-40 * Math.cos(f / 85)}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
