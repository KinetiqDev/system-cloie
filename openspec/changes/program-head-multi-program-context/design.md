## Context

System CLOIE is a Next.js 16.2 App Router modular monolith. Supabase Auth establishes the session, `resolveAuthSession()` produces the request-scoped CLOIE account snapshot, Prisma accesses application data, and feature services enforce authorization. ADR `0001-single-role-accounts.md` and `UserRole.user_id @unique` retain one active CLOIE account role per User.

The role model and the Program Head scope model are separate facts:

| Domain term | Meaning and invariant |
| --- | --- |
| User | CLOIE's stable domain account, linked optionally to the Google-authenticated identity through `auth_user_id`. |
| CLOIE account role | The one `SystemRole` assigned through `UserRole`; this change retains one `PROGRAM_HEAD` role and does not add role switching. |
| Program Head | A User whose active CLOIE account role is `PROGRAM_HEAD`. |
| Program Head assignment | A durable row linking a Program Head to one Academic Program. `is_active` controls whether that row contributes to current Program Head authority. |
| Authorized Program set | The complete, database-derived set of Programs with active assignments for the current Program Head. It determines which selected Program IDs can be accepted. |
| Selected Program context | One Program deliberately requested by the Program Head through the route and verified against the authorized Program set for the current request. It is an operation context, not an account attribute. |
| Resource ownership | The required equality between a selected Program and a Program-scoped resource's owning or target `program_id`. Holding another active assignment does not authorize a write from the selected Program route. |
| Assignment activation/deactivation | A Secretary-managed reversible change to an assignment row's `is_active` value. It preserves the row, creation time, and relationship history. |
| Remembered Program preference | A future convenience for selecting a destination. It is not an authority record, does not bypass the selector, and is not part of this change. |

The existing model already supports the relationship. `prisma/models/identity-access.prisma` defines `ProgramHeadAssignment` with `is_active`, a unique `(program_head_id, program_id)` key, a cascading User foreign key, and a restrictive Program foreign key. Remote Supabase confirms the same columns and constraints, including `ON DELETE RESTRICT` for Program. The initial table migration used a different Program deletion action, but applied migration `20260711090617_restrict_program_deletion` supersedes it; current Prisma and remote schema agree.

Current evidence at `main` commit `1250e1c`:

- `src/features/outcomes/services/manage-program-head-outcomes.ts` reads all active IDs then uses `programIds[0]` for GO listing, creation, reorder, and CILO mapping listing.
- `src/features/instruments/services/manage-program-head-templates.ts`, `create-baseline-copy.ts`, and `src/features/academic-structure/services/manage-program-head-courses.ts` use the first active Program for creation or display.
- `src/features/evaluations/services/publish-central-deployment.ts` uses unordered `programHeadAssignment.findFirst()` for publish and close. `list-program-head-deployments.ts` labels one Program while returning records across every assigned Program.
- `src/app/(app)/program-head/dashboard/page.tsx` chooses one unordered assignment. Static Program Head navigation and action revalidation paths omit a Program segment.
- Existing Course Assignment, roster, Course-bound evaluation, and reviewer services mostly authorize against the complete assignment set. That behavior is correct for determining what can be selected, but selected Program routes must reduce their view and mutation context to one Program.
- Secretary's role-edit flow projects `program_head_assignments[0]`, accepts one `program_head.program_id`, and deactivates an arbitrary active row before activating another. It can silently lose the intended assignment set.

Remote data has six active Program Head assignment rows for six different Program Heads, so no live row currently exercises multi-Program behavior. It must not be interpreted as a one-Program institutional rule. The database permits multiple active assignments and Issue #170 explicitly requires that case.

Remote applied migration `20260802074840_reconcile_current_prisma_schema` is present locally under `supabase/migrations/`; no relevant column drift was found. Supabase advisors report that `public.program_head_assignments` and related core tables have RLS disabled and broad `anon`/`authenticated` grants. That is a pre-existing direct Data API security risk. This change keeps authority in server-only Prisma services and must not treat UI routes, JWT metadata, or the route segment as a substitute for RLS. RLS/grant remediation needs a dedicated security change because policies for the whole application data graph must be designed and tested together.

## Goals / Non-Goals

**Goals:**

