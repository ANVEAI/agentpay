// Single source of truth for the whole video: frame rate, dimensions, and every
// scene's start frame + duration. Audio cues (in AudioLayer) key off the SAME numbers,
// so visuals and sound can never drift.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1800; // 60.0s

export interface SceneSpec {
  id: string;
  fromF: number;
  durF: number;
}

// Sums to 1800 frames. Each <Sequence> resets useCurrentFrame() to 0 at its start.
export const SCENES: SceneSpec[] = [
  { id: "hook", fromF: 0, durF: 90 }, // 0-3s
  { id: "problem", fromF: 90, durF: 210 }, // 3-10s
  { id: "solution", fromF: 300, durF: 150 }, // 10-15s
  { id: "oneLine", fromF: 450, durF: 300 }, // 15-25s
  { id: "policy", fromF: 750, durF: 300 }, // 25-35s
  { id: "flow", fromF: 1050, durF: 390 }, // 35-48s
  { id: "props", fromF: 1440, durF: 120 }, // 48-52s
  { id: "statement", fromF: 1560, durF: 90 }, // 52-55s
  { id: "cta", fromF: 1650, durF: 150 }, // 55-60s
];

export const sceneFrom = (id: string): number => SCENES.find((s) => s.id === id)!.fromF;

// Audio cue frames (global), referenced by AudioLayer + the audio script.
export const SYNTH_STAB_AT = 0;
export const VO_START = 90;
export const CODE_CLICK_AT = 480; // ~1s into the one-line scene, when the code lands
export const CHIME_AT = 1335; // when the 200 OK node is visibly lit (flow start 1050 + ~285)
export const WHOOSH_AT = SCENES.slice(1).map((s) => s.fromF); // one per scene boundary

// Per-beat VO placement (file -> start frame). Durations are measured by the audio
// script and written into audio-manifest.json. The hook (0-3s) has no VO.
export const VO_PLACEMENT: { file: string; fromF: number }[] = [
  { file: "vo-01-problem.mp3", fromF: 90 },
  { file: "vo-02-solution.mp3", fromF: 300 },
  { file: "vo-03-howA.mp3", fromF: 450 },
  { file: "vo-04-howB.mp3", fromF: 750 },
  { file: "vo-05-flow.mp3", fromF: 1050 },
  { file: "vo-06-cta.mp3", fromF: 1650 },
];
