import "./fonts"; // evaluate font loading before any scene mounts
import { AbsoluteFill, Sequence } from "remotion";
import { theme } from "./theme";
import { body } from "./fonts";
import { SCENES } from "./timeline";
import { Background } from "./Background";
import { AudioLayer } from "./audio/AudioLayer";
import { S1_Hook } from "./scenes/S1_Hook";
import { S2_Problem } from "./scenes/S2_Problem";
import { S3_Solution } from "./scenes/S3_Solution";
import { S4_OneLine } from "./scenes/S4_OneLine";
import { S5_Policy } from "./scenes/S5_Policy";
import { S6_Flow } from "./scenes/S6_Flow";
import { S7_Props } from "./scenes/S7_Props";
import { S8_Statement } from "./scenes/S8_Statement";
import { S9_CTA } from "./scenes/S9_CTA";

const MAP: Record<string, React.FC> = {
  hook: S1_Hook,
  problem: S2_Problem,
  solution: S3_Solution,
  oneLine: S4_OneLine,
  policy: S5_Policy,
  flow: S6_Flow,
  props: S7_Props,
  statement: S8_Statement,
  cta: S9_CTA,
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: theme.bg, fontFamily: body, color: theme.text }}>
    <Background />
    {SCENES.map((s) => {
      const Comp = MAP[s.id];
      return (
        <Sequence key={s.id} from={s.fromF} durationInFrames={s.durF} name={s.id}>
          <Comp />
        </Sequence>
      );
    })}
    <AudioLayer />
  </AbsoluteFill>
);
