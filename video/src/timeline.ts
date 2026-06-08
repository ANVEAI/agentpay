// Single source of truth for the whole video: frame rate, dimensions, and every
// scene's start frame + duration. Audio cues (in AudioLayer) key off the SAME numbers,
// so visuals and sound can never drift.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1890; // 63.0s (re-timed so every measured VO line fits its scene)

export interface SceneSpec {
  id: string;
  fromF: number;
  durF: number;
}

// Sums to 1800 frames. Each <Sequence> resets useCurrentFrame() to 0 at its start.
export const SCENES: SceneSpec[] = [
  { id: "hook", fromF: 0, durF: 90 }, // 0-3s (no VO)
  { id: "problem", fromF: 90, durF: 320 }, // VO 9.9s
  { id: "solution", fromF: 410, durF: 150 }, // VO 3.9s
  { id: "oneLine", fromF: 560, durF: 280 }, // VO 7.3s
  { id: "policy", fromF: 840, durF: 280 }, // VO 7.4s
  { id: "flow", fromF: 1120, durF: 360 }, // VO 9.8s
  { id: "props", fromF: 1480, durF: 90 }, // no VO
  { id: "statement", fromF: 1570, durF: 80 }, // no VO
  { id: "cta", fromF: 1650, durF: 240 }, // VO 7.1s
];

export const sceneFrom = (id: string): number => SCENES.find((s) => s.id === id)!.fromF;

// Audio cue frames (global), referenced by AudioLayer + the audio script.
export const SYNTH_STAB_AT = 0;
export const VO_START = 90;
export const CODE_CLICK_AT = 590; // ~1s into the one-line scene (560+30), when the code lands
export const CHIME_AT = 1405; // when the 200 OK node is visibly lit (flow start 1120 + ~285)
export const WHOOSH_AT = SCENES.slice(1).map((s) => s.fromF); // one per scene boundary

// Per-beat VO placement (file -> start frame). Durations are measured by the audio
// script and written into audio-manifest.json. The hook (0-3s) has no VO.
export const VO_PLACEMENT: { file: string; fromF: number }[] = [
  { file: "vo-01-problem.mp3", fromF: 90 },
  { file: "vo-02-solution.mp3", fromF: 410 },
  { file: "vo-03-howA.mp3", fromF: 560 },
  { file: "vo-04-howB.mp3", fromF: 840 },
  { file: "vo-05-flow.mp3", fromF: 1120 },
  { file: "vo-06-cta.mp3", fromF: 1650 },
];
