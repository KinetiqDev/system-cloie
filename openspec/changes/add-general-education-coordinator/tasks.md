## 1. Approve and align the change

- [x] 1.1 Approve the new OpenSpec capabilities and record the complete Secretary, Dean, Coordinator, Program Head, and Faculty role matrix for General Education assignments.
- [x] 1.2 Approve whether all Coordinators share one college-wide General Education scope or require separate portfolios. If portfolios are required, stop and create a separate assignment-scope change.
- [x] 1.3 Approve the first analytics evidence source as Course-bound General Education evidence only, or stop and define the central-deployment contract before implementation.
- [x] 1.4 Update `openspec/config.yaml` with `GEN_ED_COORDINATOR` and the approved role and scope rules.
- [x] 1.5 Update `src/features/auth/CONTEXT.md` with the pre-provisioned Coordinator role and approved scope model.
- [x] 1.6 Update `src/features/course-assignments/CONTEXT.md` with the approved General Education assignment stewardship and Coordinator read/write boundaries.
- [x] 1.7 Update `src/features/analytics/CONTEXT.md` with the approved cross-Program General Education Course-bound evidence scope.
- [x] 1.8 Record the ILO ownership and write-authority conflict as deferred. Do not amend the conflicting sources or add an ILO catalog mutation path in this change.

Affected paths: `openspec/config.yaml`, `src/features/auth/CONTEXT.md`, `src/features/course-assignments/CONTEXT.md`, `src/features/analytics/CONTEXT.md`, and the change's proposal and design artifacts.

Acceptance: the role, complete assignment matrix, shared-scope decision, and
analytics source policy have approved sources of truth. The ILO conflict is
recorded as deferred, and this change adds no ILO catalog mutation path.

Verification: `openspec validate add-general-education-coordinator --type change --strict`.

Proposed commit: `docs(general-education-coordinator): approve role scope and ownership boundaries`

## 2. Add the role and database enum

- [x] 2.1 Add `GEN_ED_COORDINATOR` to the Prisma `SystemRole` enum in the identity domain model.
- [x] 2.2 Run `pnpm exec prisma validate --schema prisma` and `pnpm exec prisma generate --schema prisma`.
- [x] 2.3 Generate and review the Supabase migration with `pnpm supabase:migration:diff -- add_gen_ed_coordinator_role`.
- [x] 2.4 Run `pnpm supabase:push:dry-run`, apply the approved migration with `pnpm supabase:push`, and regenerate types with `pnpm supabase:types`.
- [x] 2.5 Verify the generated Supabase role type includes `GEN_ED_COORDINATOR` without hand-editing `src/types/supabase-database.ts`.

Affected paths: `prisma/models/identity-access.prisma`, the generated Supabase migration path, and `src/types/supabase-database.ts`.

Acceptance: PostgreSQL, Prisma, and generated Supabase types accept the new role, and existing role values and single-role constraints remain unchanged.

Verification: `pnpm exec prisma validate --schema prisma`, `pnpm exec prisma generate --schema prisma`, `pnpm build`.

Proposed commit: `feat(auth): add General Education Coordinator role enum`

## 3. Ship the role and route shell end to end

- [x] 3.1 Update role intent and self-service eligibility so `GEN_ED_COORDINATOR` is pre-provisioned and cannot be claimed through self-service.
- [x] 3.2 Update Secretary account creation validation and service logic so an institutional email is required and `program_id` is not required for the Coordinator.
- [x] 3.3 Update post-login destination resolution so complete Coordinators land on `/gen-ed-coordinator/dashboard`.
- [x] 3.4 Update role labels, visuals, exhaustive `Record<SystemRole, ...>` maps, staff portal cards, and mobile navigation.
- [x] 3.5 Update demo and development fixtures without enabling demo authentication or reset behavior against primary Production.
- [x] 3.6 Add focused tests for provisioning, self-service denial, complete login routing, inactive accounts, incomplete account states, and role-map exhaustiveness.
- [x] 3.7 Create the `/gen-ed-coordinator` role layout with one `SessionGuard` using `allowedRoles={[ROLES.GEN_ED_COORDINATOR]}`.
- [x] 3.8 Add dashboard, Course Assignments, analytics, and profile route shells with the existing authenticated-shell fallback.
- [x] 3.9 Add route or section loading states and role-scoped retryable error boundaries that preserve the outer application shell.
- [x] 3.10 Render initial list data from Server Components and keep Client Components limited to forms, dialogs, local interaction, charts, and browser APIs.
- [x] 3.11 Add Coordinator navigation with deepest-route active state, pending link feedback, keyboard access, drawer focus handling, and mobile touch targets.
- [x] 3.12 Add route tests proving unauthorized users fail closed, loading fallbacks do not expose protected data, and complete Coordinators reach the dashboard.

