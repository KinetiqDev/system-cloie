---
title: "General Education Coordinator implementation proposal"
kind: historical-project-source
status: historical
as_of: 2026-08
source_file: "General Education Coordinator implementation proposal.md"
---

> Historical System CLOIE material. Do not use this document to infer current
> system behavior. Verify current behavior against CONTEXT.md, ADRs,
> implementation, schema, and tests.

# General Education Coordinator implementation proposal

## Recommendation

Add `GEN_ED_COORDINATOR` to `SystemRole`.

Do not add any of the following:

- a `GenEdCoordinatorAssignment` table;
- a fake General Education `Program`;
- `ProgramHeadAssignment` rows for General Education;
- a generic management-scope framework;
- a second copy of the Program Head pages and services.

The Coordinator's assignment scope can come from an existing domain fact:

```text
Course.course_scope == GENERAL_EDUCATION
```

General Education is already a college-wide Course category. A General Education
Course may have no owning `program_id`, while each `CourseAssignment` still has a
required `program_id` for the class context. Adding another assignment relation
would duplicate a fact the database already stores.

This fits the single-role identity model. `UserRole.user_id` is unique, so each
user has one stored account role. A Program Head's authority narrows through
`ProgramHeadAssignment`; the Coordinator's authority narrows through
`Course.course_scope`.

There is one decision to resolve before implementation. The repository disagrees
about ownership of the Institutional Learning Outcome catalog. ADR 0005 and the
`introduce-institutional-learning-outcomes` change assign it to the Secretary.
The active `secretary-outcome-access-removal` specification and the live services
deny Secretary ILO writes. Neither source assigns the catalog to the Coordinator.
Resolve that conflict through an approved OpenSpec change and synchronized domain
documentation before adding any ILO editor.

The first release should give the Coordinator a role-owned shell, General
Education CourseAssignment management, and General Education analytics. It
should not grant roster management, evaluation publication, Course CRUD,
curriculum authoring, CILO authoring, or CILO-to-ILO mapping by implication.

The no-table recommendation assumes that every Coordinator has the same
college-wide authority over all General Education Courses. If Coordinators need
separate portfolios, `Course.course_scope` cannot identify who owns which
Courses. That requirement would need an explicit assignment model.

## What exists today

### Identity and Program Head scope

The current role enum contains:

```text
SECRETARY
DEAN
PROGRAM_HEAD
FACULTY
STUDENT
ALUMNI
INDUSTRY_PARTNER
```

Program Head authority has two parts:

1. the user's global `PROGRAM_HEAD` role;
2. one or more active `ProgramHeadAssignment` records.

`resolveProgramHeadContext()` checks a selected `programId` against those active
assignments. Mutation services repeat the assignment check inside their
transactions. That is why Program Head URLs include a selected Program, such as
`/program-head/programs/[programId]/...`.

The Coordinator has no equivalent selected-Program context. A General Education
Course can be assigned to several Programs, so a Program is the class context,
not the Coordinator's management scope.

Adding a role also touches the existing role infrastructure. The change must
update role intent, self-service eligibility, staff portal cards, post-login
routing, navigation, role visuals, mobile navigation, demo and development
fixtures, and exhaustive `Record<SystemRole, ...>` mappings. Secretary, Dean,
and Program Head are pre-provisioned administrative roles. The Coordinator
should follow that pattern and should not be available through self-service role
claim.

### General Education is already a Course scope

The schema has two Course scopes:

```prisma
enum CourseScope {
  GENERAL_EDUCATION
  PROGRAM_SPECIFIC
}
```

A General Education Course is shared across the institution. Its `program_id`
may be null. A `CourseAssignment` still requires a `program_id`, because the
actual class belongs to a Program context and needs its own year level, section,
academic period, and Faculty Member.

For example, one `GESTECH` Course can have assignments for BSIT, BSED, and
BSBA. Those assignments refer to the same Course and keep separate class
contexts.

Curriculum placement follows the same separation. A shared Course can appear in
many Program curricula. The current curriculum integration is optional, though.
`CourseAssignment` still stores the operational `course_id`, `program_id`, year
level, academic period, and section. A future or active curriculum link records
the selected published `CurriculumCourse` as provenance. It does not replace
those assignment fields or authorize curriculum editing.

