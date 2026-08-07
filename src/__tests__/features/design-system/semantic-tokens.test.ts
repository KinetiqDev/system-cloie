import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import { describe, expect, it } from "vitest";
import { isRawColorAllowed } from "@/features/design-system/data/raw-color-allowlist";

const rootDir = resolve(__dirname, "../../../..");

const readProjectFile = (relativePath: string): string => {
  return readFileSync(resolve(rootDir, relativePath), "utf-8");
};

function getAllSourceFiles(dir: string): string[] {
  const fullDir = resolve(rootDir, dir);
  let results: string[] = [];
  try {
    const list = readdirSync(fullDir);
    for (const file of list) {
      const fullPath = join(fullDir, file);
      const stat = statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllSourceFiles(relative(rootDir, fullPath)));
      } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".css")) {
        results.push(relative(rootDir, fullPath));
      }
    }
  } catch {
    // Directory might not exist in some environments
  }
  return results;
}

function findUnsafePairingLines(source: string): number[] {
  // Non-global: a boolean test() must not retain lastIndex across lines,
  // or a prohibited pairing early in a later line is silently skipped.
  const textPrimaryRegex = /text-primary/;
  const violated: number[] = [];
  source.split("\n").forEach((line, index) => {
    if (!line.includes("bg-primary-soft")) return;
    // text-text-primary is the allowed surface text role; only the bare
    // text-primary utility is unsafe on the soft surface.
    const sanitized = line.replaceAll("text-text-primary", "");
    if (textPrimaryRegex.test(sanitized)) {
      violated.push(index + 1);
    }
  });
  return violated;
}

