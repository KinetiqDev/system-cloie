## Why

System CLOIE needs a distinct role for college-wide General Education Course
assignment work. General Education Courses already carry the scope that defines
the Coordinator's authority, so the change can add a role without inventing a
fake Program, a Program Head assignment, or a second scope table.

The repository has conflicting Institutional Learning Outcome ownership records.
ADR 0005 and the institutional-outcomes change name the Secretary as owner, while
the active Secretary access-removal specification and live services deny
Secretary ILO writes. This change must resolve that conflict before adding any
ILO catalog mutation path.

## What Changes

- Add `GEN_ED_COORDINATOR` as a pre-provisioned, single account role that requires
  an institutional email and no `program_id`.
- Add the role's guarded route tree, post-login destination, navigation, role
  visuals, mobile navigation, development and demo fixtures, and account tests.
- **BREAKING:** Transfer General Education CourseAssignment mutation authority
  from Secretary to the Coordinator only after an approved OpenSpec change and
  Course Catalog and Assignments context update.
- The first-release design assumes college-wide Coordinator scope. Multiple
  Coordinators share that scope only if the institution approves that account
  model. Do not add an assignment table unless the institution requires separate
  portfolios.
- Use `Course.course_scope == GENERAL_EDUCATION` as the server-side assignment
  boundary for list reads, Course selection, curriculum options, faculty search,
  create, update, activation, deactivation, deletion, deletion preflight, and
  bulk creation.
- Reuse the assignment workspace with a concrete `general-education` mode. Keep
  target Program selection and cross-Program Faculty search.
- Keep Program Head General Education assignment views read-only. Do not grant
  the Coordinator roster management, evaluation publication, Course CRUD,
  curriculum authoring, CILO authoring, or CILO-to-ILO mapping.
- Resolve Institutional Learning Outcome catalog ownership and write authority
  as a separate approved decision. Until the sources agree, keep current
  Secretary denial behavior and add no ILO catalog editor.
- Add a separate General Education analytics read path for submitted,
  Course-bound evidence across Programs. Exclude Program-specific evidence and
  Central Deployments. Amend the Analytics context before implementing the
  cross-Program contract.
- Preserve the single-role account invariant, Faculty's Course-level CILO
  alignment responsibility, General Education at-least-one readiness, archived
  target behavior, aggregate-only analytics payloads, and request-scoped privacy
  boundaries.

## Capabilities

### New Capabilities

- `general-education-coordinator-role`: Pre-provisioned role, account state,
  guarded routes, navigation, and shared college-wide scope.
- `general-education-assignment-management`: Coordinator management of General
  Education CourseAssignments across Programs with server-enforced scope.
- `general-education-analytics`: Aggregate analytics for submitted
  General Education Course-bound evidence across Programs.

### Modified Capabilities

No existing capability requirements change. The new role and analytics specs
consume the existing route-rendering, navigation, read-efficiency, and chart
contracts. The approved implementation must still update the role inventory and
domain contexts where the new behavior changes their documented scope.

## Impact

- **Identity and Access:** Prisma `SystemRole`, PostgreSQL enum migration,
  canonical role inventory, account provisioning, role intent, route guards,
  post-login routing, fixtures, and role maps.
- **Course Catalog and Assignments:** assignment policy inputs, list scopes,
  course and curriculum option queries, faculty search allowlist, assignment UI
  mode, and Secretary/Coordinator authorization tests.
- **Curriculum:** optional published `CurriculumCourse` selection and link
  validation remain advisory provenance. `CourseAssignment` remains the
  operational class record.
- **Analytics:** new server-authorized cross-Program General Education evidence
  scope, aggregate DTOs, response-rate denominators, qualitative privacy, and a
  synchronized Analytics context.
- **Outcomes:** ownership conflict documentation only until an approved owner is
  selected. No new outcome tables, ILO attainment rollup, or ILO-to-PLO crosswalk.
- **Database and generated types:** Prisma schema and Supabase migration for the
  role enum, followed by Prisma generation and `pnpm supabase:types`. Do not
  hand-edit generated types.
- **Privacy and caching:** no shared cache for authorization-dependent data,
  rosters, evaluation assignments, responses, or qualitative comments. Analytics
  returns aggregate-only data.
- **Verification:** focused role, assignment, analytics, and route tests;
  `pnpm lint`; `pnpm build`; and browser verification at desktop and mobile
  viewports when the UI slices land. Database tests use only a disposable test
  database with explicit opt-in.