### Current assignment ownership

The current assignment policy is:

```text
Secretary       all General Education and Program-specific assignments
Dean            all General Education and Program-specific assignments
Program Head    Program-specific assignments in assigned Programs
Faculty         cannot manage CourseAssignments
```

The Secretary and Dean all-program behavior is implemented in the assignment
services and documented in the Course Catalog and Assignments context. Moving
General Education mutation authority to the Coordinator is therefore a real
authorization change. It is not a route rename or a UI-only change.

Program Heads may view General Education assignments in their selected Program,
but they cannot manage them. The new Coordinator must not change that read-only
view into a mutation path.

### Cross-Program Faculty assignment

The assignment page already searches active Faculty affiliations across Programs
and deduplicates the results. Affiliation is displayed as context, not as an
assignment restriction.

A Faculty Member affiliated with BSIT can teach a General Education Course in
BSED or another Program without changing the Faculty Member's affiliation. The
Coordinator should use this existing cross-Program search.

### Institutional Learning Outcomes and CILO alignment

The data model already includes:

```text
InstitutionalOutcome
CILOInstitutionalOutcomeMapping
  cilo_id
  institutional_outcome_id
  manifestation
  created_by
  updated_by
```

General Education CILOs map to Institutional Outcomes with the same typed
manifestations used by Program-specific mappings:

```text
LEARNING
PRACTICE
OPPORTUNITY
```

The General Education readiness rule is not exhaustive across the catalog. Each
active General Education CILO needs at least one active Institutional Outcome
mapping with a non-null manifestation. Archived targets and mappings without a
manifestation do not satisfy live readiness or new publication.

Faculty owns the operational alignment workflow. Faculty authorization requires
an active CourseAssignment for the Course in an active Academic Period.
Affiliation alone is not enough. The General Education mapping set belongs to
the Course and applies to every assignment that uses that Course.

The role proposal must not confuse two separate jobs:

- catalog ownership, which ADR 0005 and
  `introduce-institutional-learning-outcomes` assign to the Secretary, despite
  the removal of Secretary write access;
- CILO alignment, which Faculty performs through the Course alignment workspace.

There is a documentation and implementation mismatch to resolve. ADR 0005 and
the `introduce-institutional-learning-outcomes` change say that the Secretary
owns the ILO catalog. The active `secretary-outcome-access-removal` specification
requires the server to deny Secretary ILO writes. The Secretary Learning Outcomes
routes redirect to the dashboard, and `manage-outcome-writes.ts` has no live ILO
catalog write path. The Coordinator proposal must not choose an ILO owner until
these sources agree.

### Analytics today

Program Head analytics are selected-Program analytics. The current read path
combines Program-scoped Central Deployments with Course-bound evidence for the
selected Program.

That scope does not work for a General Education Coordinator. General Education
Courses can have assignments in several Programs, and a Program-wide Central
Deployment cannot be classified as General Education evidence merely because a
Coordinator is viewing it.

ILO attainment and ILO-to-PLO propagation are also deferred by ADR 0005 and the
Analytics context. The first Coordinator analytics release must not imply that
those calculations exist.

The Analytics context currently describes evidence within an explicitly selected
Program. Cross-Program General Education analytics would change that contract.
PR 4 therefore needs an approved OpenSpec capability and a synchronized Analytics
context before implementation.

## Proposed authorization model

The following matrix describes the recommended first release. "Dean unchanged"
means the current Dean behavior remains until the client makes a separate
decision.

The assignment transfer is **BREAKING**. The current Course Assignments context
gives the Secretary and Dean college-wide General Education authority. Do not
apply the matrix until an approved OpenSpec change and the domain context record
the transfer.