- Give one `PROGRAM_HEAD` User a deliberate, validated, one-Program-at-a-time management context while preserving the one-role account invariant.
- Make `/program-head/programs/[programId]/...` the canonical Program Head management route family.
- Centralize complete-assignment-set resolution, selected-Program validation, and transaction-time revalidation behind a small server-only module interface.
- Require every Program Head read and command in scope to receive a selected `programId`, verify it against the complete active assignment set, and verify resource ownership against the selected Program.
- Preserve low-friction entry: zero assignments gives an actionable empty state, one redirects directly to that Program dashboard, and multiple gives a deliberate selector.
- Preserve Program Head assignment rows through Secretary activation/deactivation, including reactivation of historical rows, rather than deleting and recreating them.
- Make Program-specific navigation, links, action inputs, redirects, loading/error return paths, and revalidation paths retain the selected Program.
- Add a representative multi-Program seed identity and end-to-end module coverage without touching the linked Supabase project.

**Non-Goals:**

- Multi-role accounts, role switching, a `primary_program_id` field, or a Program Head primary/default Program institutional rule.
- Persisting last-selected Program, storing Program authorization in JWT `user_metadata` or `app_metadata`, or adding a global client store solely to retain Program selection.
- An implicit cross-Program dashboard, report, analytics total, mutation, bulk action, or mixed-program table. A future cross-Program summary is a separate read-only aggregation design.
- Changing Secretary or Dean all-program authority; Program Head General Education management limits; Course-assignment ownership; or Program lifecycle stewardship.
- A structural Prisma change, Supabase SQL migration, generated Supabase type edit, index, data backfill, or remote database write for this core behavior.
- Remediating the remote RLS/grant advisor findings in this change.

## Decisions

### 1. Preserve assignment-set authority and reject primary/default Program semantics

`ProgramHeadAssignment` remains the authority model. The authorized Program set is every row where `program_head_id` is the current User and `is_active` is true. There is no primary Program, default Program, or account-level selected Program column because repository evidence supplies no institutional rule for a rank among assignments.

A Program Head may have zero, one, or many active assignments. Secretary-created Program Head accounts continue to start with exactly one active Program Head assignment, as defined in `src/features/auth/CONTEXT.md`; subsequent protected Secretary edits can add, retain, deactivate, and reactivate assignments. Zero active assignments is allowed after creation so an administrator can temporarily remove all managed Program responsibility; it does not revoke the `PROGRAM_HEAD` account role.

`last selected Program` is a UI preference, not a domain fact. It is deliberately not stored in the User row, assignment row, cookie, JWT, or client store in this change. If added later, it can only suggest a navigation target after the server independently validates it against the current assignment set. It must never auto-select for a multi-Program management mutation.

This decision is durable and cross-cutting. Add `docs/adr/0009-program-head-selected-program-context.md` during implementation to record the assignment-set authority, route selection rule, and rejection of primary/default Program fields.

Alternatives considered:

- Add `primary_program_id` to `User` or `ProgramHeadAssignment`: rejected because it would invent a ranking and invite silent fallback behavior.
- Keep one static Program Head portal and filter all records by the full authorized set: rejected because it mixes Program work and makes a mutation's target ambiguous.
- Put active assignment IDs in user-editable JWT metadata: rejected because it is stale and insecure for authorization; server database checks remain authoritative.

### 2. Use a route-selected Program entry flow and canonical path builders

Create an entry route at `/program-head` and make the canonical management family:

```text
/program-head
/program-head/profile
/program-head/programs/[programId]/dashboard
/program-head/programs/[programId]/courses
/program-head/programs/[programId]/course-assignments
/program-head/programs/[programId]/outcomes
/program-head/programs/[programId]/outcomes/mapping
/program-head/programs/[programId]/tools
/program-head/programs/[programId]/tools/new
/program-head/programs/[programId]/tools/[id]/edit
/program-head/programs/[programId]/tools/publish
/program-head/programs/[programId]/cilo-evaluations/new
/program-head/programs/[programId]/cilo-reviews
/program-head/programs/[programId]/cilo-reviews/[evaluationId]
/program-head/programs/[programId]/cilo-reviews/[evaluationId]/responses/[responseId]
/program-head/programs/[programId]/course-rosters/[assignmentId]
/program-head/programs/[programId]/analytics
/program-head/programs/[programId]/reports
```

