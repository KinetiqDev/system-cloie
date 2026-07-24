## Context

### Current-state hotspot analysis

`prisma/schema.prisma` currently contains 825 lines, one generator, one datasource, 17 enums, and 32 models. Definitions are grouped partly by historical feature sections, but the ownership graph is not stable: Academic Calendar models are followed by Course Assignment models, then Identity and Access and Academic Structure models, followed by Outcomes, Instruments, Deployments, and Responses. `User` and `Program` carry many relation fields for other domains, forcing readers to scan a single large file to understand one domain or one relation pair.

The schema is declarative rather than a runtime module, so the useful seam is the schema-directory interface consumed by Prisma CLI. Domain files deepen that seam for humans and AI tools: each file exposes one cohesive vocabulary while Prisma still composes one global datamodel. No application caller imports schema fragments.

The deployed database is not described by Prisma alone. Existing Supabase migrations maintain SQL-only behavior, including `NULLS NOT DISTINCT` unique indexes, partial unique indexes, CHECK constraints, immutable/locking triggers, RLS, revokes, and historical composite constraints. Reorganizing files MUST NOT cause Prisma tooling to reinterpret or remove those objects.

### Compatibility finding

Installed versions are `prisma@6.4.1` and `@prisma/client@6.4.1`. Official Prisma documentation and the Prisma 6.7.0 release notes state that `prismaSchemaFolder` became generally available in 6.7.0. The installed 6.4.1 CLI recognizes folder input only behind the `prismaSchemaFolder` preview feature; `pnpm exec prisma validate --schema prisma` currently fails with `"prismaSchemaFolder" preview feature must be enabled`.

The minimum compatible dependency is therefore Prisma 6.7.0. This is a dependency change, not a database change. Prisma 7 is not part of this proposal because it would add an unnecessary major-version migration and configuration surface.

## Goals / Non-Goals

**Goals:**

- Make domain ownership obvious from file paths.
- Preserve one generated Prisma Client, current `@prisma/client` imports, and current model/enum names.
- Preserve the complete Prisma datamodel byte-for-byte in meaning: fields, types, nullability, defaults, mappings, relation names, composite relations, named indexes, referential actions, and SQL-only mirrors.
- Make all Prisma commands and the Supabase migration helper consume the complete schema directory.
- Prove that the reorganized schema produces no unintended SQL drift.
- Keep rollback mechanical: restore the single schema file and Prisma 6.4.1 package versions if the compatibility gate fails.

**Non-Goals:**

- No table, column, enum value, relation, index, constraint, default, mapping, UUID type, trigger, function, RLS policy, revoke, or referential action change.
- No application behavior, authorization, privacy, caching, deployment, seed, or generated Supabase type change.
- No data migration or Supabase migration solely for file reorganization.
- No correction of existing migration/schema discrepancies, including historical `TargetStakeholder` naming evidence or SQL-only constraints.
- No redesign of model ownership, naming, normalization, or domain relationships.
- No `prisma.config.ts` unless implementation proves Prisma 6.7.0 cannot discover the folder through the existing default layout; adding Prisma 7 configuration is explicitly out of scope.

## Decisions

### 1. Upgrade to Prisma 6.7.0 minimum

Use `prisma` and `@prisma/client` version `6.19.2`, the latest compatible Prisma 6.x version confirmed during planning, with lockfile changes reviewed. Prisma 6.7.0 is the first release where multi-file schemas are GA. Do not enable a preview feature in 6.4.1 and do not upgrade to Prisma 7 for this refactor.

**Alternative rejected:** Keep 6.4.1 and add `previewFeatures = ["prismaSchemaFolder"]`. The feature was preview-only in this installed version, and preview behavior adds avoidable compatibility risk to a structural refactor.

**Alternative rejected:** Upgrade directly to Prisma 7. Prisma 7 changes configuration and generated-client setup beyond the requested schema organization and increases rollback scope.

### 2. Keep `prisma/schema.prisma` as main file

`prisma/schema.prisma` remains the obvious entrypoint and retains only the existing `generator client` and `datasource db` blocks. All enum and model declarations move to `prisma/models/*.prisma`. Prisma fragments share one global namespace; they do not import each other and do not duplicate generator or datasource blocks.

Use `prisma/models/` rather than placing files beside migrations. This keeps the existing `prisma/migrations/` layout intact and follows official domain-file guidance.

### 3. Proposed file tree

```text
prisma/
├── migrations/
├── models/
│   ├── identity-access.prisma
│   ├── academic-calendar.prisma
│   ├── academic-structure.prisma
│   ├── course-assignments.prisma
│   ├── outcomes.prisma
│   ├── instruments.prisma
│   ├── evaluations-deployments.prisma
│   └── responses.prisma
├── schema.prisma
└── seed.ts
```

### 4. Complete enum and model ownership map

Primary ownership follows existing context documents and ADRs. A relation target appearing in another file is a dependency, not a transfer of ownership.