| Capability | Secretary | General Education Coordinator | Program Head | Faculty | Dean |
|---|---|---|---|---|---|
| View General Education assignments | Read-only if retained | Read and write | Read within selected Program | Own assignments | Current behavior |
| Create, edit, activate, deactivate, or delete General Education assignments | No under the proposed transfer | Yes | No | No | Current behavior |
| Manage Program-specific assignments | Yes | No | Assigned Programs | No | Current behavior |
| Search Faculty for assignment | Yes | Yes | Yes | No | Yes |
| Manage ILO catalog | Sources conflict; no live editor | No until ownership is approved | No | No | Read-only |
| Manage PLO catalog | No | No | Assigned Programs | No | Read-only |
| Create or manage CILOs | No by default | No | No | Assigned Courses | No |
| Map a General Education CILO to an ILO | Separate correction decision | No by default | No | Assigned General Education Courses | No |
| View General Education analytics | No new access | Yes | Existing Program view | Existing Course view | Existing oversight |
| View PLO analytics | No | No | Assigned Programs | Existing Course views | Existing oversight |

Two rows need an explicit product decision before the assignment transfer ships:

1. whether the Secretary keeps read-only visibility into General Education
   assignments after losing mutation authority;
2. whether the Dean keeps the current all-program mutation authority.

The ILO rows need a separate architecture decision because ADR 0005,
`introduce-institutional-learning-outcomes`,
`openspec/specs/secretary-outcome-access-removal/spec.md`, and the current
implementation do not agree.

### Make Course scope explicit in policy

`canManageCourseAssignment()` currently receives `courseProgramId` and treats a
null value as General Education. The Course model already has the authoritative
`course_scope`, so the policy input should carry both values:

```text
courseScope
courseProgramId
```

The policy should use `CourseScope.GENERAL_EDUCATION` directly. It should not
derive a security decision from a nullable foreign key.

The resulting rule is:

```text
GEN_ED_COORDINATOR
    allowed only when course_scope == GENERAL_EDUCATION

PROGRAM_HEAD
    allowed only when course_scope == PROGRAM_SPECIFIC
    and the Course belongs to the selected authorized Program

SECRETARY
    denied for General Education mutation under the proposed transfer
    retains Program-specific assignment authority

DEAN
    preserves current behavior until the client decides otherwise
```

`resolveAssignmentCourse()` must select both `program_id` and `course_scope`.
The authorization check must protect every mutation path:

- create;
- update;
- activation;
- deactivation;
- deletion;
- deletion preflight;
- bulk creation.

Bulk creation has its own hardcoded role allowlist, so adding the role to the
shared policy is not enough.

### Lock list reads to General Education

The Coordinator must not use the unrestricted all-program list reader. The
service must add this condition for every Coordinator request:

```text
course.course_scope = GENERAL_EDUCATION
```

URL filters may narrow the result. They must never widen it to Program-specific
Courses. This rule must hold when a caller removes or forges the expected Course
scope filter.

### Curriculum selection

When the assignment wizard offers curriculum selection, the Coordinator may
choose a valid published `CurriculumCourse` for the target Program. The link
must remain optional and immutable after creation. The service must validate:

```text
CourseAssignment.course_id == CurriculumCourse.course_id
CourseAssignment.program_id == CurriculumVersion.program_id
```

`CourseAssignment` remains the operational class record. The curriculum link
does not infer roster membership, evaluation recipients, or assignment scope.
Retired curricula and inactive Courses remain visible in historical reads, while
new assignment creation uses active published options.

### Faculty selection

Add `GEN_ED_COORDINATOR` to `searchFacultyPool()` and keep the search
cross-Program. Do not filter Faculty by the selected target Program. Show
affiliations as context, as the current service does.

### Roster and evaluation boundaries

An assignment row currently exposes roster actions to roles with roster
authority. Assigning a General Education Course to Faculty does not give the
Coordinator authority over student memberships.

For the first slice, hide roster-management actions from the Coordinator. Add a
read-only roster view only if the client asks for it. Do not add roster writes
without a separate decision.

The same boundary applies to publishing evaluations on behalf of Faculty. The
Coordinator should not receive on-behalf publication authority unless a later
requirement explicitly grants it.

## Routes and navigation

Use a role-owned route:

```text
/gen-ed-coordinator
```

Initial routes can be:

```text
/gen-ed-coordinator/dashboard
/gen-ed-coordinator/course-assignments
/gen-ed-coordinator/learning-outcomes
/gen-ed-coordinator/analytics
/gen-ed-coordinator/profile
```