`/program-head/profile` remains account-scoped because it displays the full assignment set and is not a management context. Every old static management page under `src/app/(app)/program-head/` becomes a compatibility redirect to `/program-head`; it must never call `findFirst()` or choose a Program. This avoids retaining bookmarked semantics that would select a different Program after assignment changes. A generic `/course-rosters/[assignmentId]` request made by a Program Head likewise returns the Program Head entry flow rather than inferring a selected context from the assignment. Program Head course-list links use the new Program-specific roster wrapper; Faculty, Secretary, and Dean retain their existing generic route behavior.

Create `src/lib/constants/program-head-routes.ts` as the single route-construction module for entry, Program-specific paths, and safe child path builders. Modify `src/lib/constants/navigation.ts`, `src/components/layout/sidebar.tsx`, `mobile-sidebar-drawer.tsx`, and `mobile-nav.tsx` to derive Program Head navigation links from the current pathname's Program segment through that module. The client only preserves a server-validated segment in links; it does not resolve or authorize a Program. On `/program-head/profile` and a legacy redirect route, Program Head management links return the entry route.

The `/program-head` Server Component resolves the sorted active assignment set and follows this state machine:

```text
PROGRAM_HEAD request
  -> no active assignments: render actionable empty state
  -> one active assignment: redirect to its canonical dashboard path
  -> more than one active assignment: render Program selector links
  -> selected canonical route: resolve selected Program against full set
```

The selector is a server-rendered link list with Program code and name, using installed shadcn/Base UI `Empty`, `Card`, and `Button` primitives. It needs no client state. The selector appears for multiple active assignments even when a potential future preference exists. A compact Program context header in the dynamic layout displays the selected Program and links back to the selector, making Program switching deliberate. It is a Server Component; no `use client` boundary is required.

The dynamic layout receives `params: Promise<{ programId: string }>` as required by Next.js 16 and awaits it before resolving context. Route-level loading and error files move with the pages so selected Program navigation keeps existing meaningful skeleton and recovery behavior. Dynamic metadata, when required, derives only from the already-authorized selected Program.

Alternatives considered:

- Search parameter selected Program: rejected because nested links, form redirects, action revalidation, and bookmarks can drop or override it.
- Cookie-only selection: rejected because it is less visible, not linkable, and can become stale; it may be added later only as a hint to `/program-head`.
- A global React context/Zustand store: rejected because it would duplicate server authority, add synchronization failure modes, and make copied links ambiguous.

### 3. Create a deep Program Head context module at the authorization seam

Create `src/features/auth/services/resolve-program-head-context.ts`. Its external interface is intentionally small:

```ts
type ProgramHeadProgram = {
  id: string;
  code: string;
  name: string;
};

type ProgramHeadContext = {
  userId: string;
  authorizedPrograms: ProgramHeadProgram[];
  selectedProgram: ProgramHeadProgram;
};

resolveProgramHeadEntry(): Promise<ProgramHeadEntryResult>
resolveProgramHeadContext(programId: string): Promise<ServiceResult<ProgramHeadContext>>
revalidateProgramHeadAssignment(
  tx: Prisma.TransactionClient,
  input: { userId: string; programId: string }
): Promise<ProgramHeadProgram | null>
```

The module hides session resolution, role assertion, assignment query shape, de-duplication, stable Program-code ordering, active-assignment absence, and selected-membership checking. `resolveProgramHeadContext()` obtains the current session and rejects an absent or non-`PROGRAM_HEAD` session. It returns all authorized Programs and exactly one selected Program only when the requested `programId` is in that set. `revalidateProgramHeadAssignment()` is the transaction-only internal seam: an already-authenticated write uses it with the transaction client before a Program-dependent write. It checks the current assignment row again; it does not trust a context captured before the transaction.

This is a deep module: callers learn one context interface, while the implementation owns all assignment lookup behavior. It replaces duplicated `findMany`, `findFirst`, `programIds[0]`, and local full-set derivation. It is not a generic role resolver and does not introduce adapters where none vary.

Independently callable public services and Server Actions call `resolveProgramHeadContext(programId)` before reading. Helpers that receive an already-validated `ProgramHeadContext` are explicitly named `...ForContext` and remain private to an owning feature or a page; they never become unguarded public service entry points. Transactional commands resolve authentication and selected context first, then call `revalidateProgramHeadAssignment()` inside the write transaction immediately before querying or mutating the target resource.

The context module uses Prisma and the current session only. It has no persistent cache. `React.cache()` may deduplicate the context within one server request only if the key includes the request-local selected Program and it never leaks the result across requests. Because assignments can change during a session, a cache component, `unstable_cache`, or client authority cache is prohibited.

