import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    pool: "forks",
    testTimeout: 30_000,
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.opencode/**",
      "**/.claude/**",
      "**/.cursor/**",
      "e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
