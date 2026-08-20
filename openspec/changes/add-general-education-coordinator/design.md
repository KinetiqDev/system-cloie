## Context

System CLOIE has one account role per User. Program Heads get additional scope
from active `ProgramHeadAssignment` rows because each Program Head may manage a
different set of Programs. General Education has a different boundary. A
General Education Course is shared, while every CourseAssignment still names the
Program that owns the class context.

The current assignment services treat Secretary and Dean as all-program managers.
Program Heads can view General Education assignments in their selected Program,
but their mutation policy applies only to Program-specific Courses. The
Coordinator change transfers General Education mutation authority only after an
approved breaking OpenSpec change. The first-release design also assumes that
every Coordinator shares the same college-wide General Education scope. That
scope model requires institutional approval before implementation.

The repository also contains conflicting ILO records. ADR 0005 and
`introduce-institutional-learning-outcomes` name the Secretary as catalog owner.
`openspec/specs/secretary-outcome-access-removal/spec.md` and the live services
deny Secretary ILO writes. This design does not add an ILO mutation path until
those sources are reconciled.

The first analytics scope crosses Programs, which differs from the current
Program-selected Analytics context. It therefore needs a new capability and a
context update rather than a broader interpretation of Program Head analytics.

## Goals / Non-Goals

**Goals:**

- Add `GEN_ED_COORDINATOR` as a pre-provisioned role without changing the
  single-role account invariant.
- Add a guarded, role-owned Coordinator route tree with server-first rendering,
  protected loading, localized recovery, responsive navigation, and URL-backed
  list filters.
- Let the Coordinator manage General Education CourseAssignments across all
  active Programs after approval of the breaking authorization transfer.
- Derive server authorization from `Course.course_scope`, not a nullable
  `Course.program_id`.
- Keep curriculum links optional, validate Course and Program consistency, and
  retain `CourseAssignment` as the operational class record.
- Add a separate server-authorized General Education analytics read model for
  submitted Course-bound evidence across Programs.
- Keep analytics aggregate-only, request-scoped, and compatible with the shared
  Recharts and accessible visualization contract.
- Preserve Faculty Course-level CILO-to-ILO mapping, General Education readiness,
  Program Head read-only General Education views, and current account-state rules.

**Non-Goals:**

- Do not add a Coordinator assignment table, fake Program, role stacking, or role
  switching.
- Do not grant roster management, evaluation publication, Course CRUD, curriculum
  authoring, CILO authoring, or CILO-to-ILO mapping to the Coordinator.
- Do not create or modify an ILO catalog editor until ownership and write
  authority are approved and recorded in ADR, OpenSpec, context, and tests.
- Do not add ILO attainment, ILO-to-PLO crosswalks, or central-deployment
  General Education analytics.
- Do not turn Program Head analytics into a universal analytics framework.
- Do not add a shared cache, a new chart library, a new client state library, or
  a new analytics service boundary.

## Decisions

### D1. Use one global Coordinator scope

If the institution approves the shared-scope model, provisioning
`GEN_ED_COORDINATOR` gives the account the same institution-wide General
Education scope as every other Coordinator. Server policy checks the Course
scope for every assignment operation. No per-Coordinator portfolio exists in
this design.

This keeps the model small because the database already identifies General
Education Courses. A separate assignment table would be needed only if the
institution later partitions Courses between Coordinators.

Alternative rejected: model the Coordinator as a Program Head with a fake
General Education Program. General Education Courses are not Program-owned, and
the assignment's Program is the class context rather than the Coordinator's
scope.

### D2. Add the role through the existing identity path

Add the enum value in the Prisma role model and generate the PostgreSQL enum
migration. Run Prisma validation and generation before code generation. Generate
the Supabase migration, review it, dry-run and apply it, then regenerate
`src/types/supabase-database.ts` with `pnpm supabase:types`.

Update the canonical role inventory, Identity and Access context, role intent,
Secretary provisioning schema and service, post-login routing, route guards,
navigation, role visuals, mobile navigation, fixtures, and exhaustive role maps.
The Coordinator is pre-provisioned, requires an institutional email, needs no
Program, and cannot be claimed through self-service.

Alternative rejected: add the enum and rely on a compile error to find every
consumer. Exhaustive role maps make the compiler useful, but account gates and
route behavior also need explicit tests and documentation updates.

### D3. Put one role guard at the route layout

Create the `/gen-ed-coordinator` role layout with the existing `SessionGuard`
pattern and `allowedRoles={[ROLES.GEN_ED_COORDINATOR]}`. Let descendant pages
inherit that guard. Add the role-route rendering contract to the new pages:

- role-neutral authenticated-shell fallback while session and account state
  resolve;