Affected paths: `src/features/auth/services/role-intent.ts`, `src/features/auth/services/self-service-eligibility.ts`, `src/features/auth/services/resolve-post-login-destination.ts`, `src/features/users/services/create-user-by-secretary.ts`, `src/features/users/schemas/create-user.ts`, `src/features/users/lib/role-visuals.ts`, `src/lib/constants/navigation.ts`, `src/lib/constants/demo-users.ts`, `src/app/(app)/gen-ed-coordinator/layout.tsx`, `src/app/(app)/gen-ed-coordinator/dashboard/page.tsx`, `src/app/(app)/gen-ed-coordinator/course-assignments/page.tsx`, `src/app/(app)/gen-ed-coordinator/analytics/page.tsx`, `src/app/(app)/gen-ed-coordinator/profile/page.tsx`, route `loading.tsx` and `error.tsx` files, and matching auth, user, navigation, and route tests.

Acceptance: a Secretary can provision a complete Coordinator without a Program, self-service role claim fails closed, complete Coordinator login reaches an authorized dashboard in the same slice, and account-state behavior remains unchanged for every existing role.

Verification: `pnpm vitest run src/__tests__/features/auth src/__tests__/features/users src/__tests__/features/portals src/__tests__/app src/__tests__/lib/navigation.test.ts`, `pnpm lint`, `pnpm build`, and browser checks at representative desktop and mobile viewports.

Proposed commit: `feat(auth): add General Education Coordinator role shell`

## 4. Transfer General Education assignment authority

- [x] 4.1 Update `canManageCourseAssignment()` to receive `courseScope` and `courseProgramId` and use `CourseScope.GENERAL_EDUCATION` for Coordinator policy decisions.
- [x] 4.2 Update `resolveAssignmentCourse()` to select `course_scope` and `program_id` for every mutation authorization check.
- [x] 4.3 Apply Coordinator and Secretary transfer rules to create, update, activation, deactivation, deletion, deletion preflight, and bulk creation.
- [x] 4.4 Update the Coordinator list read to enforce the General Education predicate regardless of URL filters and keep the 100-record page maximum.
- [x] 4.5 Update Course pickers, published curriculum option reads, and Faculty search authorization for `GEN_ED_COORDINATOR`.
- [x] 4.6 Add the concrete `general-education` assignment mode to list state and `CourseAssignmentsPageShell`.
- [x] 4.7 Keep target Program selection across all active Programs and keep Faculty search cross-Program.
- [x] 4.8 Hide Coordinator roster and on-behalf evaluation-publication actions and keep Program Head General Education rows read-only.
- [x] 4.9 Update the Program Head ownership label to identify the General Education Coordinator without adding mutation controls.
- [x] 4.10 Add server tests for the full role matrix, forged query filters, bulk creation, and all assignment lifecycle paths.

Affected paths: `src/features/course-assignments/policies.ts`, `src/features/course-assignments/services/manage-course-assignments.ts`, `src/features/course-assignments/services/list-course-assignments.ts`, `src/features/course-assignments/services/load-course-assignment-list-page.ts`, `src/features/course-assignments/services/search-faculty-pool.ts`, `src/features/course-assignments/course-assignment-list-state.ts`, `src/features/course-assignments/components/course-assignments-page-shell.tsx`, `src/features/course-assignments/components/course-assignments-table.tsx`, `src/features/course-assignments/components/course-assignment-form-dialog.tsx`, and `src/__tests__/modules/course-assignments/`.

Acceptance: after the approved transfer, Coordinators can manage only General Education CourseAssignments across Programs; Secretary General Education mutations are denied; Program Head and Faculty boundaries remain intact.

Verification: `pnpm vitest run src/__tests__/modules/course-assignments`, `pnpm lint`, `pnpm build`.

Proposed commit: `feat(course-assignments): transfer General Education stewardship`

## 5. Preserve optional curriculum provenance

- [x] 5.1 Extend Coordinator assignment creation to offer valid published `CurriculumCourse` options for the selected target Program.
- [x] 5.2 Validate `CourseAssignment.course_id == CurriculumCourse.course_id` and `CourseAssignment.program_id == CurriculumVersion.program_id` on the server.
- [x] 5.3 Keep the curriculum link nullable and immutable after creation while retaining assignment operational fields.
- [x] 5.4 Add tests for valid links, mismatched Course or Program links, null historical links, inactive Course visibility, and retired Curriculum visibility.

Affected paths: `src/features/course-assignments/services/manage-course-assignments.ts`, `src/features/curriculum/services/read-curriculum-pages.ts`, `src/features/course-assignments/components/course-assignment-form-dialog.tsx`, and `src/__tests__/features/curriculum/` plus `src/__tests__/features/course-assignments/backfill-course-assignment-curriculum.test.ts`.