The `learning-outcomes` route should be read-only or remain out of the first
release until the ILO ownership decision is recorded. It must not quietly turn
the Coordinator into the ILO catalog owner.

Put one `SessionGuard` on the `/gen-ed-coordinator` role layout, as the existing
role-owned routes do. Apply the full role-route rendering contract to its
descendants. That includes a protected authenticated-shell fallback, localized
loading and error states, server-rendered initial list data, and URL-backed list
filters.

The layout should use:

```text
allowedRoles={[ROLES.GEN_ED_COORDINATOR]}
```

Post-login routing should send a complete Coordinator account to:

```text
/gen-ed-coordinator/dashboard
```

The account should be pre-provisioned by a Secretary, require an institutional
email, and require no `program_id`. Roles that need no additional domain record
finish after `User` and `UserRole` are created.

Update the following role-dependent behavior:

- role intent and pre-provisioned-role checks;
- staff portal role cards;
- post-login destination resolution;
- role labels, icons, colors, and other role visuals;
- desktop and mobile navigation;
- demo and development authentication fixtures;
- exhaustive role maps and route tests.

Use the administrative mobile navigation pattern. Do not add a selected-Program
segment to Coordinator routes.

Do not copy the Program Head route tree. The first release does not need Courses,
Curricula, Tools, Reports, CILO Reviews, or evaluation deployment pages unless a
separate requirement assigns those responsibilities.

## Assignment interface

The existing assignment UI supports two modes:

```text
all-program
program-head
```

Add one concrete mode:

```text
general-education
```

This is a real third consumer with a different authorization and query boundary.
It does not justify a generic permission-configured component framework.

Reuse the existing table, filters, dialogs, wizard, pagination, faculty search,
academic-period behavior, and assignment mechanics where their data contracts
fit. The Coordinator mode should:

- receive only General Education Courses;
- allow selection of any active target Program;
- search Faculty across Programs;
- keep Course scope fixed to General Education;
- omit a Course Scope filter that cannot change;
- retain term, Faculty, Program, year-level, section, status, and search filters
  that still apply;
- show that General Education assignments are Coordinator-managed to read-only
  Program Head users.

The current shell and list-state types only know `all-program` and
`program-head`. Extend those types deliberately rather than passing an
unvalidated string through the page.

### Coordinator dashboard

Keep the first dashboard operational. It can show:

- active General Education assignments;
- General Education Courses with no active assignment, if the query has a clear
  definition and acceptable cost;
- a link to General Education analytics;
- ILO catalog status only when the Coordinator has an approved read path.

Do not clone the Program Head KPI dashboard before the Coordinator's reporting
requirements are known.

## Outcomes and ILO ownership

### Resolve ownership before building an editor

The documentation names the Secretary as owner, but the active specification and
the live services remove the Secretary's write access. The Coordinator can
receive a read-only catalog or readiness view if the product needs one, but the
Coordinator cannot create, edit, archive, restore, or reorder ILOs until the
ownership and write-authority conflict is resolved.

The current missing ILO editor is a separate gap. Until the sources are
reconciled, tests should cover only the current denial and redirect behavior.
Any restored editor should use the existing protected-write pattern:

```text
create
update
archive
restore
reorder
```

The write must include exact before-and-after review, explicit confirmation,
server-side authorization, a freshness check, and an atomic transaction. The
documented owner and the authorized writer do not agree because ADR 0005,
`introduce-institutional-learning-outcomes`,
`openspec/specs/secretary-outcome-access-removal/spec.md`, and the live services
disagree.

### Transfer path: only after an explicit ADR amendment

If the institution wants the Coordinator to own the ILO catalog and its write
authority, treat that as a separate **BREAKING** decision before implementing the
page. Update at least:

- ADR 0005;
- `openspec/specs/secretary-outcome-access-removal/spec.md`;
- `src/features/outcomes/CONTEXT.md`;
- the Institutional Outcome catalog and oversight specifications;
- Secretary and Coordinator authorization tests;
- the answer to Secretary correction authority for typed mappings;
- the route and navigation ownership of Learning Outcomes.

