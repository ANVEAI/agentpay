import "./fonts";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { theme } from "./theme";
import { body } from "./fonts";
import { Background } from "./Background";
import { S1_Hook } from "./scenes/S1_Hook";
import { S3_Solution } from "./scenes/S3_Solution";
import { S9_CTA } from "./scenes/S9_CTA";
import manifest from "./audio-manifest.json";

interface M {
  music: string | null;
  sfx: { stab?: string; chime?: string };
}

// 15s teaser (450f): the hook → the reveal → the CTA, with music + the stab. A scroll-stopper
// for X/LinkedIn that links to the full launch.
export const Teaser: React.FC = () => {
  const m = manifest as M;
  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: body, color: theme.text }}>
      <Background />
      <Sequence from={0} durationInFrames={140} name="hook">
        <S1_Hook />
      </Sequence>
      <Sequence from={140} durationInFrames={120} name="solution">
        <S3_Solution />
      </Sequence>
      <Sequence from={260} durationInFrames={190} name="cta">
        <S9_CTA />
      </Sequence>

      {m.music && <Audio src={staticFile("audio/" + m.music)} loop volume={0.85} />}
      {m.sfx?.stab && (
        <Sequence from={0} durationInFrames={45}>
          <Audio src={staticFile("audio/" + m.sfx.stab)} volume={0.85} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
