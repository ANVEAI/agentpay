import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/express.ts", "src/web.ts", "src/next.ts", "src/client.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