Do not solve this by adding a second ILO editor or by making the Coordinator a
special Secretary in application code.

### Faculty alignment remains separate

Faculty remains the primary operational mapper for both typed relations. For a
General Education Course, the alignment workspace loads active ILOs and saves a
Course-level mapping set with `LEARNING`, `PRACTICE`, or `OPPORTUNITY`
manifestations.

The Coordinator should not receive CILO authoring or CILO-to-ILO mapping rights
just because the Coordinator can manage the CourseAssignment. A later correction
workflow needs its own authorization and review contract.

Do not add any of the following to this change:

- an ILO-to-PLO crosswalk;
- dual CILO target mappings across both catalogs;
- exhaustive General Education mapping across every ILO;
- ILO attainment or rollup analytics.

## General Education analytics

### Scope the first read path to Course-bound evidence

The first Coordinator analytics contract should be:

```text
submitted Course-bound evidence
where CourseAssignment.Course.course_scope == GENERAL_EDUCATION
```

The query spans Programs because General Education assignments do. It excludes:

- Program-specific Course-bound evidence;
- Central Deployments;
- evidence from a different Course scope;
- any evidence outside the Coordinator's authorized request.

Central alumni or industry evidence is not General Education evidence simply
because it is college-wide. There is no Course scope on a Program-wide central
deployment that can support that claim.

Use the existing Analytics rules:

- include submitted responses only;
- use `EvaluationAssignment` rows as the historical denominator;
- report no response rate when the denominator is zero;
- keep rating counts separate from response counts;
- retain full precision in server calculations and round only for display;
- read rating categories from the instrument structure snapshot;
- keep qualitative browser payloads aggregate-only.

### Reuse carefully

The following lower-level work may be reusable after a General Education source
query and DTO are defined:

- overview counts and means;
- academic-period filtering;
- trends with comparability breaks;
- Course breakdowns;
- qualitative token aggregation;
- response counts and labeled empty states;
- existing chart primitives and exact-value tables.

`getProgramHeadAnalytics()` is not a General Education authorization boundary.
Do not turn it into a universal analytics service before two real consumers need
the same helper. Build a sibling General Education read path, authorize it on
the server, and extract only helpers whose semantics match.

The Program Head Outcomes view is PLO-specific. Do not rename it and feed it
Institutional Outcomes. ILO analytics and attainment remain deferred until a
separate contract defines their evidence, mappings, thresholds, historical
interpretation, and privacy rules.

### Protect analytics data

The browser may receive counts, means, distributions, labels, source labels,
bounded word-frequency tokens, and links to independently authorized review
pages. It must not receive raw comments, response rows, respondent IDs, account
emails, or roster data.

Do not add a shared or persistent analytics cache. The read service must authorize
the Coordinator before it queries evidence, and each request must read its own
scope. Follow the existing server-side AI boundary if a later change adds
aggregate interpretation. Do not send raw comments to the browser or persist an
AI result.

## Testing strategy

Test the server behavior, not only the presence of a menu item.

### Role and authentication

Cover these cases:

- `GEN_ED_COORDINATOR` is a valid `SystemRole`;
- Secretary provisioning accepts an institutional email and no Program;
- self-service role claim rejects the Coordinator role;
- a complete Coordinator account lands on
  `/gen-ed-coordinator/dashboard`;
- another role cannot enter Coordinator routes;
- inactive-account behavior remains unchanged;
- all role maps and mobile navigation include the new role.

### Course assignments

Run the authorization matrix against create, update, activation, deactivation,
deletion, deletion preflight, and bulk creation:

```text
Coordinator + General Education Course       allowed
Coordinator + Program-specific Course        denied

Secretary + General Education Course         denied for mutation
Secretary + Program-specific Course           unchanged

Program Head + General Education Course       denied
Program Head + owned Program-specific Course  allowed
Program Head + foreign Program-specific Course denied

Faculty                                      cannot create assignments
Dean                                        current behavior
```

Also test that a forged list filter cannot make the Coordinator see
Program-specific assignments. Test the same General Education Course assigned
to BSIT, BSED, and BSBA. Test a Faculty Member whose primary affiliation is a
different Program.

