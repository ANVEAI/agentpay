import { Config } from "@remotion/cli/config";

// Crisp gradients/text; lower CRF + high jpeg quality are passed on the render CLI.
Config.setVideoImageFormat("jpeg");
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
