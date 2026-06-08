import { Audio, Sequence, staticFile, interpolate } from "remotion";
import manifest from "../audio-manifest.json";
import { WHOOSH_AT, SYNTH_STAB_AT, CODE_CLICK_AT, CHIME_AT, DURATION } from "../timeline";

interface Manifest {
  music: string | null;
  vo: { file: string; fromF: number; durF: number }[];
  sfx: { stab?: string; whoosh?: string; click?: string; chime?: string };
}

const a = (f: string) => staticFile("audio/" + f);

// Every cue keys off the same frame constants as the visuals (timeline.ts), so audio and
// picture can't drift. Music ducks under the voiceover; the chime lands on the 200-OK frame.
export const AudioLayer: React.FC = () => {
  const m = manifest as Manifest;
  const spans = (m.vo ?? []).map((v) => [v.fromF, v.fromF + v.durF] as const);
  const ducked = (f: number) => spans.some(([s, e]) => f >= s && f < e);

  return (
    <>
      {m.music && (
        <Audio
          src={a(m.music)}
          loop
          volume={(f) =>
            f < 12
              ? interpolate(f, [0, 12], [0, 0.85])
              : f > DURATION - 55
                ? interpolate(f, [DURATION - 55, DURATION], [0.85, 0], { extrapolateRight: "clamp" })
                : ducked(f)
                  ? 0.26
                  : 0.85
          }
        />
      )}

      {(m.vo ?? []).map((v) => (
        <Sequence key={v.file} from={v.fromF} name={`vo:${v.file}`}>
          <Audio src={a(v.file)} volume={1} />
        </Sequence>
      ))}

      {m.sfx?.stab && (
        <Sequence from={SYNTH_STAB_AT} durationInFrames={45} name="sfx:stab">
          <Audio src={a(m.sfx.stab)} volume={0.85} />
        </Sequence>
      )}
      {m.sfx?.click && (
        <Sequence from={CODE_CLICK_AT} durationInFrames={12} name="sfx:click">
          <Audio src={a(m.sfx.click)} volume={0.6} />
        </Sequence>
      )}
      {m.sfx?.chime && (
        <Sequence from={CHIME_AT} durationInFrames={50} name="sfx:chime">
          <Audio src={a(m.sfx.chime)} volume={0.9} />
        </Sequence>
      )}
      {m.sfx?.whoosh &&
        WHOOSH_AT.map((f) => (
          <Sequence key={`w${f}`} from={Math.max(0, f - 4)} durationInFrames={20} name={`sfx:whoosh@${f}`}>
            <Audio src={a(m.sfx!.whoosh!)} volume={0.45} />
          </Sequence>
        ))}
    </>
  );
};
