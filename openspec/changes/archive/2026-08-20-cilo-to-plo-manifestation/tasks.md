## 1. Schema migration and seed

Scope: manifestation enum, nullable manifestation and updated_at on CILOMapping; migration; seed manifestations; regenerated types. No rename yet.
Paths: prisma/models/outcomes.prisma, supabase/migrations/<generated>, prisma/seed/fixtures/outcomes.ts, prisma/seed/runners/seed-outcomes.ts, src/types/supabase-database.ts (generated).
Acceptance: migration applies with legacy rows null; unique pair index and scope trigger survive; seed assigns explicit manifestations.
Verification: pnpm supabase:migration:diff -- add_cilo_mapping_manifestation; pnpm supabase:push:dry-run; pnpm supabase:types; pnpm build.
Commit: feat(db): add manifestation enum and updated_at to CILO mappings

- [x] 1.1 Add CILOMappingManifestation enum, manifestation (nullable) and updated_at to CILOMapping in prisma/models/outcomes.prisma
- [x] 1.2 Generate migration, review SQL, dry-run, push, regenerate Supabase types
- [x] 1.3 Update seed fixtures and runner with explicit manifestations

## 2. PLO terminology rename

Scope: refactor slice. Rename GO model to PLO behind @@map("gos"), go_id to plo_id behind @map, domain symbols, visible copy, glossary, ADR. Behavior unchanged.
Paths: prisma/models/outcomes.prisma, src/features/outcomes/**, src/lib/actions/program-head-outcome-actions.ts, src/features/analytics/** and other GO consumers via compiler, src/features/outcomes/CONTEXT.md, docs/adr/<new>.
Acceptance: no GO terminology in new or renamed code; build green; existing tests pass; no behavioral change.
Verification: pnpm build; pnpm lint; pnpm vitest run src/__tests__/app/program-head-outcome-routes.test.tsx.
Commit: refactor(outcomes): rename Graduate Outcome to Program Learning Outcome

- [x] 2.1 Rename Prisma model and field with @map/@@map mappings
- [x] 2.2 Rename outcomes domain services, schemas, components, actions to PLO naming
- [x] 2.3 Fix mechanical compile errors in analytics and other consumers
- [x] 2.4 Rewrite src/features/outcomes/CONTEXT.md glossary for PLO terminology
- [x] 2.5 Add ADR recording the PLO terminology canon

## 3. Read model and freshness token

Scope: CourseAlignment cilos gain mappings with manifestation (null for legacy); token becomes sorted active CILO ids, active PLO ids, and (ciloId, ploId, manifestation) triples.
Paths: src/features/outcomes/services/manage-course-alignment.ts, src/features/outcomes/schemas/plo.ts.
Acceptance: read returns manifestations and legacy-null state; token changes when a manifestation, pair, or catalog membership changes.
Verification: pnpm vitest run focused alignment read/token tests.
Commit: feat(outcomes): manifestation-aware alignment read model and freshness token

- [x] 3.1 Extend CourseAlignment read model with per-pair manifestations and legacy-null state
- [x] 3.2 Extend stable snapshot and freshness token with triples and catalog membership
- [x] 3.3 Add unit tests for token stability and staleness

## 4. Write path: draft save and commit

Scope: one diff engine with create/update/delete over the active Cartesian set; draft save mode without completeness gate; commit mode with completeness, scope, and validation gates; updated_by/updated_at recording; Secretary removed from roleAllowsAlignmentAccess; dead generic MAPPING/ILO_MAPPING branches and Secretary ILO CRUD deleted.
Paths: src/features/outcomes/services/manage-course-alignment.ts, manage-outcome-writes.ts, manage-cilo-mappings.ts, manage-institutional-outcomes.ts, src/lib/actions/course-alignment-actions.ts.
Acceptance: partial draft persists and resumes; clearing removes rows; missing/duplicate/invalid/cross-program/inactive pairs reject commit; manifestation change updates row with provenance; archived rows untouched; Secretary crafted writes fail; GE alignment unaffected.
Verification: pnpm vitest run focused service and action tests.
Commit: feat(outcomes): draft saves and exhaustive manifestation commit

- [x] 4.1 Implement shared diff engine with create, update, delete over the active Cartesian set
- [x] 4.2 Add draft save server action and service path
- [x] 4.3 Add commit completeness gate and validation rules
- [x] 4.4 Record updated_by and updated_at on manifestation changes
- [x] 4.5 Remove Secretary from alignment write authorization and delete dead write paths

## 5. Readiness semantics

Scope: exhaustive readiness for Program-specific Courses; zero active PLOs is incomplete; GE rule unchanged; snapshot schema_version bumps to 2.
Paths: src/features/outcomes/services/classify-course-alignment.ts, readiness snapshot writer and schema, publication gate verification.
Acceptance: partial or zero-PLO alignment blocks publication; complete alignment allows it; existing snapshots unchanged.
Verification: pnpm vitest run focused classify and publication gate tests.
Commit: feat(outcomes): exhaustive readiness for manifestation mapping

- [x] 5.1 Implement exhaustive readiness rule in classify-course-alignment.ts
- [x] 5.2 Verify publication gate consumes the updated classifier
- [x] 5.3 Bump readiness snapshot schema_version and document legacy interpretation

## 6. Faculty editor UI

Scope: manifestation matrix (desktop) and CILO cards (mobile) for Program-specific Courses; checkbox editor kept for GE; progress counter; Save always available; Review gated; review dialog shows manifestation changes; legacy-null and empty states; accessible controls.
Paths: src/features/outcomes/components/course-alignment-editor.tsx, new manifestation matrix and picker components, src/app/(app)/faculty/cilos/[courseId]/alignment/page.tsx.
Acceptance: 32 of 40 progress shown; review blocked until complete with explicit message; review shows Learning (L) to Practice (P) changes; keyboard operable with full accessible names; GE editor unchanged.
Verification: pnpm vitest run focused editor component tests; manual desktop and mobile walkthrough in dev server.
Commit: feat(outcomes): manifestation matrix and draft-capable alignment editor

- [x] 6.1 Build manifestation picker and desktop matrix components
- [x] 6.2 Build mobile CILO cards with per-pair controls
- [x] 6.3 Wire Save, progress counter, and Review gating
- [x] 6.4 Render manifestation diffs in the review dialog
- [x] 6.5 Handle legacy-null and empty states in the editor

## 7. Program Head surfaces

Scope: mapping review shows manifestations read-only with updated readiness badges; no mutation controls; crafted Program Head mutations denied server-side.
Paths: src/app/(app)/program-head/programs/[programId]/outcomes/mapping/page.tsx, src/features/outcomes/components/program-head-outcomes-page.tsx, src/features/outcomes/services/manage-program-head-outcomes.ts.
Acceptance: review lists Course, CILOs, every PLO, manifestation per pair, full labels where practical; no buttons; server denies Program Head mapping writes.
Verification: pnpm vitest run program-head route and crafted-request tests.
Commit: feat(outcomes): read-only Program Head manifestation review

- [x] 7.1 Extend listCILOMappingsForProgram with manifestations and updated readiness
- [x] 7.2 Render read-only manifestation review for desktop and mobile
- [x] 7.3 Add server-side denial tests for Program Head mapping writes

## 8. Secretary removal

Scope: routes removed or redirected to /secretary; nav entry removed; Secretary ILO UI and actions deleted; tests deleted or updated.
Paths: src/app/(app)/secretary/learning-outcomes/**, src/lib/constants/navigation.ts, src/features/outcomes/components/course-alignment-administration-list.tsx, institutional-outcomes-page.tsx, institutional-outcome-form-dialog.tsx, src/__tests__/app/secretary-*.test.tsx, src/__tests__/lib/navigation.test.ts.
Acceptance: no Learning Outcomes nav item for Secretary; removed routes redirect; Secretary crafted mapping and ILO writes fail; other Secretary surfaces unaffected.
Verification: pnpm vitest run navigation and secretary tests; pnpm build.
Commit: feat(secretary): remove Secretary outcome interface and authorization

- [x] 8.1 Remove Secretary Learning Outcomes nav entry
- [x] 8.2 Delete Secretary learning-outcomes routes and add redirects
- [x] 8.3 Delete Secretary ILO catalog UI, actions, and services
- [x] 8.4 Update and remove affected tests

## 9. Edge polish and full verification

Scope: unavailable-target display with historical manifestations, no-op write behavior, zero-PLO state verification, terminology test sweep, full suite.
Paths: src/features/outcomes/** as needed, src/__tests__/**.
Acceptance: archived pairs show historical manifestation read-only; no-op writes skip provenance; all spec test cases covered; lint, test, build green.
Verification: pnpm lint; pnpm test; pnpm build; dev-server walkthrough of Faculty and Program Head flows at desktop and mobile widths.
Commit: test(outcomes): manifestation edge cases and full verification

- [x] 9.1 Display historical manifestation on unavailable targets read-only
- [x] 9.2 Skip no-op manifestation writes
- [x] 9.3 Complete remaining spec test cases from section 29
- [x] 9.4 Run lint, full test suite, build, and manual desktop and mobile walkthrough
