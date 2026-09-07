import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/tests/**/*.test.ts"],
    globalSetup: ["./server/tests/global-setup.ts"],
    // All test files share one database, so run files serially for determinism.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
