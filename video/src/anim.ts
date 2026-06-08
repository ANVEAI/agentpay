import { interpolate, spring, Easing, type SpringConfig } from "remotion";
import type { CSSProperties } from "react";

// Ports of the launch-video.html CSS keyframes to frame-driven styles.
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** .u — fade + rise(34px) + de-blur over `dur` frames, starting at `delay`. */
export function rise(frame: number, delay = 0, dur = 27): CSSProperties {
  const f = frame - delay;
  return {
    opacity: interpolate(f, [0, dur], [0, 1], { ...clamp, easing: EASE }),
    transform: `translateY(${interpolate(f, [0, dur], [34, 0], { ...clamp, easing: EASE })}px)`,
    filter: `blur(${interpolate(f, [0, dur], [6, 0], clamp)}px)`,
  };
}

/** policy rows — fade + slide in from the left. */
export function slideIn(frame: number, delay = 0, dur = 18): CSSProperties {
  const f = frame - delay;
  return {
    opacity: interpolate(f, [0, dur], [0, 1], { ...clamp, easing: EASE }),
    transform: `translateX(${interpolate(f, [0, dur], [-24, 0], { ...clamp, easing: EASE })}px)`,
  };
}

/** .pop — scale 0.82 -> 1 with a spring overshoot. */
export function pop(frame: number, fps: number, delay = 0, config?: Partial<SpringConfig>): CSSProperties {
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 140, mass: 0.8, ...config } });
  return {
    opacity: interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${interpolate(s, [0, 1], [0.82, 1])})`,
  };
}

/** pipeline connectors — scaleX 0 -> 1. */
export function growX(frame: number, delay = 0, dur = 15): CSSProperties {
  const f = frame - delay;
  return {
    opacity: interpolate(f, [0, dur], [0, 1], clamp),
    transform: `scaleX(${interpolate(f, [0, dur], [0, 1], { ...clamp, easing: EASE })})`,
    transformOrigin: "left center",
  };
}

/** A scene-level crossfade: fade in over the first `inF` frames, out over the last `outF`. */
export function sceneFade(frame: number, durF: number, inF = 8, outF = 10): number {
  return Math.min(
    interpolate(frame, [0, inF], [0, 1], clamp),
    interpolate(frame, [durF - outF, durF], [1, 0], clamp),
  );
}
