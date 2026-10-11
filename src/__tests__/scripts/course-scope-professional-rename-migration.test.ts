import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

/**
 * Replays the real CourseScope rename migration against a real pre-migration
 * database.
 *
 * The migration's whole job is converting data that already exists, so a suite
 * that only writes post-migration rows proves nothing about it. This one builds
 * a throwaway database from the committed history up to (but excluding) the
 * rename, writes legacy rows carrying the retired label in every place it was
 * stored, runs the committed migration file against them, and compares the
 * result to the state captured beforehand.
 *
 * Only the migrations that precede the target are replayed, so a migration
 * added later cannot change what the rename is tested against.
 */

const TARGET_MIGRATION = "20261011102138_rename_course_scope_to_professional.sql";
const REPLAY_SCRIPT = "scripts/ci/apply-migrations.sh";
const RETIRED_LABEL = "PROGRAM_SPECIFIC";
const CURRENT_LABEL = "PROFESSIONAL";

const repoRoot = process.cwd();
const migrationsDir = join(repoRoot, "supabase", "migrations");

function psql(databaseUrl: string, sql: string): string {
  return execFileSync(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-q", "-A", "-t", "-F", "|", "-d", databaseUrl],
    { encoding: "utf8", input: sql }
  ).trim();
}

function psqlScript(databaseUrl: string, sql: string): void {
  execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-q", "-d", databaseUrl], {
    encoding: "utf8",
    input: sql,
  });
}

