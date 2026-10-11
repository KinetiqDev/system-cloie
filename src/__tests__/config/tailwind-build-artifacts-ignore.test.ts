/**
 * @vitest-environment node
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Scanner } from "@tailwindcss/oxide";

describe("Next.js build artifact exclusion for Tailwind scanner", () => {
  const rootDir = process.cwd();
  const gitignoreContent = readFileSync(join(rootDir, ".gitignore"), "utf8");

  it("ensures .gitignore ignores .next variant directories (.next-*)", () => {
    // Both standard Next dist-dir and secondary build/smoke dirs must be gitignored
    // to prevent Tailwind v4 from scanning binary SST cache files and extracting corrupt tokens
    const lines = gitignoreContent.split("\n").map((line) => line.trim());
    const hasNextSmokeOrWildcard = lines.some(
      (line) =>
        line === "/.next-*/" || line === "/.next*" || line === ".next-*" || line === "/.next-smoke/"
    );
    expect(hasNextSmokeOrWildcard).toBe(true);
  });

  it("prevents @tailwindcss/oxide Scanner from extracting tokens from .next-* directories", () => {
    const testDir = join(rootDir, ".next-test-cache-probe");
    try {
      mkdirSync(join(testDir, "cache", "turbopack"), { recursive: true });
      // Binary bytes resembling arbitrary-value utility with \u0002 delimiter
      writeFileSync(
        join(testDir, "cache", "turbopack", "00000001.sst"),
        Buffer.from([
          0x70, 0x62, 0x2d, 0x5b, 0x63, 0x61, 0x6c, 0x63, 0x28, 0x30, 0x2e, 0x37, 0x35, 0x72, 0x65,
          0x6d, 0x2b, 0x65, 0x6e, 0x76, 0x28, 0x73, 0x61, 0x66, 0x65, 0x2d, 0x61, 0x72, 0x65, 0x61,
          0x2d, 0x00, 0x02, 0x29, 0x29, 0x5d,
        ])
      );

      const scanner = new Scanner({
        sources: [{ base: rootDir, pattern: "**/*", negated: false }],
      });
      const candidates = scanner.scan();
      const corrupted = candidates.filter((c) => c.includes("safe-area-\x00\x02"));

      expect(corrupted).toEqual([]);
    } finally {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});
