import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { isRawColorAllowed } from "@/features/design-system/data/raw-color-allowlist";

const rootDir = resolve(__dirname, "../../../..");

const readProjectFile = (relativePath: string): string => {
  return readFileSync(resolve(rootDir, relativePath), "utf-8");
};

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
    it("exposes semantic surface, text, border, status, and chart utilities in @theme inline", () => {
      expect(globalsCss).toContain("--color-surface-primary: var(--surface-primary);");
      expect(globalsCss).toContain("--color-surface-secondary: var(--surface-secondary);");
      expect(globalsCss).toContain("--color-surface-hover: var(--surface-hover);");
      expect(globalsCss).toContain("--color-text-primary: var(--text-primary);");
      expect(globalsCss).toContain("--color-text-secondary: var(--text-secondary);");
      expect(globalsCss).toContain("--color-text-muted: var(--text-muted);");
      expect(globalsCss).toContain("--color-border-default: var(--border-default);");
      expect(globalsCss).toContain("--color-status-success-main: var(--status-success-main);");
      expect(globalsCss).toContain("--color-status-danger-main: var(--status-danger-main);");
      expect(globalsCss).toContain("--color-chart-1: var(--chart-1);");
    });

    it("maps shadcn semantic CSS variables to approved design tokens", () => {
      expect(globalsCss).toContain("--background: var(--surface-secondary);");
      expect(globalsCss).toContain("--foreground: var(--text-primary);");
      expect(globalsCss).toContain("--card: var(--surface-primary);");
      expect(globalsCss).toContain("--popover: var(--surface-popover);");
      expect(globalsCss).toContain("--primary: var(--color-primary);");
      expect(globalsCss).toContain("--destructive: var(--status-danger-main);");
      expect(globalsCss).toContain("--border: var(--border-default);");
      expect(globalsCss).toContain("--input: var(--border-default);");
      expect(globalsCss).toContain("--ring: var(--focus-ring);");
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
  });
});
