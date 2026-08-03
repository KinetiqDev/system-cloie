## Why

`ProgramHeadAssignment` already permits one `PROGRAM_HEAD` account to hold multiple active Program assignments, while several Program Head pages and commands still select an unordered first assignment. A Program Head can therefore read, create, or close records for an unintended Program even though the account role check succeeds.

Issue #170 requires a deliberate Program context so each Program Head workflow has one verified management scope. The change also makes Secretary account editing preserve the complete assignment set instead of replacing an arbitrary active assignment.

## What Changes

- Add a canonical, route-based Program Head management context at `/program-head/programs/[programId]/...` and a non-authoritative Program selector for accounts with multiple manageable Programs.
- Add reusable server-side Program Head context resolution that authenticates the `PROGRAM_HEAD` role, loads the complete active assignment set, and validates the selected active Program before a scoped read or command proceeds.
- Change Program Head dashboards, outcomes and mappings, Program-specific Courses, Course Assignments, instrument templates and baseline copies, central deployments, reviews, analytics, reports, and their navigation/action paths to operate on the selected Program only.
- Revalidate assignment authority and selected-resource ownership inside sensitive Program Head write transactions.
- Keep static Program Head URLs as compatibility redirects to the Program Head entry route; they never infer a Program from an unordered record or a remembered preference.
- Update Secretary Program Head editing from one managed Program to an assignment-set editor. It activates selected assignments, deactivates unselected assignments, reactivates historical rows where possible, and preserves assignment history rather than deleting and recreating rows.
- Add multi-Program seed data and zero, one, multiple, inactive, unauthorized, stale-assignment, and cross-Program regression coverage.

**BREAKING**: Canonical Program Head management URLs gain a `/programs/[programId]` segment. Existing static Program Head management URLs redirect to the entry route and cannot imply a Program when more than one assignment is active.

## Capabilities

### New Capabilities
- `program-head-program-context`: route-based selection, server-side selected-Program authorization, Program-scoped Program Head navigation, reads, commands, and empty/error behavior.
- `program-head-assignment-administration`: Secretary-managed Program Head assignment sets, lifecycle-preserving activation/deactivation, and protected change confirmation.

### Modified Capabilities
- None.

## Impact

- Affected contexts: Identity and Access, Academic Structure, Course Catalog and Assignments, Academic Calendar, Learning Outcomes, Instruments, Evaluations, Analytics, and Reporting.
- Affected modules: `src/app/(app)/program-head`, `src/features/auth`, `academic-structure`, `course-assignments`, `outcomes`, `instruments`, `evaluations`, `analytics`, `users`, `src/lib/actions`, `src/lib/constants/navigation.ts`, and Program Head fixtures/tests.
- Authorization: Program Head authority remains server-side. A user-editable route parameter, form field, remembered selection, or client navigation state is a requested scope only and is never authority. `UserRole.user_id` remains unique; this is not multi-role support.
- Data model: the existing `ProgramHeadAssignment` one-to-many model, active flag, unique `(program_head_id, program_id)` constraint, and Program `RESTRICT` deletion behavior remain sufficient. No Prisma model change, SQL migration, generated Supabase type change, or data backfill is proposed for the core feature.
- Schema and deployment risk: remote Supabase currently has no multi-Program assignment rows, so seeds and tests must create one. The remote schema matches the relevant Prisma columns, but `program_head_assignments` and related core public tables have RLS disabled and broad PostgREST grants. This pre-existing direct-data-access risk is documented for separate security work; this change continues to authorize through server-only Prisma services and does not claim to remediate RLS.
- Caching and freshness: no persistent user or Program Head authorization cache is introduced. Route path revalidation becomes Program-specific. Any future remembered Program preference is convenience only and must not alter server authorization or bypass the multi-Program selector.
- Unchanged: Supabase Auth remains the identity/session provider; PostgreSQL and Prisma remain application-data authority; Secretary and Dean retain all-program authority; General Education management restrictions and Course-assignment ownership rules remain intact; no new backend, state store, authorization platform, Radix dependency, or database write is introduced during design.