/** Connection string for a sibling database on the same disposable server. */
function siblingDatabaseUrl(databaseName: string): string {
  const url = new URL(process.env.DATABASE_URL as string);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Legacy fixture in the pre-migration shape. It covers the awkward cases on
 * purpose: a course that relies on the column default, a readiness context with
 * no `courseScope` key at all, a General Education context between two
 * professional ones, and an audit row whose prose names the retired label and
 * must therefore not be rewritten.
 */
const LEGACY_FIXTURE = `
INSERT INTO public.programs (id, code, name, created_at, updated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'BSIT', 'Bachelor of Science in Information Technology', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('22222222-2222-4222-8222-222222222222', 'BSBA', 'Bachelor of Science in Business Administration', '2026-01-05 09:00:00', '2026-01-05 09:00:00');

INSERT INTO public.users (id, email, name, created_at, updated_at) VALUES
  ('44444444-4444-4444-8444-444444444441', 'scope.migration@example.edu', 'Scope Migration Actor', '2026-01-05 09:00:00', '2026-01-05 09:00:00');

INSERT INTO public.courses (id, code, title, program_id, course_scope, created_at, updated_at) VALUES
  ('33333333-3333-4333-8333-333333333331', 'IT101', 'Introduction to Computing', '11111111-1111-4111-8111-111111111111', 'PROGRAM_SPECIFIC', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('33333333-3333-4333-8333-333333333332', 'IT201', 'Data Structures', '11111111-1111-4111-8111-111111111111', 'PROGRAM_SPECIFIC', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('33333333-3333-4333-8333-333333333333', 'IT102', 'Computer Hardware 1', '11111111-1111-4111-8111-111111111111', 'PROGRAM_SPECIFIC', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('33333333-3333-4333-8333-333333333334', 'BASOC', 'Basic Social Science', '22222222-2222-4222-8222-222222222222', 'PROGRAM_SPECIFIC', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('33333333-3333-4333-8333-333333333335', 'GESTECH', 'Science, Technology and Society', NULL, 'GENERAL_EDUCATION', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),
  ('33333333-3333-4333-8333-333333333336', 'DEFAULTED', 'Defaulted Scope Course', '11111111-1111-4111-8111-111111111111', DEFAULT, '2026-01-05 09:00:00', '2026-01-05 09:00:00');

INSERT INTO public.school_years (id, code, start_date, end_date, created_at, updated_at) VALUES
  ('55555555-5555-4555-8555-555555555555', '2025-2026', '2025-08-01', '2026-05-31', '2026-01-05 09:00:00', '2026-01-05 09:00:00');

INSERT INTO public.academic_term_instances (id, school_year_id, semester, term, status, created_at, updated_at) VALUES
  ('66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555555', '1ST', 'FIRST_TERM', 'COMPLETED', '2026-01-05 09:00:00', '2026-01-05 09:00:00');

INSERT INTO public.course_assignments (id, term_instance_id, faculty_id, course_id, program_id, year_level, section, created_at, updated_at) VALUES
  ('77777777-7777-4777-8777-777777777777', '66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444441', '33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', 'FIRST_YEAR', 'MORNING', '2026-01-06 09:00:00', '2026-01-06 09:00:00');

INSERT INTO public.instrument_templates (id, code, name, structure, created_at, updated_at) VALUES
  ('88888888-8888-4888-8888-888888888888', 'SCOPE-LEGACY', 'Legacy template', '{"sections":[],"items":[]}', '2026-01-06 09:00:00', '2026-01-06 09:00:00');

INSERT INTO public.instrument_versions (id, template_id, version_number, structure_snapshot, created_at, updated_at) VALUES
  ('99999999-9999-4999-8999-999999999999', '88888888-8888-4888-8888-888888888888', 1, '{"sections":[{"id":"s1","items":[{"id":"i1","type":"LIKERT"}]}]}', '2026-01-06 09:00:00', '2026-01-06 09:00:00');

INSERT INTO public.course_bound_evaluations (
  id, instrument_version_id, cilos_snapshot, course_info_snapshot,
  activation_at, published_at, created_at, updated_at, status,
  course_assignment_id, term_instance_id, deployment_name
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '99999999-9999-4999-8999-999999999999',
  '[{"id":"c1","label":"CLO1","description":"Legacy CILO statement"}]'::jsonb,
  '{"snapshotSchemaVersion":2,"courseCode":"IT101","courseTitle":"Introduction to Computing","courseScope":"PROGRAM_SPECIFIC","programCode":"BSIT","programName":"Bachelor of Science in Information Technology","majorName":null,"capturedAt":"2026-02-01 10:00:00","assignmentContextSource":"PUBLICATION"}'::jsonb,
  '2026-02-01 00:00:00', '2026-02-01 00:00:00', '2026-02-01 00:00:00', '2026-02-01 00:00:00',
  'CLOSED', '77777777-7777-4777-8777-777777777777', '66666666-6666-4666-8666-666666666666',
  'Legacy IT101 evaluation'
);

INSERT INTO public.academic_period_readiness_snapshots (id, period_id, contexts, program_totals, schema_version, created_at) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '66666666-6666-4666-8666-666666666666',
  '[
    {"courseId":"33333333-3333-4333-8333-333333333331","courseCode":"IT101","courseScope":"PROGRAM_SPECIFIC","targetType":"GRADUATE_OUTCOME","state":"incomplete-mapping","cilos":[{"id":"c1","description":"Legacy CILO statement","isArchived":false,"mappedTargets":[{"id":"po-1","isArchived":false}],"missingGoIds":["po-2"],"missingInstitutionalOutcomeIds":[]}],"yearLevels":["FIRST_YEAR"],"sections":["MORNING"]},
    {"courseId":"33333333-3333-4333-8333-333333333335","courseCode":"GESTECH","courseScope":"GENERAL_EDUCATION","targetType":"INSTITUTIONAL_OUTCOME","state":"ready","cilos":[],"yearLevels":["FIRST_YEAR"],"sections":["MORNING"]},
    {"courseId":"33333333-3333-4333-8333-333333333332","courseCode":"IT201","courseScope":"PROGRAM_SPECIFIC","targetType":"GRADUATE_OUTCOME","state":"ready","cilos":[],"yearLevels":["SECOND_YEAR"],"sections":["AFTERNOON"]},
    {"courseId":"33333333-3333-4333-8333-333333333333","courseCode":"IT102","targetType":"GRADUATE_OUTCOME","state":"ready","cilos":[],"yearLevels":["FIRST_YEAR"],"sections":["MORNING"]}
  ]'::jsonb,
  '[{"programId":"11111111-1111-4111-8111-111111111111","programName":"Bachelor of Science in Information Technology","activeContexts":3,"readyContexts":2,"missingCiloContexts":0,"incompleteMappingContexts":1}]'::jsonb,
  2,
  '2026-02-02 00:00:00'
);

INSERT INTO public.outcome_changes (id, actor_id, input, before, after, created_at) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '44444444-4444-4444-8444-444444444441',
  '{"note":"imported from a PROGRAM_SPECIFIC curriculum listing"}'::jsonb,
  '{"classification":"PROGRAM_SPECIFIC"}'::jsonb,
  '{"classification":"UNCLASSIFIED"}'::jsonb,
  '2026-02-03 00:00:00'
);
`;

/**
 * Copies the migrations that precede the target plus the replay script, so the
 * schema under test is the one every other target applies, unchanged by any
 * migration added later.
 */
function stageReplayWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "cloie-scope-rename-"));
  const stagedMigrations = join(workspace, "supabase", "migrations");
  mkdirSync(stagedMigrations, { recursive: true });

  for (const file of readdirSync(migrationsDir).sort()) {
    if (file.endsWith(".sql") && file < TARGET_MIGRATION) {
      copyFileSync(join(migrationsDir, file), join(stagedMigrations, file));
    }
  }

  const stagedScript = join(workspace, REPLAY_SCRIPT);
  mkdirSync(join(stagedScript, ".."), { recursive: true });
  copyFileSync(join(repoRoot, REPLAY_SCRIPT), stagedScript);

  return workspace;
}

