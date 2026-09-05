import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { discoverDatabaseSuites } from "./scripts/lib/database-suite-discovery";

const toolingIntegrationTests = [
  "src/__tests__/scripts/refresh-fallow-baselines.test.ts",
  "src/__tests__/scripts/fallow-baseline-audit.test.ts",
  "src/__tests__/scripts/fallow-platform-verification.test.ts",
  "src/__tests__/scripts/run-fallow-audit.test.ts",
  "src/__tests__/scripts/run-fallow-reports.test.ts",
];
const runToolingIntegrationTests = process.env.RUN_TOOLING_INTEGRATION_TESTS === "1";

const testExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/.opencode/**",
  "**/.claude/**",
  "**/.cursor/**",
  "e2e/**",
  "playwright-report/**",
  "test-results/**",
];
const databaseIntegrationTests = discoverDatabaseSuites();
const runDatabaseIntegrationTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";
const defaultSuiteExcludes = [
  ...testExclude,
  ...(runDatabaseIntegrationTests ? [] : databaseIntegrationTests),
  ...toolingIntegrationTests,
];
const sharedTestConfig = {
  pool: "forks" as const,
  globals: true,
  testTimeout: 30_000,
  maxWorkers: 4,
  setupFiles: "./vitest.setup.ts",
};

function projectConfig(name: "node" | "dom", environment: "node" | "jsdom") {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      ...sharedTestConfig,
      name,
      environment,
      sequence: { groupOrder: name === "node" ? 0 : 1 },
      include: runToolingIntegrationTests
        ? toolingIntegrationTests
        : name === "node"
          ? ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.{js,jsx}"]
          : ["src/**/*.{test,spec}.tsx", "src/**/*.browser.{test,spec}.ts"],
      exclude: runToolingIntegrationTests
        ? testExclude
        : name === "node"
          ? [...defaultSuiteExcludes, "src/**/*.browser.{test,spec}.ts"]
          : defaultSuiteExcludes,
    },
  };
}

export default defineConfig({
  test: {
    ...sharedTestConfig,
    projects: runToolingIntegrationTests
      ? [projectConfig("node", "node")]
      : [projectConfig("node", "node"), projectConfig("dom", "jsdom")],
  },
});
