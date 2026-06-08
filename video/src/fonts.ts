// @remotion/google-fonts registers delayRender/continueRender internally, so frames
// don't rasterize until the font is ready (avoids fallback-font frames). Importing this
// module once at the top of Composition.tsx loads both before any scene mounts.
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const body = loadBody("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