### 4. Require selected Program and resource ownership for every Program Head operation

Every Program Head-facing feature in scope receives the selected `programId` from the canonical route and treats it as a requested scope. The action schema validates UUID format, the context resolver verifies assignment membership, and each read or command verifies the target resource belongs to `context.selectedProgram.id`.

| Area | Required Program-scoped behavior |
| --- | --- |
| Dashboard and Analytics | `getProgramHeadDashboard(programId)` remains the independently authorized entry. Dashboard, charts, and future analytics query exactly the selected Program. The current `analytics` and `reports` stubs render the selected Program identity and do not expose mixed totals. |
| Outcomes and mappings | `listProgramGOs`, GO create/update/archive/reorder, and CILO mapping list/actions accept `programId`. Every GO and mapping target must belong to the selected Program. Existing serializable outcome write confirmation retains its transaction-time scope check, changed to require the selected Program as well as assignment membership. |
| Program-specific Courses | Create accepts the selected `programId`; a major must belong to that same Program. Update/toggle revalidate assignment authority in a transaction and reject a resource outside selected Program. General Education remains read-only to Program Heads. |
| Course Assignments and rosters | List queries set `program_id` to the selected Program, not `{ in: authorizedPrograms }`. Form options, faculty reads, course queries, and roster wrappers are selected-Program scoped. Existing Program Head policy checks retain full-set validation but a route operation additionally requires its assignment/resource Program to equal selected Program. |
| Course-bound reviews and evaluation operations | Review lists, detail, response review, course-bound publication, respondent preview, roster actions, late inclusion, and roster back links carry the selected Program. An assignment or evaluation outside selected Program is unavailable from that context even if the actor manages it elsewhere. |
| Instrument templates and baseline copies | List, create, duplicate, edit, activate, delete, and faculty-accessible changes accept selected `programId`. Program-owned templates must match it; institutional baselines can be copied only into it. Template versions/deployments remain protected by existing lifecycle rules. |
| Central deployments | List and labels query only selected Program. Publish, respondent preview, and close all require selected `programId`; deployment/template/major/respondent eligibility is rechecked for that Program in the transaction. Client-provided curated respondent IDs are intersected with or rejected against the server-derived selected Program target set, so they cannot add another Program's respondents. |
| Reports | Current placeholders are selected-Program routes only. A later cross-Program report must be a separately authorized read-only aggregation and must not reuse a management route or mutation interface. |

The caller must not be able to use a selected BEED route to edit a BSED resource merely because the same User also has a BSED assignment. For pages, detail routes, and roster wrappers, an invalid or unassigned selected Program and a selected-Program/resource mismatch resolve to the existing not-found/non-disclosure behavior where that feature uses it. For Server Actions, return a safe scope failure without raw identifiers or database detail.

Sensitive commands must revalidate both conditions inside their transaction:

1. the current User still has an active assignment for the selected Program;
2. the target resource still belongs to that selected Program and still satisfies its current lifecycle/freshness rules.

This supplements, rather than replaces, resource-specific conditions such as active Program for GO creation, Course Assignment identity locks, template versioning, published-evaluation locks, and outcome confirmation freshness.

### 5. Make Server Actions carry validated request scope and revalidate dynamic routes precisely

Program Head Server Actions add a required `programId` field to their Zod inputs or typed action arguments. Route pages pass it into forms, action props, callbacks, redirects, and links. A hidden input can carry the selected ID for a form because server context resolution validates it; it is not an authorization token. No action may derive a Program by record order, omit the selected Program for a `PROGRAM_HEAD` caller, or accept a resource Program field as authoritative.

Add route invalidation helpers beside `src/lib/constants/program-head-routes.ts` or the owning feature actions. A mutation invalidates its exact selected Program page(s), for example:

```text
/program-head/programs/{programId}/outcomes
/program-head/programs/{programId}/outcomes/mapping
/program-head/programs/{programId}/tools
/program-head/programs/{programId}/course-assignments
```

It also preserves required Secretary, Dean, Faculty, Student, or generic resource route revalidation. Remove stale static Program Head paths, including the current nonexistent `/program-head/deployments` invalidation. Next.js `revalidatePath()` is called only from Server Actions/server code, after the write succeeds and before a redirect when both occur. No broad Program Head layout invalidation is used as a substitute for identifying affected selected routes.

