import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { RLS_AUTH_UUIDS } from "./rls-test-identities";

/**
 * One database access disposition per Prisma-backed application table.
 *
 * Every table must declare exactly one disposition so a partial RLS coverage
 * cannot be mistaken for a uniform security model:
 *
 *   - `role-aware-rls`      — row-level security policies gate reads/writes by
 *     role. `evidence` references live probes from the disposable RLS harness
 *     (src/lib/db/rls-test-helpers.ts + rls-test-identities.ts) that the
 *     database-gated suite executes against a migrated disposable database.
 *   - `authenticated-read`  — any authenticated identity may read every row;
 *     writes are denied. `evidence` carries the same live-probe references.
 *   - `server-only`         — no direct anon/authenticated access: the table
 *     has RLS enabled (deny-all) and anon/authenticated privileges revoked.
 *     The application reaches it only through Prisma (service role).
 *   - `application-layer-exception` — no RLS boundary; server code is the
 *     authorization owner. Must name the owning server module and justify why
 *     the RLS boundary is waived. Never weakens existing authorization.
 *
 * The deterministic check `checkTableAccessDispositions` fails when a new
 * Prisma table has no disposition, when a disposition names a table that no
 * longer exists, or when the parsed table list is ambiguous. Conflicting
 * dispositions are impossible by construction: one key per table.
 */

export type RlsProbeIdentity = keyof typeof RLS_AUTH_UUIDS;

// fallow-ignore-next-line unused-type
export type RlsProbeOperation = "select" | "write";

// fallow-ignore-next-line unused-type
export type RlsProbeExpectation = "allowed" | "denied";

// fallow-ignore-next-line unused-type
export interface RlsProbeEvidence {
  /** Fixed disposable-harness Auth identity whose RLS policies are exercised. */
  identity: RlsProbeIdentity;
  operation: RlsProbeOperation;
  expect: RlsProbeExpectation;
}

export type TableAccessDisposition =
  | {
      kind: "role-aware-rls";
      /** Live-policy evidence executed by the database-gated disposition suite. */
      evidence: readonly RlsProbeEvidence[];
    }
  | {
      kind: "authenticated-read";
      /** Live-policy evidence executed by the database-gated disposition suite. */
      evidence: readonly RlsProbeEvidence[];
    }
  | { kind: "server-only" }
  | {
      kind: "application-layer-exception";
      /** Server module that owns authorization for this table. */
      owner: string;
      justification: string;
    };

/** Secretary-write calendar boundary: SECRETARY writes, everyone else read-only. */
const CALENDAR_BOUNDARY_EVIDENCE = [
  { identity: "SECRETARY", operation: "select", expect: "allowed" },
  { identity: "SECRETARY", operation: "write", expect: "allowed" },
  { identity: "FACULTY", operation: "select", expect: "allowed" },
  { identity: "FACULTY", operation: "write", expect: "denied" },
  { identity: "PROGRAM_HEAD_BSIT", operation: "write", expect: "denied" },
] as const satisfies readonly RlsProbeEvidence[];

/** Authenticated read-only boundary: every authenticated identity reads, none writes. */
const AUTHENTICATED_READ_EVIDENCE = [
  { identity: "SECRETARY", operation: "select", expect: "allowed" },
  { identity: "SECRETARY", operation: "write", expect: "denied" },
  { identity: "FACULTY", operation: "select", expect: "allowed" },
  { identity: "FACULTY", operation: "write", expect: "denied" },
  { identity: "PROGRAM_HEAD_BSIT", operation: "write", expect: "denied" },
] as const satisfies readonly RlsProbeEvidence[];

