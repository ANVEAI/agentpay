import { Composition } from "remotion";
import { Main } from "./Composition";
import { Social } from "./Social";
import { Teaser } from "./Teaser";
import { FPS, WIDTH, HEIGHT, DURATION } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Social" component={Social} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="Teaser" component={Teaser} durationInFrames={450} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