/** Everything the migration must leave byte-identical, captured before it runs. */
function captureEvidence(databaseUrl: string): Record<string, string> {
  return {
    courses: psql(
      databaseUrl,
      `SELECT string_agg(id::text || ':' || code || ':' || coalesce(program_id::text, 'null') || ':' || created_at::text || ':' || updated_at::text, ',' ORDER BY id)
         FROM courses`
    ),
    courseAssignment: psql(
      databaseUrl,
      `SELECT string_agg(id::text || ':' || program_id::text || ':' || faculty_id::text || ':' || course_id::text || ':' || term_instance_id::text, ',' ORDER BY id)
         FROM course_assignments`
    ),
    // The frozen evaluation context except its classification key.
    evaluationRemainder: psql(
      databaseUrl,
      `SELECT md5((course_info_snapshot - 'courseScope')::text) || ':' || cilos_snapshot::text || ':' || status::text || ':' || published_at::text || ':' || created_at::text || ':' || updated_at::text
         FROM course_bound_evaluations`
    ),
    // Every readiness context except its classification value, in array order.
    readinessRemainder: psql(
      databaseUrl,
      `SELECT md5((SELECT string_agg((element - 'courseScope')::text, ',' ORDER BY ordinal) FROM jsonb_array_elements(contexts) WITH ORDINALITY AS t(element, ordinal)))
              || ':' || program_totals::text || ':' || schema_version::text || ':' || created_at::text || ':' || period_id::text
         FROM academic_period_readiness_snapshots`
    ),
    // Audit history is prose, not a classification, so it must not be rewritten.
    auditTrail: psql(
      databaseUrl,
      `SELECT md5(input::text || before::text || after::text) FROM outcome_changes`
    ),
  };
}

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "CourseScope Professional rename migration",
  () => {
    let workspace = "";
    let createdDatabase = "";

    afterAll(() => {
      if (createdDatabase) {
        try {
          psql(
            siblingDatabaseUrl("postgres"),
            `DROP DATABASE IF EXISTS ${createdDatabase} WITH (FORCE)`
          );
        } catch {
          // Disposable database; failing to drop it must not fail the suite.
        }
      }
      if (workspace) rmSync(workspace, { recursive: true, force: true });
    });

    it("converts legacy rows in place without altering the evidence around them", () => {
      // A unique name means this suite can only ever drop a database it made.
      createdDatabase = `cloie_scope_rename_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      psql(siblingDatabaseUrl("postgres"), `CREATE DATABASE ${createdDatabase}`);
      const databaseUrl = siblingDatabaseUrl(createdDatabase);

      workspace = stageReplayWorkspace();
      execFileSync("bash", [join(workspace, REPLAY_SCRIPT)], {
        env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
        encoding: "utf8",
        stdio: "pipe",
      });

      psqlScript(databaseUrl, LEGACY_FIXTURE);

      const enumLabels = `SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'CourseScope'`;
      const scopeCounts = `SELECT course_scope::text || '=' || count(*) FROM courses GROUP BY course_scope ORDER BY course_scope::text`;
      const contextScopes = `SELECT string_agg(coalesce(context ->> 'courseScope', '(absent)'), ',' ORDER BY ordinality)
        FROM academic_period_readiness_snapshots s,
             LATERAL jsonb_array_elements(s.contexts) WITH ORDINALITY AS t(context, ordinality)`;
      const snapshotTriggers = `SELECT string_agg(tgname || '=' || tgenabled::text, ',' ORDER BY tgname)
        FROM pg_trigger
       WHERE NOT tgisinternal
         AND tgname IN ('academic_period_readiness_snapshots_immutable', 'published_course_evaluation_snapshot_lock')`;

      // Facts the assertions below are written against, captured pre-migration.
      expect(psql(databaseUrl, enumLabels)).toBe(`GENERAL_EDUCATION,${RETIRED_LABEL}`);
      expect(psql(databaseUrl, scopeCounts)).toBe(
        ["GENERAL_EDUCATION=1", `${RETIRED_LABEL}=5`].join("\n")
      );
      expect(psql(databaseUrl, contextScopes)).toBe(
        [RETIRED_LABEL, "GENERAL_EDUCATION", RETIRED_LABEL, "(absent)"].join(",")
      );

      const before = captureEvidence(databaseUrl);

      psqlScript(databaseUrl, readFileSync(join(migrationsDir, TARGET_MIGRATION), "utf8"));

      // The classification itself: renamed in place, owner and GE scope intact.
      expect(psql(databaseUrl, enumLabels)).toBe(`GENERAL_EDUCATION,${CURRENT_LABEL}`);
      expect(psql(databaseUrl, scopeCounts)).toBe(
        ["GENERAL_EDUCATION=1", `${CURRENT_LABEL}=5`].join("\n")
      );
      expect(
        psql(
          databaseUrl,
          `SELECT count(*) FROM courses WHERE course_scope = '${CURRENT_LABEL}'::"CourseScope" AND program_id = '11111111-1111-4111-8111-111111111111'`
        )
      ).toBe("4");
      expect(
        psql(
          databaseUrl,
          `SELECT column_default FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'course_scope'`
        )
      ).toBe(`'${CURRENT_LABEL}'::"CourseScope"`);

      // The persisted classification identifiers, including the object with no key.
      expect(
        psql(
          databaseUrl,
          `SELECT course_info_snapshot ->> 'courseScope' FROM course_bound_evaluations`
        )
      ).toBe(CURRENT_LABEL);
      expect(psql(databaseUrl, contextScopes)).toBe(
        [CURRENT_LABEL, "GENERAL_EDUCATION", CURRENT_LABEL, "(absent)"].join(",")
      );

      // Everything the rename must not have moved.
      const after = captureEvidence(databaseUrl);
      expect(after).toEqual(before);

      // The immutability guards the migration suspended are restored.
      expect(psql(databaseUrl, snapshotTriggers)).toBe(
        "academic_period_readiness_snapshots_immutable=O,published_course_evaluation_snapshot_lock=O"
      );
      expect(() =>
        psql(databaseUrl, `UPDATE academic_period_readiness_snapshots SET schema_version = 9`)
      ).toThrow(/immutable/i);
      expect(() =>
        psql(
          databaseUrl,
          `UPDATE course_bound_evaluations SET course_info_snapshot = course_info_snapshot || '{"tampered":true}'::jsonb WHERE published_at IS NOT NULL`
        )
      ).toThrow(/immutable/i);

      // The retired label is gone from the enum, so nothing can write it again.
      expect(() =>
        psql(
          databaseUrl,
          `INSERT INTO courses (code, title, course_scope, updated_at) VALUES ('REJECT', 'Rejected label', '${RETIRED_LABEL}'::"CourseScope", now())`
        )
      ).toThrow(/invalid input value for enum/i);
    }, 600_000);
  }
);
