## Context

System CLOIE currently accepts an exact `email` CSV and immediately calls `addRosterMembership` once per valid row. `importCourseRoster` already authorizes the assignment once, batch-loads matching users and memberships, then uses short row transactions; however, email is the lookup and mutation input and there is no preview or reconciliation state.

`StudentAcademicProfile.student_id_number` is nullable, unverified text with no database uniqueness, index, ownership, or institutional-source constraint. Nevertheless, `projectRosterEligibility` requires at least five characters and therefore disagrees with the Identity and Access profile gate, which treats the profile row as complete. The field is also projected into onboarding, Secretary management, Student profile, enrollment/evaluation previews, fixtures, tests, generated types, ADR 0001, the Identity and Access glossary, and the canonical-name spec.

ADR 0014 makes `User.name` one opaque canonical account name. ADR 0007 makes active `CourseAssignmentMembership` rows the Course-bound recipient source and keeps `StudentEnrollment` as period placement and an eligibility input. This design uses names only to discover and reconcile authorized candidate accounts, then crosses the roster boundary using `User.id`.

The current roster management surface is a Client Component Dialog on desktop and Drawer on mobile with `Add members` and `Results`. Preview and results are component-session-only. The new flow extends that established surface without persistent draft imports, shared caching, or a client data-fetching library.

## Goals / Non-Goals

**Goals:**

- Accept substantially unedited official name rosters while preserving every source row, including repeated names.
- Explain exact, suggested, ambiguous, and no-match resolution without treating a name as identity proof.
- Keep candidate discovery assignment-authorized, bounded, privacy-safe, and compatible with irregular Students.
- Reuse one candidate-scope and identity-based mutation contract for bulk reconciliation and manual add.
- Revalidate all authority, scope, lifecycle, eligibility, membership, and conflict conditions at confirmation.
- Remove Student ID completely and replace its roster-completeness proxy with the actual profile and placement contract.
- Preserve explicit membership, restoration/audit history, SQL conflict constraints, and Course-bound evaluation sourcing.

**Non-Goals:**

- No unique `User.name`, parsed first/middle/last fields, canonical-name overwrite, or normalized-name persistence.
- No automatic user creation, roster inference from `StudentEnrollment`, automatic section movement, prerequisite checking, or fuzzy identity proof.
- No preview/draft table, refresh recovery, browser storage, shared cache, import history, background job, or new matching package.
- No email-entry fallback and no Student-entered replacement identifier.
- No changes to central-deployment enrollment targeting beyond removing Student ID display/data.

## Decisions

### 1. Remove Student ID through a code-first contract migration

Release gate A removes every handwritten read, write, validation rule, DTO field, UI field, fixture value, eligibility dependency, test expectation, and active documentation reference while the nullable database column remains. A production verification gate confirms the deployed application no longer queries the column.

Release gate B removes `student_id_number` from `prisma/models/identity-access.prisma`, generates a Supabase migration with `pnpm supabase:migration:diff -- remove_student_id_number`, reviews and dry-runs the SQL, applies it, then regenerates `src/types/supabase-database.ts` with `pnpm supabase:types`. Historical migrations are never edited. Existing values are discarded; rollback restores application code only before gate B, while recovery after gate B requires a new forward migration rather than recreating untrusted data.

After removal, Student profile sufficiency means a `StudentAcademicProfile` exists with a valid active Program and, when that Program has active Majors, an active Major belonging to it. Active assignment-period placement remains a separate eligibility requirement. Program-specific assignments require profile and placement Program alignment; General Education assignments accept any valid active placement in the assignment period.

Alternative rejected: one coordinated application/schema release. Old code can query a dropped column during rollout or rollback.

### 2. Parse a bounded, ordinary one-column name CSV

The parser accepts fatal UTF-8 decoding with optional BOM and standard CSV quoting/escaped quotes. It recognizes exactly one non-empty column headed `name` or `Student Name`, case-insensitively after trimming. It ignores entirely blank rows, rejects non-empty extra columns, requires 1–100 data rows, and preserves `sourceIndex` plus the original decoded source value.