| File | Enums | Models |
|---|---|---|
| `identity-access.prisma` | `SystemRole`, `InviteStatus`, `VerificationStatus` | `User`, `UserRole`, `StudentAcademicProfile`, `IndustryPartnerProfile`, `AlumniProfile`, `ExternalStakeholderInvite`, `FacultyProgramAffiliation`, `ProgramHeadAssignment` |
| `academic-calendar.prisma` | `AcademicSemester`, `AcademicTerm`, `AcademicPeriodStatus` | `SchoolYear`, `AcademicTermInstance`, `AcademicPeriodReadinessSnapshot` |
| `academic-structure.prisma` | none | `Program`, `Major` |
| `course-assignments.prisma` | `YearLevel`, `CourseScope`, `StudentSection`, `EnrollmentSource` | `Course`, `StudentEnrollment`, `CourseAssignment`, `CourseAssignmentMembership` |
| `outcomes.prisma` | none | `GO`, `CILO`, `CILOMapping` |
| `instruments.prisma` | `EvaluationTemplateType` | `InstrumentTemplate`, `InstrumentVersion`, `InstrumentTemplateCiloQuestionBinding` |
| `evaluations-deployments.prisma` | `DeploymentStatus`, `TargetStakeholder`, `CourseBoundEvaluationExclusionCategory`, `CourseBoundEvaluationExclusionReversalCategory` | `CourseBoundEvaluation`, `CourseBoundCiloQuestionBinding`, `CourseBoundEvaluationTarget`, `CourseBoundEvaluationExclusion`, `CentralDeployment`, `EvaluationAssignment` |
| `responses.prisma` | `ResponseStatus`, `DeploymentType` | `Response`, `QuantitativeResponseItem`, `QualitativeResponseItem` |

Ownership decisions that could otherwise be misread:

- `FacultyProgramAffiliation` and `ProgramHeadAssignment` remain in Identity and Access because their canonical language and onboarding rules are defined there; Course Catalog and Assignments consumes them for scope and capability checks.
- `StudentEnrollment` belongs to Course Catalog and Assignments because it is the term-placement ledger consumed by roster eligibility; Academic Calendar owns only the period it references.
- `GO`, `CILO`, and `CILOMapping` belong to Outcomes. `GO` is program-scoped and `CILO` is course-level, but neither is owned by the Academic Structure or Course Assignment file.
- `InstrumentTemplate` and `InstrumentVersion` belong to Instruments. Their course/program/major bindings are scope relations, not a transfer to Academic Structure or Course Catalog and Assignments.
- `CourseBoundEvaluation`, its question bindings, targets, exclusions, central deployments, and evaluation assignments belong to Evaluations and Deployments. Responses owns submitted response records and response items.
- `YearLevel` is shared by enrollments, assignments, catalog defaults, and deployment targets but has no independent context. It remains with Course Catalog and Assignments as the closest existing vocabulary owner.

No unresolved domain assignment contradiction was found against `CONTEXT-MAP.md`, the four existing `CONTEXT.md` files, ADRs 0001-0007, or current runtime imports. The map records primary ownership only; cross-domain relations remain explicit.

### 5. Cross-file relation handling

Prisma resolves all model and enum names across the schema directory. Fragments MUST preserve relation declarations exactly, including:

- Every named relation string, especially `faculty`, `AssignmentAssigner`, `ArchivedSchoolYears`, `EnrollmentCreator`, `CourseAssignmentMembership*`, `CourseBoundEvaluationDeployer`, `CourseBoundAssignments`, `CentralDeployments`, `FacultyOwnedInstrumentTemplates`, `InstrumentTemplateCopies`, and all exclusion actor/reverser relations.
- Composite foreign-key field/reference order for `CourseAssignmentMembership`, `CourseBoundEvaluationExclusion`, and `AlumniProfile.major`.
- Relation optionality and `onDelete`/`onUpdate` actions.
- Both sides of each relation, even when the sides are in different files. No relation field is replaced with a comment, scalar-only field, or inferred relation.

The implementation should move whole model blocks without editing their declarations. This is the smallest seam and prevents relation drift.

### 6. Tooling and configuration

After the Prisma version gate passes:

- Keep `prisma/schema.prisma` at its current location and pass `--schema prisma` to `prisma generate`, `prisma db push`, and `prisma studio`; Prisma otherwise treats the entrypoint file as a standalone schema. Run `prisma generate --schema prisma` before `prisma db seed`, because `db seed` does not accept a schema argument and runs the configured seed command against the generated client.
- Change `scripts/create-supabase-migration.ts` from `schemaPath: "prisma/schema.prisma"` to `schemaPath: "prisma"`, so `prisma migrate diff --to-schema-datamodel` loads all fragments.
- Keep the existing migration helper's `DIRECT_URL ?? DATABASE_URL` selection and no-Docker workflow.
- Update package metadata and lockfile only for the Prisma 6.7.0-compatible dependency pair.
- Update schema-location documentation in `supabase/README.md` and `docs/cloie-techstack.md` from “single schema file” wording to “Prisma schema directory with `prisma/schema.prisma` entrypoint” wording. `AGENTS.md` is local ignored guidance and is not an affected implementation path.

