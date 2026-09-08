import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    // Scaffolding and production builds are expensive on the 2-CPU CI runner.
    fileParallelism: false,
    reporters: ["verbose"],
    testTimeout: 7 * 60 * 1000,
  },
});