Each comparison value uses Unicode NFKC, Unicode-aware case folding, trim, and whitespace collapse and must contain 1–200 characters. Unusable row values remain visible as `INVALID_NAME`; file-level encoding, header, extra-column, empty-file, or row-limit failures prevent preview. Repeated names are never deduplicated.

Alternative rejected: mechanically renaming the current unquoted email parser. Opaque names legitimately contain commas, apostrophes, dashes, and quotes.

### 3. Authorize once and batch-load an eligibility-aligned candidate population

Initial preview calls a server operation that authenticates the active role and resolves the target `CourseAssignment` through the existing roster authorization seam. It batch-loads all relevant Students (eligible and diagnostic in a single batched query), current assignment memberships, active same-Course/period/Program conflicts, profile Program/Major context, and active assignment-period placement. It performs bounded matching for all source rows in memory; no per-row database query exists.

Selectable population:

- Program-specific Course assignment: active Student role/account, sufficient profile, and active assignment-period placement whose profile and placement Program match the assignment Program. Year level, section, and Major do not exclude legitimate irregular Students.
- General Education Course assignment: active Student role/account, sufficient profile, and any active assignment-period placement.

A secondary diagnostic lookup is limited to strongly name-matching Students in the authorized academic neighborhood. Diagnostic accounts are non-selectable and show only safe reason and authorized current context. Candidate search uses the same scope, requires at least two normalized characters, returns at most 10 ranked results with no pagination/browse mode, and uses a 300 ms debounced, stale-request-safe client interaction.

Academic placement is secondary ordering only. Equal name evidence ranks assignment Program/year/section and Major context higher but never resolves same-name ambiguity.

Alternative rejected: filtering strictly by year/section, which makes irregular Students impossible to resolve. Institution-wide search is rejected as unnecessary account enumeration.

### 4. Use explainable conservative name evidence

Strict equality uses only NFKC, case folding, trim, and whitespace collapse. Exactly one selectable candidate at that tier is `EXACT_MATCH` and may be preselected.

Suggestion rules operate on temporary tokens and closed reason codes. They may recognize ordered-token subsequences caused by omitted/extra middle tokens, punctuation-normalized initials, separator punctuation variants, recognized suffix differences, and diacritic folding. All canonical and uploaded values remain unchanged. A suggestion exists only when exactly one selectable candidate satisfies the same strongest evidence tier and no competitor does. Generic fuzzy/edit-distance values may rank candidates but never prove identity, progressively weaken matching, or appear as a confidence percentage.

Several equal-tier candidates are `AMBIGUOUS`; database order and class context cannot select one. No sufficiently safe selectable candidate is `NO_MATCH`. Repeated source rows retain independent resolution and faculty maps each to a distinct account.

### 5. Keep three separate state dimensions

Identity resolution: `EXACT_MATCH | SUGGESTED_MATCH | AMBIGUOUS | NO_MATCH | INVALID_NAME`.

Preview disposition: `READY_CREATE | WILL_RESTORE | ALREADY_ACTIVE | INELIGIBLE | OTHER_SECTION_CONFLICT | SKIPPED`. Already-active rows are informational and need no skip or mutation. Removed memberships may be ready to restore. Known ineligible/conflicting diagnostics are non-selectable.

Final outcome: `CREATED | RESTORED | ALREADY_ACTIVE | ACCOUNT_INACTIVE | PROFILE_INCOMPLETE | NO_ACTIVE_TERM_PLACEMENT | PROGRAM_MISMATCH | OUT_OF_SCOPE | OTHER_SECTION_CONFLICT | READ_ONLY | UNEXPECTED_FAILURE | UNPROCESSED`.

The summary groups Ready, Review, Resolve, Skipped, and Already active while rows retain precise typed state. Suggestions display a safe reason label, not a score. The overall confirmation requires a checkbox acknowledging the current suggested-match count; changing a suggested selection clears it. Every unresolved/invalid row must be explicitly skipped.