No Server Component, Client Component, server action, or runtime adapter changes exist in this design.

### 7. Migration-safety strategy

Use a canonical before/after comparison, not only `prisma validate`:

1. Copy the current `prisma/schema.prisma` to an OS temporary path for comparison evidence. Do not commit the copy.
2. Run format and validation against the current single file.
3. Generate Prisma Client from the current schema and record generated output metadata.
4. Generate the current Prisma datamodel SQL with `pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` into a temporary file.
5. Split declarations without semantic edits.
6. Run `pnpm exec prisma format --schema prisma` and `pnpm exec prisma validate --schema prisma` with Prisma 6.7.0+.
7. Generate Prisma Client from the schema directory.
8. Generate the reorganized datamodel SQL with `pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma --script`.
9. Normalize only nondeterministic formatting if required, then compare SQL and the Prisma DMMF/model metadata. Any table, column, enum, index, constraint, default, mapping, foreign key, or referential-action difference fails the change.
10. Run `pnpm supabase:migration:diff -- modularize_prisma_schema_check` only in a disposable/controlled environment, inspect output, and do not retain a non-empty migration. No `supabase db pull` or `supabase db diff --linked`.

The comparison must explicitly account for SQL-only objects that Prisma does not emit or model: the `NULLS NOT DISTINCT` indexes, partial unique indexes, four SQL CHECK constraints, two course-assignment/roster locking triggers, readiness-snapshot immutability trigger, RLS, revokes, and the deployed composite/legacy migration assumptions. The refactor must not modify those migration files.

### 8. Rollback

Before implementation, preserve the current single schema file and package lock state in the branch diff. If any compatibility or SQL-drift gate fails:

- Stop before applying or generating a production migration.
- Restore `prisma/schema.prisma` as the active schema entrypoint and remove only newly created fragment files.
- Restore `package.json`, `pnpm-lock.yaml`, and `scripts/create-supabase-migration.ts` to their pre-change versions.
- Re-run `pnpm exec prisma validate --schema prisma/schema.prisma`, `pnpm exec prisma generate --schema prisma/schema.prisma`, and the focused test suite.

Because this change has no database migration, rollback requires no data restore and no Supabase migration repair. If a Prisma dependency upgrade proves incompatible, defer the split and create a separate dependency-upgrade change rather than keeping preview configuration.

## Risks / Trade-offs

- **[Risk] Prisma 6.7.0 changes CLI or generated-client behavior beyond schema folders.** → Pin the smallest compatible 6.x upgrade, inspect lockfile changes, generate Client, run lint/test/build, and compare generated type/API surfaces.
- **[Risk] A CLI command reads only `prisma/schema.prisma` and silently omits fragments.** → Use explicit `--schema prisma` in verification and update the migration helper to pass the directory; test all package scripts that consume Prisma.
- **[Risk] Moving relation halves creates validation or referential-action drift.** → Move complete model blocks unchanged and compare normalized datamodel output plus generated Client metadata.
- **[Risk] Prisma diff proposes changes to SQL-only objects or historical drift.** → Treat SQL-only constraints as migration-owned; inspect diffs rather than applying them, and preserve all existing `supabase/migrations/*.sql` files.
- **[Risk] Domain files create false ownership confidence for heavily shared models.** → Keep `User`, `Program`, and period relations explicit; document primary ownership and cross-file dependencies in each file header or design map without duplicating definitions.
- **[Risk] Documentation says `prisma/schema.prisma` is the complete schema.** → Update affected schema workflow documentation in the same vertical slice.

## Migration Plan

This is a source/tooling migration, not a database migration:

1. Upgrade Prisma dependencies and confirm folder support.
2. Add domain fragment files and reduce `prisma/schema.prisma` to generator/datasource.
3. Update migration-diff tooling and schema-location documentation.
4. Format, validate, generate Client, compare SQL/DMMF, and run tests/lint/build.
5. Do not run `pnpm supabase:push`; no deployment SQL is expected.

Rollback follows the mechanical steps above. Production database remains untouched throughout this change.

## Open Questions

- Confirm `6.19.2` remains available and compatible at implementation time. If registry state changes, use another compatible Prisma 6.x patch only with explicit review.
- Confirm whether a temporary SQL diff against the linked database is available without exposing credentials. If not, use the committed migration history plus from-empty datamodel comparison and record the limitation; do not use Docker-backed commands.
- Confirm whether generated Client output metadata needs a committed snapshot test. Default: add a focused test for schema-directory loading and migration-helper directory arguments, not generated artifacts.
