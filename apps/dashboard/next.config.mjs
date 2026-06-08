import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-host: emit a standalone server so the Docker image stays small.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // wagmi's metaMask/walletConnect connectors reference optional deps we don't use
  // (React Native storage, pino-pretty). Mark them external to silence build warnings.
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