export const TABLE_ACCESS_DISPOSITIONS = {
  // academic-calendar.prisma
  school_years: {
    kind: "role-aware-rls",
    evidence: CALENDAR_BOUNDARY_EVIDENCE,
  },
  academic_term_instances: {
    kind: "role-aware-rls",
    evidence: CALENDAR_BOUNDARY_EVIDENCE,
  },
  academic_period_readiness_snapshots: { kind: "server-only" },

  // academic-structure.prisma
  programs: { kind: "server-only" },
  majors: { kind: "server-only" },

  // course-assignments.prisma
  student_enrollments: { kind: "server-only" },
  courses: { kind: "server-only" },
  course_assignments: { kind: "server-only" },
  course_assignment_memberships: { kind: "server-only" },

  // identity-access.prisma
  // users, user_roles and program_head_assignments are authenticated read-only:
  // RLS policy subqueries on the role-aware tables (secretary role check, program
  // head scope check) read them, so authenticated SELECT stays open while all
  // writes are denied by RLS.
  users: {
    kind: "authenticated-read",
    evidence: AUTHENTICATED_READ_EVIDENCE,
  },
  user_roles: {
    kind: "authenticated-read",
    evidence: AUTHENTICATED_READ_EVIDENCE,
  },
  student_academic_profiles: { kind: "server-only" },
  industry_partner_profiles: { kind: "server-only" },
  industry_partner_program_affiliations: { kind: "server-only" },
  alumni_profiles: { kind: "server-only" },
  external_stakeholder_invites: { kind: "server-only" },
  faculty_program_affiliations: { kind: "server-only" },
  program_head_assignments: {
    kind: "authenticated-read",
    evidence: [
      { identity: "SECRETARY", operation: "select", expect: "allowed" },
      { identity: "SECRETARY", operation: "write", expect: "denied" },
      { identity: "FACULTY", operation: "select", expect: "allowed" },
      { identity: "FACULTY", operation: "write", expect: "denied" },
      { identity: "PROGRAM_HEAD_BSIT", operation: "select", expect: "allowed" },
      { identity: "PROGRAM_HEAD_BSIT", operation: "write", expect: "denied" },
    ],
  },

  // outcomes.prisma
  gos: { kind: "server-only" },
  cilos: { kind: "server-only" },
  institutional_outcomes: { kind: "server-only" },
  cilo_institutional_outcome_mappings: { kind: "server-only" },
  cilo_mappings: { kind: "server-only" },

  // evaluations-deployments.prisma
  course_bound_evaluations: { kind: "server-only" },
  course_bound_cilo_question_bindings: { kind: "server-only" },
  course_bound_evaluation_targets: { kind: "server-only" },
  course_bound_evaluation_exclusions: { kind: "server-only" },
  central_deployments: { kind: "server-only" },
  central_deployment_plo_snapshots: { kind: "server-only" },
  evaluation_assignments: { kind: "server-only" },

  // instruments.prisma
  instrument_templates: { kind: "server-only" },
  instrument_versions: { kind: "server-only" },
  instrument_template_cilo_question_bindings: { kind: "server-only" },
  instrument_template_plo_question_bindings: { kind: "server-only" },

  // responses.prisma
  responses: { kind: "server-only" },
  quantitative_response_items: { kind: "server-only" },
  qualitative_response_items: { kind: "server-only" },
} as const satisfies Record<string, TableAccessDisposition>;

/**
 * Deterministically parse the physical table names from the Prisma schema
 * (the `@@map` value when present, otherwise the model name). Pure file
 * parsing — no database connection required. The model directory is read from
 * disk so a new Prisma model file can never silently escape the check.
 */
function parsePrismaFileTables(lines: readonly string[], tables: string[]): void {
  let modelName: string | null = null;
  let mapped = false;
  const flushModel = (): void => {
    if (modelName !== null) {
      if (!mapped) tables.push(modelName);
      modelName = null;
      mapped = false;
    }
  };
  for (const line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      flushModel();
      modelName = modelMatch[1];
      continue;
    }
    if (/^(enum|generator|datasource)\s+/.test(line)) {
      flushModel();
      continue;
    }
    if (modelName !== null && !mapped) {
      const mapMatch = line.match(/@@map\("([^"]+)"\)/);
      if (mapMatch) {
        tables.push(mapMatch[1]);
        mapped = true;
      }
    }
  }
  flushModel();
}

export function listPrismaTableNames(repoRoot: string = process.cwd()): string[] {
  const prismaDir = join(repoRoot, "prisma");
  const modelFiles = readdirSync(join(prismaDir, "models"))
    .filter((name) => name.endsWith(".prisma"))
    .sort();
  const files = [
    join(prismaDir, "schema.prisma"),
    ...modelFiles.map((name) => join(prismaDir, "models", name)),
  ];
  const tables: string[] = [];
  for (const file of files) {
    parsePrismaFileTables(readFileSync(file, "utf8").split("\n"), tables);
  }
  return tables;
}

// fallow-ignore-next-line unused-type
export interface TableAccessDispositionCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Deterministic verification: every Prisma-backed application table must have
 * exactly one registered disposition, and every registered disposition must
 * name a live table. Fails when a new table is added without a disposition or
 * when a disposition references a table that no longer exists.
 */
export function checkTableAccessDispositions(
  prismaTableNames: readonly string[]
): TableAccessDispositionCheckResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const name of prismaTableNames) {
    if (seen.has(name)) {
      errors.push(`duplicate table name parsed from Prisma schema: "${name}"`);
    }
    seen.add(name);
    if (!(name in TABLE_ACCESS_DISPOSITIONS)) {
      errors.push(
        `table "${name}" has no access disposition — add exactly one entry to TABLE_ACCESS_DISPOSITIONS (src/lib/db/table-access-dispositions.ts)`
      );
    }
  }

  for (const table of Object.keys(TABLE_ACCESS_DISPOSITIONS)) {
    if (!seen.has(table)) {
      errors.push(
        `disposition registered for unknown table "${table}" — the table does not exist in the Prisma schema; remove the disposition or fix the table name`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
