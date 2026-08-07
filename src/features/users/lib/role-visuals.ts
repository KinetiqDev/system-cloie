import { SystemRole } from "@prisma/client";

/** Format `PROGRAM_HEAD` → `"Program Head"` */
export function formatRole(role: SystemRole): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Theme-resolved categorical chip classes for each role, drawn from the
 * chart token family (design.md 5.5 — chart colors are categorical).
 * Text stays on `foreground` so badge labels hold ≥ 4.5:1 contrast in
 * both themes; the hue is carried by the tinted background and border.
 */
const ROLE_BADGE_CLASSES: Record<SystemRole, string> = {
  [SystemRole.SECRETARY]: "border-chart-5/30 bg-chart-5/15 text-foreground",
  [SystemRole.DEAN]: "border-chart-4/30 bg-chart-4/15 text-foreground",
  [SystemRole.PROGRAM_HEAD]: "border-chart-1/30 bg-chart-1/15 text-foreground",
  [SystemRole.FACULTY]: "border-chart-2/30 bg-chart-2/15 text-foreground",
  [SystemRole.STUDENT]: "border-chart-3/30 bg-chart-3/15 text-foreground",
  [SystemRole.ALUMNI]: "border-chart-5/30 bg-chart-5/15 text-foreground",
  [SystemRole.INDUSTRY_PARTNER]: "border-chart-2/30 bg-chart-2/15 text-foreground",
};

export function getRoleBadgeClass(role: SystemRole): string {
  return ROLE_BADGE_CLASSES[role];
}
