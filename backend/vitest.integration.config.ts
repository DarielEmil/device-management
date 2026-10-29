import { defineConfig } from "vitest/config";

// Tests contra MySQL real (docker compose up -d). Comparten una sola base, así
// que los archivos corren en serie.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
