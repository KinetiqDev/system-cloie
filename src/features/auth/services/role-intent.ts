import type { SystemRole } from "@prisma/client";

export const ROLE_INTENTS = {
  secretary: "SECRETARY",
  dean: "DEAN",
  "program-head": "PROGRAM_HEAD",
  faculty: "FACULTY",
  student: "STUDENT",
  alumni: "ALUMNI",
  "industry-partner": "INDUSTRY_PARTNER",
  "gen-ed-coordinator": "GEN_ED_COORDINATOR",
} as const;

export type RoleIntent = keyof typeof ROLE_INTENTS;

const ROLE_TO_INTENT: Record<SystemRole, RoleIntent> = {
  SECRETARY: "secretary",
  DEAN: "dean",
  PROGRAM_HEAD: "program-head",
  FACULTY: "faculty",
  STUDENT: "student",
  ALUMNI: "alumni",
  INDUSTRY_PARTNER: "industry-partner",
  GEN_ED_COORDINATOR: "gen-ed-coordinator",
};

export function roleToIntent(role: string): RoleIntent | null {
  const normalized = role.trim().toLowerCase().replaceAll("_", "-");
  return Object.hasOwn(ROLE_INTENTS, normalized) ? (normalized as RoleIntent) : null;
}

export function roleToIntentOrThrow(role: string): RoleIntent {
  const intent = roleToIntent(role);
  if (!intent) throw new Error(`Unsupported role intent: ${role}`);
  return intent;
}

export function intentToRole(intent: string): SystemRole | null {
  const normalized = roleToIntent(intent);
  return normalized ? (ROLE_INTENTS[normalized] as SystemRole) : null;
}

export function roleToCanonicalIntent(role: SystemRole): RoleIntent {
  return ROLE_TO_INTENT[role];
}

export function isRoleIntent(value: unknown): value is RoleIntent {
  return typeof value === "string" && roleToIntent(value) !== null;
}