The cache contract is intentionally narrow:

| Read or write concern | Key / scope | Lifetime | Tag or path invalidation | Authorization boundary | Stale behavior |
| --- | --- | --- | --- | --- | --- |
| Program Head context | session User plus requested Program | request only | none | `resolveProgramHeadContext()` before all Program Head reads | Assignment changes take effect on next request and inside write transactions. |
| Program Head dashboards, outcomes, courses, assignments, rosters, templates, deployments, reviews, analytics, reports | selected Program plus feature-specific resource/filter state | request only | selected canonical path after a successful mutation | selected context plus resource ownership service check | Never shared across Programs or Users. |
| Program Head navigation link generation | pathname segment only | browser render only | router navigation | server validates destination on request | An invalid copied segment is rejected by the dynamic layout. |
| Future remembered selection | not introduced | not applicable | not applicable | cannot authorize anything | At most a selector hint after server revalidation. |

### 6. Update Secretary Program Head management as a protected assignment-set edit

Modify `src/features/users/schemas/edit-user.ts`, `get-user-edit-record.ts`, `edit-user-by-secretary.ts`, `src/lib/actions/secretary-edit-user-actions.ts`, and `src/features/users/components/secretary-users-list/edit-user-dialog.tsx` so a Program Head edit carries `program_head.program_ids: string[]`, not a singular `program_id`.