- route or section loading UI for asynchronous pages;
- retryable role-scoped errors that preserve the outer shell;
- Server Component initial list data;
- URL-backed list filters and page state.

Use separate Server Components for route reads and thin Client Components only
for dialogs, forms, local interaction, charts, and browser APIs. Keep initial
CourseAssignment records out of a mount-time Server Action.

Alternative rejected: guard every child page independently. That duplicates the
role boundary and makes it easier for one page to drift from the rest of the
route tree.

### D4. Add a concrete General Education assignment mode

Extend the existing assignment shell and list-state union from `all-program` and
`program-head` to include `general-education`. Keep the table, pagination,
filters, dialogs, wizard, academic-period behavior, and Faculty display where
their contracts fit. The new mode fixes Course scope to General Education,
allows every active target Program, and searches Faculty across Programs.

The server is the authority. Update `canManageCourseAssignment()` to receive
both `courseScope` and `courseProgramId`. Update `resolveAssignmentCourse()` to
select both fields. Apply the policy to create, update, activation,
deactivation, deletion, deletion preflight, and bulk creation. Bulk creation has
its own role allowlist and must be updated separately.

For Coordinator list reads, enforce `course.course_scope = GENERAL_EDUCATION`
inside the service. Query parameters can narrow the result but cannot widen it.
Use the same rule for Course pickers, curriculum options, and any page data that
could otherwise expose Program-specific Courses.

Alternative rejected: trust a hidden Course Scope field or a client-provided
`course_scope` filter. A crafted request must receive the same server-enforced
boundary as an ordinary UI request.

### D5. Keep curriculum provenance optional

The assignment wizard may offer a published `CurriculumCourse` for the selected
target Program. The optional link must satisfy:

```text
CourseAssignment.course_id == CurriculumCourse.course_id
CourseAssignment.program_id == CurriculumVersion.program_id
```

The link remains optional and immutable after creation. It does not determine
roster membership, evaluation recipients, or the operational assignment fields.
New creation reads active published options. Historical reads retain inactive
Courses and retired curricula.

Alternative rejected: make the curriculum link required or treat it as the
assignment's authority. Existing assignments may have no link, and the accepted
curriculum design keeps `CourseAssignment` as the record of what class ran.

### D6. Do not infer extra Coordinator permissions

The assignment page must hide Coordinator roster actions. The Coordinator also
cannot publish evaluations on behalf of Faculty. The Coordinator cannot edit
Courses, curricula, CILOs, or CILO-to-ILO mappings through this change.

Faculty remains the primary operational mapper. General Education mappings stay
Course-level and use `LEARNING`, `PRACTICE`, or `OPPORTUNITY`. General Education
readiness remains at least one active ILO mapping with a non-null manifestation
per active CILO.

### D7. Keep ILO ownership as a gated decision

Until the repository sources agree, preserve current Secretary ILO denial and
do not add Coordinator ILO writes. Add a read-only catalog or status view only if
the approved capability defines it.

If the institution assigns ILO write authority to the Secretary or Coordinator,
amend ADR 0005, the relevant OpenSpec specifications, `src/features/outcomes/CONTEXT.md`,
route ownership, and authorization tests before implementing protected catalog
writes. The write contract must include exact before-and-after review, explicit
confirmation, server authorization, freshness checking, and atomic persistence.

Alternative rejected: add a second ILO editor while ownership is unresolved. That
would leave two conflicting authorization paths in the application.

### D8. Build a separate cross-Program analytics read model

The Coordinator analytics source is:

```text
submitted Course-bound evidence
where CourseAssignment.Course.course_scope == GENERAL_EDUCATION
```

The query spans Programs. It excludes Program-specific Course-bound evidence,
Central Deployments, and any evidence outside the authorized request. The read
service rechecks the Coordinator role before querying data and returns a closed
DTO containing only aggregate data.

Use `EvaluationAssignment` rows for historical denominators. Include submitted
responses only. Keep response counts separate from rating counts, treat zero
opportunities as an unavailable response rate, and read category labels from the
instrument structure snapshot. Qualitative payloads contain only server-computed
word-frequency tokens and counts.

Create pure aggregation helpers separately from Prisma reads. Reuse an existing
helper only when its semantics do not encode selected Program or PLO scope. Do
not rename `ProgramHeadOutcomesView` or feed it ILOs. ILO attainment remains out
of scope.

Because the current Analytics context defines evidence within a selected Program,
the approved capability must update that context before this cross-Program read
model ships.

Alternative rejected: widen `getProgramHeadAnalytics()` into a universal service.
The source scope and authorization contract differ, so a sibling read path is
safer until two consumers prove that a helper is genuinely shared.

### D9. Keep analytics request-scoped and aggregate-only

Do not add persistent or shared caching for the Coordinator read model. The cache
matrix is:

