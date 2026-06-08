import { Composition } from "remotion";
import { Main } from "./Composition";
import { FPS, WIDTH, HEIGHT, DURATION } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {/* Social (9:16) + Teaser (15s) compositions are added once the Main render is verified. */}
  </>
);