The edit record returns all active and historical assignment rows needed for a clear assignment-set review. The dialog renders an accessible multi-select checkbox fieldset of active Programs, preselects every active assignment, and shows explicit before/after Program names in the existing protected-edit confirmation. It uses installed Base UI `Checkbox` with `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, and labels. If the dialog is converted to React Hook Form while implementing this slice, it uses `customZodResolver` from `src/lib/forms/zod-resolver.ts`, never `@hookform/resolvers/zod`.

The Secretary-only service locks the target User's assignment rows, verifies the target User still has the `PROGRAM_HEAD` role and is not the acting Secretary, validates each newly selected Program is available under current Program lifecycle rules, and applies the complete desired set in one transaction:

- selected existing rows become or remain `is_active = true`;
- selected historical rows are reactivated;
- selected Programs with no row receive one new row;
- unselected active rows become `is_active = false`;
- no assignment row is deleted or recreated solely to change selection.

The confirmation review signs the complete prior set and desired set. The transaction re-reads the set and rejects a stale confirmation rather than overwriting an intervening assignment administration change. Existing role revocation behavior remains: a `PROGRAM_HEAD` role cannot be revoked while any assignment is active.

The existing standalone assignment-management service in `src/features/users/services/manage-users.ts` already uses upsert/reactivation and deactivation. Reuse or consolidate that lifecycle behavior rather than creating a second inconsistent implementation. Secretary-created account creation retains one required `program_id` and creates exactly one initial assignment. It does not become a multi-Program creation form in this change because the established glossary defines that creation invariant; the protected assignment-set edit immediately supports subsequent additions.

### 7. Keep the existing schema and document why no index or migration is added

No Prisma model or SQL migration is required. The unique `(program_head_id, program_id)` index already supports transaction revalidation by both IDs and can use its leading `program_head_id` for the complete assignment-set query. Current assignments are few per User; no measured query demonstrates a need for a partial `(program_head_id) WHERE is_active` index. The Supabase performance advisor reports that `program_head_assignments.program_id` has no standalone foreign-key index, but this change does not add a Program-only lookup. A Program deletion/audit performance change needs an `EXPLAIN`-backed, separately scoped index decision.

Implementation must:

1. leave `prisma/models/identity-access.prisma` unchanged unless implementation uncovers a documented model mismatch;
2. leave `supabase/migrations/` unchanged for the core behavior;
3. not hand-edit `src/types/supabase-database.ts` and not run generated-type changes when schema remains unchanged;
4. add a multi-Program test/seed fixture by adding assignment rows through the existing seed lifecycle, not by mutating remote data;
5. treat the unique key as the protection against duplicate concurrent activation and convert a uniqueness race to a safe assignment-set result;
6. use `pnpm supabase:migration:diff -- <name>`, review, `pnpm supabase:push:dry-run`, `pnpm supabase:push`, and `pnpm supabase:types` only if a separately justified schema change becomes necessary.

Rollback is code-only: restore static route behavior only if the product decision itself is reversed, but do not reintroduce `programIds[0]` or unordered `findFirst()` selection. Assignment history survives because edits are state transitions, not deletes. There is no data backfill or generated type rollback.

## Risks / Trade-offs

- [Dynamic Program paths break bookmarks and hard-coded links] -> Keep static management routes as entry redirects, centralize path builders, and cover every navigation/action/back-link/redirect with route tests.
- [A page layout validation is mistakenly treated as the sole authorization check] -> Independently callable services and Server Actions resolve Program Head context themselves; sensitive writes revalidate in the transaction.
- [A Program Head uses a second valid assignment to mutate a resource from the currently selected Program route] -> Require selected Program/resource equality in addition to full-set assignment validation.
- [Assignment changes race with a long-lived form or protected confirmation] -> Sign the complete set, lock/re-read it in the transaction, reject stale reviews, and revalidate Program Head authority immediately before writes.
- [A client tampers with hidden `programId`, route segment, template ID, deployment ID, or respondent IDs] -> Zod validates shape; database context validates assignment; transaction checks resource ownership and respondent eligibility; errors stay safe.
- [Changing Program routes mixes UI state between Programs] -> Use Program-specific canonical paths and revalidation; do not retain an unscoped tab, form action, selector, or global store.
- [Inactive Program lifecycle semantics become ambiguous] -> Assignment activation remains separate from Program deactivation. This change preserves existing resource lifecycle checks and records the potential selector policy question below rather than inventing a new Program lifecycle rule.
- [Remote RLS-disabled tables undermine a route-level authorization design] -> Treat server-only Prisma authorization as application behavior, not a Data API hardening claim; create a dedicated RLS/grants design with end-to-end policy tests before exposing direct access.
- [More route files increase maintenance] -> The dynamic layout and centralized route builders localize context behavior; static files become minimal compatibility redirects rather than duplicate feature implementations.

## Migration Plan

1. Add the ADR, Program Head context module, canonical route/path helpers, and multi-Program fixture/tests. Verify no schema migration is generated or applied.
2. Add `/program-head` entry behavior and the dynamic Program layout. Move dashboard first, retain static dashboard as an entry redirect, and verify zero/one/multiple entry paths.
3. Migrate outcomes/mappings, Courses, Course Assignments/rosters/reviews, templates/baselines/deployments, analytics, reports, links, redirects, action inputs, and exact route revalidation in dependency-ordered slices. Each slice removes its own implicit selector before exposing the selected-Program page.
4. Replace Secretary singular Program Head editing with protected assignment-set editing. Seed a second active assignment for the dedicated multi-Program fixture and verify activation/deactivation/reactivation and stale confirmation behavior.
5. Run focused module and route tests after each slice, then `pnpm lint`, `pnpm test`, and `pnpm build`. Use an isolated seeded demo deployment only for browser verification after the dedicated demo auth boundary checks; never write the linked Supabase project.

Rollback is incremental. A partially migrated feature keeps its static route redirecting to `/program-head`; no feature may fall back to first assignment behavior. Feature code can revert to the previous release while assignment records remain valid because no destructive data migration occurs. If a migration becomes necessary later, it follows the repository's Prisma-to-Supabase workflow and includes a separate rollback/recovery plan.

## Open Questions

- **Technical:** When an assignment row remains active but its Academic Program is deactivated, should `resolveProgramHeadContext()` allow a read-only selected context, exclude it from the selector, or show it with a lifecycle banner and prohibit writes? **In plain language:** If the school turns off a Program, can its Program Head still open its old CLOIE records, or should it disappear from their choices? This does not block the selected-Program design because existing feature lifecycle checks continue to govern writes; resolve it with the Academic Structure steward before changing Program deactivation behavior.
- **Technical:** Should the existing global `course-rosters/[assignmentId]` URL gain role-agnostic explicit Program context for all role types, or remain generic while Program Head navigation uses the selected-Program wrapper? **In plain language:** When a Program Head opens a class roster, should the URL always show which Program they chose, even though other staff use the same roster link? The design chooses a Program Head wrapper now and leaves all-role URL consolidation out of scope.
- **Technical:** A future last-selected Program preference could be stored server-side with revision-aware validation or client-side as a non-authoritative hint. **In plain language:** Should CLOIE remember the last Program a Program Head looked at to save a click? Deferred because it has no institutional meaning and must not alter authorization or selector behavior.