### Outcomes

The outcome tests must follow the ownership decision that is recorded before
implementation.

Until ownership changes through an approved specification, test only the current
state:

- crafted Secretary ILO writes remain denied under the active specification;
- the Coordinator cannot mutate the ILO catalog;
- Secretary Learning Outcomes navigation is absent and the removed routes redirect;
- Faculty can still map an active General Education Course's CILOs to ILOs with
  typed manifestations;
- Faculty without an active assignment cannot map;
- the Coordinator cannot alter CILO-to-ILO alignment.

After ownership is approved, add the protected catalog tests for duplicate codes,
stale confirmation, full-catalog reorder, archive and restore, and archived-target
handling. Keep the mapping and readiness invariants in both versions.

### Analytics

Use mixed fixtures containing:

```text
General Education Course-bound evidence
Program-specific Course-bound evidence
Central stakeholder evidence
```

Prove that the Coordinator receives only submitted General Education
Course-bound evidence. Also test response-rate denominators, zero-opportunity
states, empty views, aggregate-only payload keys, qualitative privacy, and
unauthorized requests.

Add the approved analytics capability and update the Analytics context before
building the cross-Program read path. Test that the new read no longer assumes a
selected Program while still enforcing the Coordinator's General Education
scope.

Do not run database integration tests against the shared hosted Supabase
database. Use the repository's disposable test database and the explicit
`RUN_DATABASE_INTEGRATION_TESTS=1` opt-in when database tests are required.

## Open decisions

1. **Who owns the ILO catalog, and who may write it?** ADR 0005 and the
   `introduce-institutional-learning-outcomes` change assign ownership to the
   Secretary. `openspec/specs/secretary-outcome-access-removal/spec.md` and the
   live services deny Secretary ILO writes. The repository has no approved
   Coordinator owner or writer. Reconcile the ADR, both OpenSpec sources, the
   context, services, and tests before adding any ILO writes.
2. **What is the Coordinator account and scope model?** The first release may
   provision multiple Coordinators, and every Coordinator shares the same
   college-wide General Education scope. If the institution needs separate
   portfolios, add an explicit assignment model before provisioning them.
3. **Does the Secretary retain read-only General Education assignment access?**
    Removing ownership removes mutation authority, but it does not necessarily
    require hiding existing assignment records.
4. **Does the Dean retain General Education assignment mutation authority?**
    The default is to preserve current Dean behavior.
5. **Does the Coordinator manage student rosters?** The assignment requirement
    does not grant that access. The default is no roster action.
6. **Does the Coordinator publish evaluations on behalf of Faculty?** The default
    is no.
7. **Does the Coordinator manage the Course catalog or curriculum placement?**
    The default is no. The assignment wizard may consume valid published
    curriculum placements without granting curriculum authoring rights.
8. **What belongs in General Education analytics?** The first release should use
   Course-bound General Education evidence. Confirm whether the client also wants
   central stakeholder evidence or future ILO attainment work. Cross-Program
   evidence requires an Analytics context amendment.

## Implementation sequence

Before PR 1, create and approve an OpenSpec change for the role. The change must
define the new role, account-state behavior, route access, provisioning rules,
and acceptance tests. Update `openspec/config.yaml` and the Identity and Access
context as part of that approved change. Do not implement the role from this
proposal alone.

### PR 1: Establish the role

Vertical result: a pre-provisioned Coordinator can authenticate and reach an
authorized Coordinator shell.

Include:

- the `GEN_ED_COORDINATOR` enum migration;
- Prisma role updates;
- the canonical role inventory in `openspec/config.yaml` and the Identity and
  Access context;
- regenerated Supabase types;
- Secretary provisioning without a Program;
- pre-provisioned role and self-service rules;
- role intent and post-login destination;
- the `/gen-ed-coordinator` layout;
- dashboard and profile shell;
- navigation, role visuals, mobile navigation, and fixtures;
- authentication and route tests.