Acceptance: curriculum selection supplies optional provenance only and never changes roster, evaluation, or assignment authority.

Verification: `pnpm vitest run src/__tests__/modules/course-assignments src/__tests__/features/curriculum`.

Proposed commit: `feat(course-assignments): validate Coordinator curriculum provenance`

## 6. Preserve the unresolved ILO catalog boundary

- [x] 6.1 Keep Secretary ILO writes denied, keep removed Secretary routes redirected, and add no Coordinator ILO mutation path in this change.
- [x] 6.2 Record a separate follow-up change request if the institution chooses an ILO catalog owner and write path.
- [x] 6.3 Add regression tests proving crafted Secretary and Coordinator ILO mutations fail, Faculty alignment remains unchanged, and the General Education readiness rule remains at least one active manifested mapping per CILO.

Affected paths: `src/features/outcomes/services/manage-outcome-writes.ts`, Secretary Learning Outcomes route redirects, `src/features/outcomes/CONTEXT.md`, `src/__tests__/features/outcomes/manage-outcome-writes.test.ts`, and `src/__tests__/app/secretary-learning-outcomes-redirect.test.tsx`.

Acceptance: this change preserves the current denial and redirect behavior. A separate approved change must define any future ILO catalog owner and write path.

Verification: `pnpm vitest run src/__tests__/features/outcomes/manage-outcome-writes.test.ts src/__tests__/app/secretary-learning-outcomes-redirect.test.tsx`.

Proposed commit: `test(outcomes): preserve unresolved ILO write boundary`

## 7. Add General Education analytics

- [x] 7.1 Add the approved General Education analytics capability and update the Analytics context for cross-Program Course-bound evidence.
- [x] 7.2 Create a sibling server-only General Education analytics read service that authorizes `GEN_ED_COORDINATOR` before querying.
- [x] 7.3 Scope evidence to submitted Course-bound evaluations whose Course has `course_scope = GENERAL_EDUCATION`, excluding Program-specific evidence and Central Deployments.
- [x] 7.4 Implement academic-period filters, overview counts and means, Course breakdowns, comparable trends, and qualitative aggregate feedback.
- [x] 7.5 Use `EvaluationAssignment` opportunities as the response-rate denominator and represent zero-opportunity rates as unavailable.
- [x] 7.6 Keep rating counts separate from response counts, use instrument structure snapshots for categories, and preserve full server precision.
- [x] 7.7 Serialize only aggregate DTOs, bounded word-frequency tokens, labels, counts, and authorized review links.
- [x] 7.8 Add responsive Recharts views with semantic tokens, accessible exact values, table alternatives, loading states, empty states, and actionable errors.
- [x] 7.9 Add tests for mixed evidence, submitted-only filtering, denominator semantics, comparability breaks, aggregate-only payloads, privacy, and unauthorized requests.

Affected paths: `src/features/analytics/services/general-education-analytics.ts`, `src/features/analytics/general-education-analytics-types.ts`, `src/features/analytics/services/` aggregation helpers, `src/features/analytics/components/`, the Coordinator analytics route, `src/features/analytics/CONTEXT.md`, `src/__tests__/features/analytics/`, and `src/__tests__/modules/analytics-reporting-and-review/`.

Acceptance: Coordinators can inspect only authorized General Education Course-bound evidence across Programs, with no raw comments, identifiers, Central Deployment evidence, or Program-specific evidence in the result.

Verification: `pnpm vitest run src/__tests__/features/analytics src/__tests__/modules/analytics-reporting-and-review`, `pnpm lint`, `pnpm build`, and desktop/mobile browser checks.

Proposed commit: `feat(analytics): add General Education evidence analytics`

## 8. Verify and document the assembled change

- [x] 8.1 Run focused Vitest tests for role, route, assignment, curriculum, outcomes, and analytics slices.
- [x] 8.2 Run `pnpm lint` and `pnpm build` from the assembled change.
- [x] 8.3 Run database tests only with `RUN_DATABASE_INTEGRATION_TESTS=1` against a disposable database.
- [x] 8.4 Run browser verification at representative desktop and mobile viewports for login, Course Assignments, and analytics.
- [x] 8.5 Review the final diff for generated-file handling, privacy payload keys, authorization checks, and unrelated changes.

Acceptance: all affected slices pass focused verification, lint, build, privacy checks, and responsive workflow checks.

Verification: `pnpm vitest run <affected-test-paths>`, `pnpm lint`, `pnpm build`.

Proposed commit: `test(general-education-coordinator): verify role assignment and analytics boundaries`
