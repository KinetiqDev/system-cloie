/**
 * Raw Color Palette Allowlist & Audit Definitions
 *
 * Grounded in docs/design.md Section 15 & Issue #252.
 * Defines approved exceptions where raw color values (e.g. hex codes) are legitimate:
 * 1. Brand assets and SVG logos in public/logos/
 * 2. Official asset pixels / static manifests and viewport metadata
 * 3. Documented temporary legacy exceptions in production inventory
 */

export interface RawColorAllowlistEntry {
  /** Relative path or glob pattern */
  pattern: string;
  /** Approved raw hex/RGB values in this file */
  approvedValues: string[];
  /** Justification / reference to docs/design.md */
  reason: string;
}

export const RAW_COLOR_ALLOWLIST: RawColorAllowlistEntry[] = [
  {
    pattern: "public/logos/**",
    approvedValues: ["*"],
    reason: "Official ACD and CLOIE SVG brand logos (docs/design.md section 4.5)",
  },
  {
    pattern: "public/icons/**",
    approvedValues: ["*"],
    reason: "PWA icon graphics and maskables",
  },
  {
    pattern: "src/app/layout.tsx",
    approvedValues: ["#2563EB", "#0B1120"],
    reason: "Theme-neutral root viewport themeColor metadata (docs/design.md section 5)",
  },
  {
    pattern: "src/app/manifest.ts",
    approvedValues: ["#2563EB", "#F8FAFC"],
    reason: "Theme-neutral PWA manifest theme_color and background_color metadata",
  },
  {
    pattern: "src/features/design-system/data/production-surface-inventory.ts",
    approvedValues: ["#0051C3", "#D49900", "#F8FAFC", "#F7F9FC"],
    reason: "Production surface inventory documenting historical gaps and exceptions",
  },
];

/**
 * Checks whether a raw hex color found in a file is approved by the allowlist.
 */
export function isRawColorAllowed(filePath: string, hexColor: string): boolean {
  const normalizedHex = hexColor.toUpperCase();
  for (const entry of RAW_COLOR_ALLOWLIST) {
    const isMatch =
      entry.pattern.endsWith("**")
        ? filePath.startsWith(entry.pattern.slice(0, -2))
        : filePath === entry.pattern;

    if (isMatch) {
      if (entry.approvedValues.includes("*") || entry.approvedValues.includes(normalizedHex)) {
        return true;
      }
    }
  }
  return false;
}