### 6. Keep preview and results in component memory only

`course-roster-management.tsx` remains the justified Client Component boundary for Dialog/Drawer state, file input, reconciliation choices, candidate-search interaction, suggestion acknowledgement, and final results. Closing or refreshing loses preview state; dirty close/escape/swipe opens an accessible discard confirmation. Results and failed export remain available until the workspace closes. No token, secret, cache, storage, or database draft exists.

The Server Component roster detail continues supplying authorized assignment summary and `canWrite`; client visibility is never authority.

### 7. Confirm only internal identities through batch preflight and short row transactions

The confirmation request contains `assignmentId`, optional selected `programId`, actionable `{ sourceIndex, studentUserId }` rows, explicit skipped indexes, and suggested acknowledgement. Names, emails, candidate DTOs, and preview statuses are not mutation authority. Live server revalidation of candidate eligibility, assignment mutability, and conflicts makes client contract-version tracking redundant.

Before writes, the server authenticates, reauthorizes, validates request/source-index structure, rejects duplicate selected `User.id` values across the entire request with zero writes, checks roster mutability, batch-loads submitted identities, and requires every identity to belong to the current server-recomputed candidate scope. An arbitrary otherwise-eligible ID outside scope fails closed.

Each accepted row then uses a short transaction with the existing assignment lock and rechecks authorization, selected Program scope, mutability, Student role/account, profile, assignment-period placement, existing/restorable membership, and active other-section conflict. Expected row conflicts do not block later rows. An unexpected failure preserves prior commits, marks the failing row `UNEXPECTED_FAILURE`, later rows `UNPROCESSED`, and stops with one opaque reference. If the whole roster becomes read-only before writes, confirmation returns a request-level lifecycle failure and performs zero writes.

Manual add searches the same candidate service. Explicit candidate selection followed by Add calls the same identity-based single-row mutation without a second preview.

### 8. Preserve the evaluation boundary

Course-bound preview and publication continue reading active `CourseAssignmentMembership` and persisting respondent `User.id` values. They remove Student ID projection/display but never rerun name resolution. Central Student deployment continues using its existing authorized enrollment source while removing Student ID from its DTO/UI.

### 9. Keep errors and exports privacy-safe

Unexpected logs contain operation, actor ID, assignment ID, source row index, error class/code, and opaque reference; they contain no uploaded names or emails. Failed export columns are `row,name,status,error` plus optional non-email academic context needed to explain a selected/current candidate. It excludes candidate email, internal IDs, alternative candidate lists, raw exceptions, and support references.

### 10. UI composes the existing responsive workspace

The workspace steps become `Add members`, `Review and resolve`, and `Results`. Assignment context and counts remain visible. Review supports filters for Ready, Review, Resolve, Skipped, and Already active; row actions are Confirm/Change/Resolve/Skip as applicable. Candidate cards show canonical name, ACD email, Program, year, section, and Major because the authorized roster detail already exposes email and these fields are needed for disambiguation.

Desktop uses the existing Dialog; mobile uses the existing Drawer with scrollable content, reachable footer, 44 px controls, no required hover behavior, and no horizontal page overflow. Wide row data uses adaptive cards/stacked content on mobile rather than a desktop table forced into the viewport.

### 11. Exact affected paths

**Create:**

- `docs/adr/0015-name-based-course-roster-resolution-and-student-id-removal.md`
- `openspec/changes/replace-student-id-with-name-roster-resolution/specs/course-roster-name-resolution/spec.md`
- `openspec/changes/replace-student-id-with-name-roster-resolution/specs/course-roster-identity-confirmation/spec.md`
- `openspec/changes/replace-student-id-with-name-roster-resolution/specs/student-id-deprecation/spec.md`
- Delta specs under this change for `canonical-user-name` and `course-roster-management-workspace`
- Cohesive roster resolution/search services under `src/features/course-assignments/services/` as implementation naming is finalized