Follow the repository schema workflow for the enum change. Run
`pnpm exec prisma validate --schema prisma` and
`pnpm exec prisma generate --schema prisma`. Generate the Supabase migration from
Prisma, review it, run the dry run and push steps, then run
`pnpm supabase:types`. Apply the enum migration before deploying code that uses
the new value. Do not hand-edit generated types.

PostgreSQL enum values are not safely removed in a rollback. Recovery should
leave `GEN_ED_COORDINATOR` in the database, roll back the application paths that
use it, and prevent new Coordinator provisioning until a forward fix ships.

Do not change CourseAssignment behavior in this PR.

### PR 2: Transfer General Education assignment ownership

Vertical result, after approval of the breaking transfer: the Coordinator
manages General Education CourseAssignments across Programs, while forged
requests and other role boundaries remain closed.

Include:

- explicit `courseScope` and `courseProgramId` policy input;
- Coordinator authorization for General Education Courses;
- Secretary General Education mutation denial;
- a General Education-locked list read;
- a General Education-only Course picker;
- a target Program picker that includes every active Program;
- valid published curriculum options when the optional link is present;
- cross-Program Faculty search;
- the `general-education` assignment UI mode;
- the Program Head read-only ownership label;
- mutation, query-scope, curriculum-link, and forged-request tests.

Before implementation, amend the Course Catalog and Assignments context and add
the approved OpenSpec capability. Until then, keep the current Secretary and
Dean authorization tests unchanged.

Keep roster management and evaluation publication out of this PR.

### PR 3: Resolve ILO catalog ownership

Vertical result: the repository has one documented ILO owner and one authorized
catalog path.

First reconcile ADR 0005, `introduce-institutional-learning-outcomes`,
`openspec/specs/secretary-outcome-access-removal/spec.md`, the Outcomes context,
the live services, and the tests. If the institution chooses the Secretary,
restore the catalog through the protected catalog-write contract. If it chooses
the Coordinator, amend ADR 0005 and the outcome specifications, then implement
the new owner as a separate breaking slice. Until that decision is recorded,
build no ILO catalog mutation path.

Include:

- the ownership decision and documentation update;
- the active OpenSpec capability update;
- the ILO list and read service;
- create, update, archive, restore, and reorder writes for the approved owner;
- review, explicit confirmation, and freshness protection;
- route and navigation ownership;
- authorization regression tests;
- tests proving Faculty CILO-to-ILO alignment remains unchanged.

Do not add new outcome tables or ILO attainment analytics.

### PR 4: Add General Education analytics

Vertical result: the Coordinator can inspect aggregate evidence from authorized
General Education Course-bound evaluations across Programs.

Start with:

- academic-period filtering;
- overview counts and means;
- trends with comparability rules;
- Course breakdowns;
- qualitative feedback without raw comments.

Before implementation, add the approved OpenSpec capability and update the
Analytics context to define cross-Program General Education evidence.

Use a General Education-specific server read path. Reuse aggregators and chart
components only when their data contracts do not encode Program Head scope or PLO
semantics.

Do not include Central Deployments, Program-specific evidence, ILO attainment, or
an ILO-to-PLO crosswalk in this release.

## Final shape

```text
SystemRole.GEN_ED_COORDINATOR
            |
            | authorization by Course.course_scope
            v
GENERAL_EDUCATION Courses
            |
            +-- CourseAssignments across Programs
            |
            +-- CILOs
                  |
                  +-- Faculty maps to Institutional Outcomes
                      with LEARNING / PRACTICE / OPPORTUNITY

General Education Coordinator
            |
            +-- manages General Education CourseAssignments
            +-- reads General Education analytics
            +-- reads ILO catalog/status if approved

Approved ILO catalog owner, unresolved
            |
            +-- owns the Institutional Outcome catalog after the sources agree

Secretary
            |
            +-- manages Program-specific assignments

Program Head
            |
            +-- manages Program-specific Courses in assigned Programs
            +-- reads General Education assignments in selected Programs
            +-- owns the PLO catalog
            +-- reads selected-Program analytics
```

The role is justified because it represents a distinct institutional actor with
its own login, navigation, and CourseAssignment workflow. A new scope table is
not justified because `CourseScope.GENERAL_EDUCATION` already identifies the
Courses the Coordinator manages.
