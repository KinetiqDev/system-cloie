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

/**
 * Role-less entry intents for the scoped public entrances (issue #649).
 * `staff` covers every internal role behind one Google action; `external`
 * covers Alumni and Industry Partner behind the email-first entrance. They
 * bind the legal ticket to the entrance but never name a SystemRole, so the
 * callback resolves them role-less: no target-role claim, no role creation,
 * session resolve to /select-role or account status.
 */
export const ENTRY_INTENTS = {
  staff: "staff",
  external: "external",
} as const;

export type EntryIntent = keyof typeof ENTRY_INTENTS;

/** Any intent the legal ticket may bind: a role intent or a role-less entry intent. */
export type TicketIntent = RoleIntent | EntryIntent;
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

export function isEntryIntent(value: unknown): value is EntryIntent {
  return (
    typeof value === "string" &&
    Object.hasOwn(ENTRY_INTENTS, value.trim().toLowerCase().replaceAll("_", "-"))
  );
}

export function isTicketIntent(value: unknown): value is TicketIntent {
  return isRoleIntent(value) || isEntryIntent(value);
}

/**
 * Canonical ticket binding for an intent parameter: role intents normalize
 * through ROLE_INTENTS (case/underscore tolerant); entry intents are already
 * canonical. Returns null when the value names no ticket intent.
 */
export function toCanonicalTicketIntent(intent: string): TicketIntent | null {
  const roleIntent = roleToIntent(intent);
  if (roleIntent) return roleIntent;
  return isEntryIntent(intent)
    ? (intent.trim().toLowerCase().replaceAll("_", "-") as EntryIntent)
    : null;
}