describe("Design System — Semantic Foundations (Issue #252)", () => {
  const tokensCss = readProjectFile("src/styles/tokens.css");
  const globalsCss = readProjectFile("src/app/globals.css");
  const rootLayout = readProjectFile("src/app/layout.tsx");
  const manifest = readProjectFile("src/app/manifest.ts");
  const publicLayout = readProjectFile("src/app/(public)/layout.tsx");
  const appLayout = readProjectFile("src/app/(app)/layout.tsx");

  describe("tokens.css - Light & Dark Semantic Variable Definitions", () => {
    it("defines approved Light variables in :root", () => {
      // Surface roles
      expect(tokensCss).toContain("--surface-primary: #ffffff");
      expect(tokensCss).toContain("--surface-secondary: #f8fafc");
      expect(tokensCss).toContain("--surface-tertiary: #f1f5f9");
      expect(tokensCss).toContain("--surface-hover: #f1f5f9");
      expect(tokensCss).toContain("--surface-overlay: #ffffff");
      expect(tokensCss).toContain("--surface-input: #ffffff");
      expect(tokensCss).toContain("--surface-popover: #ffffff");

      // Scrim (overlay dimming) — approved Light value (design.md 5.2)
      expect(tokensCss).toContain("--scrim: rgba(15, 23, 42, 0.5)");

      // Text roles
      expect(tokensCss).toContain("--text-primary: #0f172a");
      expect(tokensCss).toContain("--text-secondary: #334155");
      expect(tokensCss).toContain("--text-muted: #64748b");
      expect(tokensCss).toContain("--text-disabled: #94a3b8");

      // Border roles
      expect(tokensCss).toContain("--border-default: #e2e8f0");
      expect(tokensCss).toContain("--border-strong: #cbd5e1");

      // Status roles (Light)
      expect(tokensCss).toContain("--status-success-main: #047857");
      expect(tokensCss).toContain("--status-success-subtle: #ecfdf5");
      expect(tokensCss).toContain("--status-warning-main: #b45309");
      expect(tokensCss).toContain("--status-warning-subtle: #fffbeb");
      expect(tokensCss).toContain("--status-danger-main: #b91c1c");
      expect(tokensCss).toContain("--status-danger-subtle: #fef2f2");
      expect(tokensCss).toContain("--status-info-main: #4f46e5");
      expect(tokensCss).toContain("--status-info-subtle: #eef2ff");

      // Chart roles (Light)
      expect(tokensCss).toContain("--chart-1: #2563eb");
      expect(tokensCss).toContain("--chart-2: #0369a1");
      expect(tokensCss).toContain("--chart-3: #047857");
      expect(tokensCss).toContain("--chart-4: #7c3aed");
      expect(tokensCss).toContain("--chart-5: #c2410c");

      // Selected pair (Light)
      expect(tokensCss).toContain("--selected-bg: #eff6ff");
      expect(tokensCss).toContain("--selected-fg: #1e40af");
    });

    it("defines approved Dark overrides in .dark block", () => {
      expect(tokensCss).toContain(".dark {");

      // Surface roles (Dark)
      expect(tokensCss).toContain("--surface-primary: #111827");
      expect(tokensCss).toContain("--surface-secondary: #0b1120");
      expect(tokensCss).toContain("--surface-tertiary: #172033");
      expect(tokensCss).toContain("--surface-hover: #273449");
      expect(tokensCss).toContain("--surface-overlay: #172033");
      expect(tokensCss).toContain("--surface-input: #0f172a");
      expect(tokensCss).toContain("--surface-popover: #172033");

      // Scrim (overlay dimming) — approved Dark value (design.md 5.2)
      expect(tokensCss).toContain("--scrim: rgba(2, 6, 23, 0.6)");

      // Text roles (Dark)
      expect(tokensCss).toContain("--text-primary: #f8fafc");
      expect(tokensCss).toContain("--text-secondary: #cbd5e1");
      expect(tokensCss).toContain("--text-muted: #94a3b8");
      expect(tokensCss).toContain("--text-disabled: #64748b");

      // Border roles (Dark)
      expect(tokensCss).toContain("--border-default: #334155");
      expect(tokensCss).toContain("--border-strong: #475569");

      // Status roles (Dark)
      expect(tokensCss).toContain("--status-success-main: #34d399");
      expect(tokensCss).toContain("--status-success-subtle: #052e2b");
      expect(tokensCss).toContain("--status-warning-main: #fbbf24");
      expect(tokensCss).toContain("--status-warning-subtle: #451a03");
      expect(tokensCss).toContain("--status-danger-main: #f87171");
      expect(tokensCss).toContain("--status-danger-subtle: #450a0a");
      expect(tokensCss).toContain("--status-info-main: #a5b4fc");
      expect(tokensCss).toContain("--status-info-subtle: #1e1b4b");

      // Chart roles (Dark)
      expect(tokensCss).toContain("--chart-1: #60a5fa");
      expect(tokensCss).toContain("--chart-2: #22d3ee");
      expect(tokensCss).toContain("--chart-3: #34d399");
      expect(tokensCss).toContain("--chart-4: #a78bfa");
      expect(tokensCss).toContain("--chart-5: #fb923c");

      // Primary soft (selected surface) — regression for the dark active
      // tab treatment introduced in issue #254.
      expect(tokensCss).toContain("--color-primary-soft: #172554");
      expect(tokensCss).toContain("--primary-soft: #172554");

      // Selected pair must resolve to a contrast-safe foreground in dark.
      expect(tokensCss).toContain("--selected-bg: #172554");
      expect(tokensCss).toContain("--selected-fg: #bfdbfe");
    });

    it("does not contain legacy gold or unapproved hardcoded primary color", () => {
      expect(tokensCss.toLowerCase()).not.toContain("#d49900");
      expect(tokensCss.toLowerCase()).not.toContain("#b88200");
      expect(tokensCss.toLowerCase()).not.toContain("#fff4d6");
      expect(tokensCss.toLowerCase()).not.toContain("#2f2200");
      expect(tokensCss.toLowerCase()).not.toContain("#0051c3");
    });
  });

  describe("globals.css - Tailwind Theme & Semantic Bridge", () => {
    it("configures @custom-variant dark to match .dark class selector", () => {
      expect(globalsCss).toContain("@custom-variant dark (&:is(.dark *));");
    });

    it("exposes semantic surface, text, border, status, and chart utilities in @theme inline", () => {
      expect(globalsCss).toContain("--color-surface-primary: var(--surface-primary);");
      expect(globalsCss).toContain("--color-surface-secondary: var(--surface-secondary);");
      expect(globalsCss).toContain("--color-surface-hover: var(--surface-hover);");
      expect(globalsCss).toContain("--color-scrim: var(--scrim);");
      expect(globalsCss).toContain("--color-text-primary: var(--text-primary);");
      expect(globalsCss).toContain("--color-text-secondary: var(--text-secondary);");
      expect(globalsCss).toContain("--color-text-muted: var(--text-muted);");
      expect(globalsCss).toContain("--color-selected-bg: var(--selected-bg);");
      expect(globalsCss).toContain("--color-selected-fg: var(--selected-fg);");
      expect(globalsCss).toContain("--color-border-default: var(--border-default);");
      expect(globalsCss).toContain("--color-status-success-main: var(--status-success-main);");
      expect(globalsCss).toContain("--color-status-danger-main: var(--status-danger-main);");
      expect(globalsCss).toContain("--color-chart-1: var(--chart-1);");
    });

    it("maps shadcn semantic CSS variables to approved design tokens without self-referential cycles", () => {
      expect(globalsCss).toContain("--background: var(--surface-secondary);");
      expect(globalsCss).toContain("--foreground: var(--text-primary);");
      expect(globalsCss).toContain("--card: var(--surface-primary);");
      expect(globalsCss).toContain("--popover: var(--surface-popover);");
      expect(globalsCss).toContain("--primary: var(--color-primary);");
      expect(globalsCss).toContain("--destructive: var(--status-danger-main);");
      expect(globalsCss).toContain("--border: var(--border-default);");
      expect(globalsCss).toContain("--input: var(--border-default);");
      expect(globalsCss).toContain("--ring: var(--focus-ring);");

      // Verify no self-referential cyclic chart redeclarations in :root
      expect(globalsCss).not.toContain("--chart-1: var(--chart-1);");
      expect(globalsCss).not.toContain("--chart-2: var(--chart-2);");
      expect(globalsCss).not.toContain("--chart-3: var(--chart-3);");
      expect(globalsCss).not.toContain("--chart-4: var(--chart-4);");
      expect(globalsCss).not.toContain("--chart-5: var(--chart-5);");
    });
  });

  describe("Metadata & Public Shell Parity", () => {
    it("root layout metadata uses theme-neutral themeColor instead of hardcoded #0051C3", () => {
      expect(rootLayout.toLowerCase()).not.toContain("#0051c3");
    });

    it("manifest uses semantic token colors instead of legacy gold / #0051C3", () => {
      expect(manifest.toLowerCase()).not.toContain("#0051c3");
      expect(manifest.toLowerCase()).not.toContain("#f7f9fc");
    });

    it("public shell layout uses semantic Tailwind classes for Light/Dark legibility", () => {
      expect(publicLayout).not.toContain("bg-[#f8fafc]");
      expect(publicLayout).not.toContain("text-[#64748b]");
      expect(publicLayout).toContain("bg-background");
      expect(publicLayout).toContain("text-muted-foreground");
    });

    it("authenticated app layout remains untouched and preserves dynamic loading boundary", () => {
      expect(appLayout).toContain('export const dynamic = "force-dynamic";');
      expect(appLayout).toContain("AuthenticatedAppShell");
    });
  });

  describe("Raw Color Palette Allowlist & Audit Strategy", () => {
    it("allows approved assets and brand logo paths", () => {
      expect(isRawColorAllowed("public/logos/acd-seal.svg", "#221D60")).toBe(true);
      expect(isRawColorAllowed("public/icons/icon-192.png", "#2563EB")).toBe(true);
    });

    it("flags unapproved raw hex colors outside allowlist as violations", () => {
      expect(isRawColorAllowed("src/app/layout.tsx", "#0051C3")).toBe(false);
      expect(isRawColorAllowed("src/app/(public)/layout.tsx", "#F8FAFC")).toBe(false);
      expect(isRawColorAllowed("src/components/ui/button.tsx", "#D49900")).toBe(false);
    });

    it("audits foundation modified files for un-allowlisted raw hex colors", () => {
      const filesToAudit = [
        "src/app/layout.tsx",
        "src/app/manifest.ts",
        "src/app/(public)/layout.tsx",
      ];

      const violations: { file: string; color: string }[] = [];
      const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

      for (const file of filesToAudit) {
        const content = readProjectFile(file);
        const matches = content.match(hexRegex) || [];
        for (const hex of matches) {
          if (!isRawColorAllowed(file, hex)) {
            violations.push({ file, color: hex });
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it("traverses source files and asserts no unapproved raw hex colors exist in foundation files", () => {
      const sourceFiles = getAllSourceFiles("src/app");
      const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
      const unapproved: { file: string; color: string }[] = [];

      for (const file of sourceFiles) {
        if (file === "src/app/layout.tsx" || file === "src/app/manifest.ts" || file === "src/app/(public)/layout.tsx") {
          const content = readProjectFile(file);
          const matches = content.match(hexRegex) || [];
          for (const hex of matches) {
            if (!isRawColorAllowed(file, hex)) {
              unapproved.push({ file, color: hex });
            }
          }
        }
      }

      expect(unapproved).toEqual([]);
    });
  });

  describe("Contrast-Safe Selected Surface Pairing", () => {
    it("flags every prohibited pairing line, not only the first match", () => {
      const source = [
        'className="bg-primary-soft text-primary"',
        'className="bg-primary-soft text-primary"',
      ].join("\n");

      expect(findUnsafePairingLines(source)).toEqual([1, 2]);
    });

    it("allows the surface text role on lines that also contain bg-primary-soft", () => {
      const source = 'className="bg-primary-soft text-text-primary hover:text-text-primary"';

      expect(findUnsafePairingLines(source)).toEqual([]);
    });

    it("never pairs content-bearing primary-soft surfaces with text-primary", () => {
      const filesToScan = ["src/app", "src/components", "src/features"];
      const violated: string[] = [];

      for (const dir of filesToScan) {
        const files = getAllSourceFiles(dir).filter(
          (f) => f.endsWith(".ts") || f.endsWith(".tsx")
        );
        for (const file of files) {
          if (file.includes(".test.") || file.includes(".spec.")) continue;
          for (const lineNumber of findUnsafePairingLines(readProjectFile(file))) {
            violated.push(`${file}:${lineNumber}`);
          }
        }
      }

      expect(violated).toEqual([]);
    });
  });
});