**Modify:**

- `prisma/models/identity-access.prisma`
- `src/types/supabase-database.ts` by generation only
- `src/features/auth/CONTEXT.md`
- `src/features/course-assignments/CONTEXT.md`
- `docs/adr/0001-complete-secretary-created-accounts.md`
- `docs/adr/0014-google-authoritative-account-names.md`
- `docs/system-cloie-user-journeys.md`
- `openspec/specs/canonical-user-name/spec.md` through change sync
- Student ID consumers under `src/lib/schemas/student-profile.ts`, `src/lib/actions/onboarding-actions.ts`, `src/app/(public)/onboarding/student-profile-form.tsx`, `src/app/(app)/student/profile/page.tsx`, `src/features/users/`, `src/features/enrollments/`, `src/features/evaluations/`, `prisma/seed/`, and `scripts/bootstrap-outline-defense-demo.ts`
- Roster types, schemas, parser, services, actions, responsive workspace, read models, and focused tests under `src/features/course-assignments/`, `src/lib/actions/course-roster-actions.ts`, and `src/__tests__/`
- Evaluation respondent preview types/services/components/tests that currently project Student ID

**Delete after cutover:** no application file is necessarily deleted; the generated migration drops the database column.

## Cache Matrix

| Data/state | Key | Scope | Lifetime | Tags | Invalidation | Authorization boundary | Stale behavior |
|---|---|---|---|---|---|---|---|
| Authorized preview | N/A | request response + component memory | open workspace | none | close/reset/re-upload | server assignment authorization | confirmation recomputes all authority and scope |
| Candidate search result | query + assignment request | component memory | current query | none | query change/close | server assignment authorization and bounded scope | stale requests ignored |
| Final results | N/A | component memory | until close | none | close | confirmation already authorized | session result reflects its completed attempt |
| Course roster detail | N/A | request-only | request | none | existing route revalidation | existing server read service | next render reads current state |

No data is persistently or shared cached.

## Risks / Trade-offs

- [Names can never prove identity] Mitigation: conservative states, explicit faculty reconciliation, email/placement context, duplicate-ID rejection, and `User.id` persistence.
- [Irregular Students increase candidate ambiguity] Mitigation: do not exclude by year/section; use placement only for ranking and human review.
- [Candidate search exposes account data] Mitigation: existing authorized audience, same assignment scope, two-character minimum, top 10, no pagination/browse, no cache/exported emails.
- [Preview is lost on refresh] Accepted tradeoff: component-only state avoids disproportionate draft/token infrastructure; dirty-close warning prevents common accidental loss.
- [Row-wise writes create partial success] Intentional and existing behavior; exact results and failed export make completion explicit.
- [Application/schema skew during Student ID removal] Mitigation: two gated releases with code-first verification before generated `DROP COLUMN`.
- [Matching rule changes while an old client is open] Mitigation: internal contract version rejects stale confirmation before writes.
- [Large reconciliation UI on mobile] Mitigation: 100-row cap, filters, adaptive cards, scrollable Drawer body, persistent reachable actions.

## Migration Plan

1. Record ADR/glossary/spec contract changes and implement release gate A: remove Student ID from every application contract while leaving the nullable column.
2. Verify focused onboarding, Secretary management, roster eligibility, enrollment, evaluation preview, profile, seed/demo, lint, tests, and build against the compatibility schema.
3. Implement name parsing, batch preview, bounded search, three-step reconciliation, identity confirmation, and manual add; verify desktop/mobile runtime workflows and security scenarios.
4. Deploy gate A and verify no production code path reads or writes `student_id_number`.
5. Remove the Prisma field, generate and review the Supabase migration, run `pnpm supabase:push:dry-run`, apply, and regenerate Supabase types.
6. Run complete regression and archive only after schema and application contracts agree.

No implementation begins from this exploration session; the artifacts define the later apply work.