| Data | Key | Scope | Lifetime | Tags | Invalidation | Authorization | Stale behavior |
|---|---|---|---|---|---|---|---|
| Coordinator analytics DTO | none | one request | one request | none | none | Coordinator role and General Education query scope before read | never served stale |
| Chart payload | none | one server response | one response | none | none | Server prepares and narrows aggregate DTO | not persisted |
| Filter and catalog options | none beyond request memoization | one request | one request | none | existing route behavior | role and active target scope | re-read next request |

Render charts through existing Recharts and shadcn chart primitives. Add visible
summaries, exact-value tables or equivalent accessible representations, labels,
loading states, empty states, and actionable errors. Do not send raw comments,
response rows, respondent IDs, account emails, roster data, or unused auth
context to the browser.

### D10. Record durable boundary decisions

The approved OpenSpec change must record the breaking Secretary-to-Coordinator
assignment transfer and the cross-Program analytics scope. If either decision
changes an accepted ADR or domain context, amend that record in the same approved
change before implementation.

## Risks / Trade-offs

- **[Authorization transfer and role matrix are not yet approved]** -> Resolve
  Secretary read/write, Dean read/write, Coordinator read/write, Program Head,
  and Faculty behavior before implementation. Keep current Secretary and Dean
  tests until the approved context records the complete matrix.
- **[ILO ownership and write authority conflict]** -> Add no ILO mutation path;
  test current denial and redirect behavior until the sources are reconciled.
- **[Multiple Coordinators need separate portfolios later]** -> State shared
  college-wide scope in the first release and add a separate assignment model
  only if the institution partitions responsibility.
- **[A forged filter widens a Coordinator list]** -> Apply the General Education
  predicate inside every server read and test requests that omit or alter URL
  scope parameters.
- **[Curriculum options become misleading]** -> Keep curriculum links optional,
  validate Course and Program identity, and retain assignment fields as the
  operational record.
- **[Cross-Program analytics changes the Analytics contract]** -> Require an
  approved capability and Analytics context update before PR 4.
- **[Analytics leaks private evidence]** -> Return closed aggregate DTOs only,
  keep the read request-scoped, and test serialized keys and forbidden values.
- **[PostgreSQL enum rollback is unsafe]** -> Leave the enum value in the
  database during recovery, roll back application paths, and block new
  provisioning until a forward fix is available.
- **[Large lists or analytics reads become slow]** -> Bound CourseAssignment
  pages at 100 records, use narrow selects, parallelize independent reads, and
  aggregate in the database or bounded server projections where possible.

## Migration Plan

1. Approve this change and its new capability specs. Update
   `openspec/config.yaml`, the Identity and Access context, the Course Catalog and
   Assignments context, and the Analytics context where the approved behavior
   changes their requirements.
2. Update the Prisma role enum and run:

   ```text
   pnpm exec prisma validate --schema prisma
   pnpm exec prisma generate --schema prisma
   ```

3. Generate and review the Supabase migration with
   `pnpm supabase:migration:diff -- <name>`. Run
   `pnpm supabase:push:dry-run`, apply with `pnpm supabase:push`, and regenerate
   types with `pnpm supabase:types`. Never hand-edit generated types.
4. Deploy the role and route slice only after the enum migration is available.
5. Deploy the approved assignment transfer with server policy, list-scope
   enforcement, optional curriculum validation, UI mode, and focused tests.
6. Preserve the current ILO denial and redirect behavior. Resolve catalog
   ownership and write authority in a separate breaking OpenSpec change.
7. Deploy the cross-Program General Education analytics slice only after its
   capability and Analytics context update are approved.
8. Verify each slice with focused Vitest tests, `pnpm lint`, `pnpm build`, and
   representative desktop and mobile browser checks. Run database tests only with
   `RUN_DATABASE_INTEGRATION_TESTS=1` against a disposable database.

Rollback is application-first. If the role slice fails, keep the PostgreSQL enum
value, disable Coordinator provisioning and routes, and deploy a forward fix. If
the assignment transfer fails, restore the previous application policy while
retaining compatible data. No Coordinator-specific data table is introduced.

## Open Questions

- Does the client approve the breaking transfer of General Education mutation
  authority from Secretary to Coordinator?
- Does the institution approve one shared college-wide scope for every
  Coordinator, or does it require separate Coordinator portfolios?
- Should Secretary retain read-only visibility into General Education assignments
  after the transfer?
- Does the Dean retain current all-program General Education mutation authority?
- Which role owns the ILO catalog and its write path? Resolve that question in a
  separate breaking OpenSpec change.
- Does the Coordinator need a read-only ILO catalog/status view?
- Does the client want central stakeholder evidence in General Education
  analytics, or only Course-bound evidence?
