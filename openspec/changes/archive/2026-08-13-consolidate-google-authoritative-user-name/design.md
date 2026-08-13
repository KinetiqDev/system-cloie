## Context

CLOIE currently stores identity on `User.first_name` and `User.last_name`. The OAuth callback at `src/app/api/auth/callback/route.ts` decomposes provider metadata, while self-service forms submit duplicate identity fields through Server Actions. The same split fields are projected into Secretary user management, academic enrollments, Course-assignment faculty selectors, course rosters, evaluation respondent previews, Dean oversight, profiles, dashboards, and audit labels.

ADR 0014 establishes the authoritative contract: `User.name` is one opaque canonical account name. Real Google OAuth supplies the name for a new account or first OAuth link; later OAuth callbacks preserve the stored value; an authorized Secretary may correct it. Secretary-created accounts still require a provisional name so they remain complete before first sign-in, but the provisional value is replaced on first link. Development and dedicated-demo authentication retain fixture-controlled names.

The change is a **BREAKING** data and application-contract refactor. The affected contexts are Identity and Access, Course Catalog and Assignments, Academic Calendar, Enrollments, Evaluations, Responses, Dean oversight, and Users.

## Goals / Non-Goals

**Goals:**

- Replace the split `User` identity columns with required `User.name` and preserve existing values during migration.
- Make the OAuth callback the only real self-service source of the initial canonical account name.
- Implement first-link overwrite for unlinked Secretary-created accounts matched by exact normalized email.
- Preserve stored names after linking and protect linked Auth identities from takeover or relinking.
- Remove name fields from self-service registration payloads and forms.
- Reconcile all server-side projections, DTOs, search, sorting, labels, seeds, demo scripts, and tests with the canonical name contract.
- Keep existing role, account-state, authorization, enrollment, roster, evaluation, privacy, and verification invariants unchanged.
- Provide a safe user-facing outcome when a new account or first link has no usable Google name.

**Non-Goals:**

- No automatic synchronization of Google profile names after first OAuth link.
- No student self-edit name capability during onboarding or through a student profile route.
- No removal of Secretary correction capability.
- No historical name snapshots on enrollments, rosters, evaluations, responses, or audit records.
- No surname-specific sort key, hidden first/last compatibility fields, or name parser.
- No changes to `ExternalStakeholderInvite.invitee_name`, `company_name`, `position`, student identifiers, or academic identity fields.
- No changes to Supabase Auth provider configuration, OAuth scopes, roles, RLS policy semantics, caching, or deployment topology.
- No changes to development or dedicated-demo authentication behavior beyond using the renamed `User.name` field in fixtures.

## Decisions

### 1. Canonical account-name model

Modify `prisma/models/identity-access.prisma` so `User` has one required `name: String` mapped to the existing `users.name` column. Remove `first_name` and `last_name` from the Prisma model after the database contract is ready. The canonical value is opaque: the application displays, searches, and sorts the complete value and never interprets a substring as a surname or given name.

Application contracts use `name` consistently. Existing `firstName` and `lastName` properties are removed rather than populated with compatibility aliases. `ExternalStakeholderInvite.invitee_name` remains an independent snapshot-like invite field.

**Alternative rejected:** retain first/last fields as compatibility columns or expose fake DTO aliases. This would preserve the old semantic model, permit malformed `Last, First` output, and make future consumers continue depending on fields that the product has rejected.

### 2. Server-owned provider-name resolver

Add a small server-only resolver under the Identity and Access feature, for example `src/features/auth/services/resolve-google-account-name.ts`. It accepts the authenticated provider metadata and returns either a trimmed canonical name or a typed missing-name result.

Precedence is:

```text
user_metadata.name
    -> user_metadata.full_name
    -> user_metadata.given_name + user_metadata.family_name
    -> missing-name failure
```

The resolver preserves provider ordering, internal whitespace, casing, punctuation, and diacritics. It accepts one-word names. It never reads the email local part and never creates placeholders.

The callback remains a Server Route Handler. It invokes the resolver only after `exchangeCodeForSession` succeeds, so browser-controlled form data cannot establish identity. A new account or unlinked first link with no usable name is rejected before account creation/linking and redirects to a safe missing-name status surface. An already-linked account does not require provider name metadata on later login.

**Alternative rejected:** always concatenate `given_name` and `family_name`. This reintroduces name-order assumptions and loses provider-provided display-name semantics. **Alternative rejected:** derive from email. Email proves account matching, not the person's name.

### 3. First-link transaction and identity conflict handling

Keep the existing stable domain `User.id` and nullable unique `auth_user_id` boundary from ADR 0002. Refactor `src/app/api/auth/callback/route.ts` into explicit states:

```text
OAuth exchange
    |
    v
Find by auth_user_id
    | found
    +--> linked account: preserve User.name
    |
    | not found
    v
Find by normalized email
    | no match
    +--> resolve provider name and create User + role
    |
    | unlinked match
    +--> resolve provider name, then atomically set auth_user_id + name
    |
    | linked match with different auth_user_id
    +--> fail closed, preserve record, sign out
```

The first-link update and new-user create must be atomic with their role operation where the current callback already performs those operations transactionally. A missing provider name must leave an unlinked Secretary-created account unchanged and must not set `auth_user_id`.

The bootstrap Secretary path uses the same Google-derived name resolver for a new real OAuth account. It may retain the bootstrap role exception, but it must not use `System Secretary`, `User Name`, or another invented identity fallback. Development and dedicated-demo paths do not call this resolver.

**Alternative rejected:** overwrite the name on every OAuth callback. This would silently undo Secretary corrections and cause current historical labels to change without an explicit administrative action.

### 4. Registration contracts and component boundaries

Self-service schemas and actions no longer accept a name:

- `src/lib/schemas/student-profile.ts`
- `src/lib/schemas/faculty-profile.ts`
- `src/lib/schemas/alumni-profile.ts`
- `src/lib/schemas/industry-partner-profile.ts`
- `src/lib/actions/onboarding-actions.ts`
- `src/lib/actions/faculty-actions.ts`
- `src/lib/actions/alumni-actions.ts`
- `src/lib/actions/industry-partner-actions.ts`

The actions resolve the authenticated domain User by the server session and update only role-specific data. They must not trust a client-supplied name. Self-service forms remain existing Client Components because they use `react-hook-form`; this change removes identity inputs and does not add a new `use client` boundary. The onboarding route passes a display-only explanation that the name comes from the authenticated Google account only if the design system and existing form hierarchy need it; it does not pass mutable identity state.

Secretary creation and edit remain authorized Server Action and service flows. They continue to require a provisional `name` for complete unlinked account creation and allow Secretary correction after linking. The Secretary form changes from two inputs to one `Name` input. Protected academic and external changes retain their existing confirmation protocol; name correction remains a base identity edit, not an academic-scope mutation.

### 5. Downstream projection and query contract

Every consumer changes from split selection/composition to direct `name` selection and projection. The primary affected paths are:

- `src/features/users/services/list-secretary-users-summary.ts`
- `src/features/users/services/get-user-edit-record.ts`
- `src/features/users/services/create-user-by-secretary.ts`
- `src/features/users/services/edit-user-by-secretary.ts`
- `src/features/users/services/manage-users.ts`
- `src/features/users/schemas/create-user.ts`
- `src/features/users/schemas/edit-user.ts`
- `src/features/users/schemas/update-user.ts`
- `src/features/users/schemas/secretary-users-list.ts`
- `src/features/users/components/secretary-add-user-form.tsx`
- `src/features/users/components/secretary-users-list/edit-user-dialog.tsx`
- `src/features/users/components/secretary-users-list/users-data-table.tsx`
- `src/features/users/components/secretary-users-list/user-dialogs.tsx`
- `src/features/users/components/secretary-users-list/users-filter-bar.tsx`
- `src/features/users/components/secretary-users-list/index.tsx`
- `src/features/enrollments/types.ts`
- `src/features/enrollments/services/list-enrollments.ts`
- `src/features/enrollments/services/list-students-for-class.ts`
- `src/features/course-assignments/types.ts`
- `src/features/course-assignments/services/list-course-assignments.ts`
- `src/features/course-assignments/services/load-all-program-course-assignments-page.ts`
- `src/features/course-assignments/services/read-course-rosters.ts`
- `src/features/course-assignments/services/search-faculty-pool.ts`
- `src/features/course-assignments/components/course-assignment-form-dialog.tsx`
- `src/features/course-assignments/components/course-assignments-page-shell.tsx`
- `src/features/course-assignments/components/edit-course-assignment-dialog.tsx`
- `src/features/course-assignments/components/shared/assignment-filters.tsx`
- `src/features/course-assignments/components/shared/faculty-search-popover.tsx`
- `src/features/evaluations/types.ts`
- `src/features/evaluations/services/get-faculty-evaluation-detail.ts`
- `src/features/evaluations/services/preview-central-deployment-respondents.ts`
- `src/features/evaluations/services/preview-course-bound-respondents.ts`
- `src/features/evaluations/components/publish-central-deployment-form.tsx`
- `src/features/evaluations/components/publish-course-bound-evaluation-form-v2.tsx`
- `src/features/responses/services/list-student-assigned-evaluations.ts`
- `src/features/responses/services/list-student-course-bound-evaluations.ts`
- `src/features/dean/services/read-dean-oversight.ts`
- `src/features/academic-calendar/types.ts`
- `src/features/academic-calendar/services/list-school-years.ts`
- `src/features/academic-calendar/services/run-term-rollover.ts`
- role profile/dashboard pages under `src/app/(app)/`

Secretary Users sorting changes from first-name/last-name options to complete-name sorting. Search matches `User.name` and email. Existing `sort=firstName` and `sort=lastName` query values are invalidated and canonicalized to the new name default rather than silently retaining old semantics. The page remains bounded and server-rendered.

### 6. Database migration and generated types

The migration must be compatible with existing production data and follow the repository Supabase workflow. Because the currently deployed application writes only `first_name`/`last_name` while the target application writes only `name`, the rollout needs an explicit compatibility bridge rather than a column rename:

1. Inventory current rows and identify blank/whitespace-only source values.
2. Generate a migration through the supported Supabase/Prisma workflow.
3. Add `users.name` as nullable during the expansion step.
4. Backfill with trimmed `concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), ''))`.
5. Abort if any resulting `name` is blank; do not invent placeholders.
6. Add a temporary database trigger that derives `name` from legacy fields when an old application inserts or updates a User without a name.
7. Make legacy `first_name` and `last_name` nullable so the new name-only application can write Users during the compatibility window.
8. Add the non-blank check and make `users.name` `NOT NULL` while the trigger protects old deployed application writes.
9. Deploy the name-based application and regenerate Prisma Client/types; the application model reads and writes only `name` while legacy columns remain database-only compatibility columns.
10. After old consumers are removed and deployment compatibility is confirmed, drop `first_name`, `last_name`, and the temporary trigger.
11. Regenerate `src/types/supabase-database.ts` using `pnpm supabase:types`; never hand-edit it.

The trigger is a release bridge, not an application identity contract. On insert it must derive `name` only when an old writer omits it; on update it must derive a new name only when a legacy writer changes the legacy components without changing `name`; it must preserve a name-only write from the new application. The migration must document its removal point. The preferred operational sequence is expand with bridge, deploy the new application, verify, then contract so an application rollback remains possible while the legacy columns and trigger still exist.

The backfill preserves the visible combined name but cannot preserve a semantic surname. That is intentional and must be stated in the migration review.

### 7. Seed, demo, and bootstrap data

Update:

- `prisma/seed/fixtures/users.ts`
- `prisma/seed/runners/seed-users.ts`
- `scripts/bootstrap-outline-defense-demo.ts`
- related seed and script tests

Fixtures use one `name` value. The development `cloie_dev_auth` path and dedicated signed demo sessions continue to resolve seeded Users by stable domain ID and retain fixture names. They must not pretend that a Google provider name exists. The outline defense bootstrap remains safe to rerun by comparing the canonical name marker.

### 8. Documentation and ADR alignment

The already-recorded documentation decisions remain part of the change contract:

- `docs/adr/0014-google-authoritative-account-names.md` is the cross-cutting authority.
- `docs/adr/0001-complete-secretary-created-accounts.md` retains role completeness and marks only its name-source portion as superseded.
- `docs/adr/0002-separate-domain-users-from-auth-identities.md` documents the provisional-to-Google first-link transition.
- `src/features/auth/CONTEXT.md` defines canonical account name, provisional pre-link name, first OAuth link, Google-derived account name, Secretary name correction, and demo identity boundaries.
- `docs/agents/discrepancies-prd-srs-vs-current.md` records the PRD/SRS gap without treating those documents as authoritative.

## Risks / Trade-offs

- **[Production data loss during migration]** -> Run a disposable-data dry run, assert every backfilled name is non-empty, take a verified backup, and do not drop old columns until the name-based application build is verified.
- **[Production rollout compatibility]** -> Expand with nullable `users.name`, nullable legacy split columns, and a temporary database trigger that backfills name for old writers; deploy and verify the name-only application; only then remove the trigger and legacy columns. The trigger must preserve name-only writes from the new application and must have an explicit removal migration.
- **[Provider metadata differs across Google accounts or changes shape]** -> Centralize precedence and test `name`, `full_name`, separate fields, whitespace, diacritics, single-word names, and missing values.
- **[Secretary-created provisional name unexpectedly changes]** -> Make the first-link overwrite explicit in the callback and user-facing documentation; preserve the resulting name on all later callbacks.
- **[Unauthorized Auth identity relinks a domain user]** -> Fail closed when a normalized-email match already has a different non-null `auth_user_id`; do not update either link or name.
- **[Name changes alter historical labels]** -> Preserve current behavior and document that screens resolve the live User name. Do not introduce snapshots in this change.
- **[Legacy URL consumers request surname sorting]** -> Canonicalize old sort values to complete-name sorting and add route/query tests; do not reintroduce surname semantics.
- **[Generated Prisma/Supabase types drift]** -> Run Prisma validation/generation and `pnpm supabase:types`; add repository checks that no handwritten generated-type edit is used.
- **[Name input remains in a client action payload]** -> Remove it from schemas and server action parsing, and test that registration actions derive identity from the authenticated server session rather than FormData.

## Migration Plan

### Pre-deployment

- Confirm the linked Supabase target and ensure no shared/hosted production database is used for integration verification.
- Run a read-only row inventory for blank names and representative compound/single-word values.
- Generate and review SQL using the repository migration workflow.
- Run `pnpm supabase:push:dry-run` and review the generated SQL and constraints.
- Capture a recoverable database backup/snapshot according to the deployment operator's procedure.

### Expansion and application transition

- Add and backfill `users.name`, assert non-empty values, and make it required while retaining old columns during the compatibility window.
- Update Prisma and application code to read/write only `name`.
- Regenerate Prisma Client and Supabase database types.
- Run focused callback, identity, onboarding, Secretary, projection, seed, lint, test, and build verification.
- Deploy the application and verify real OAuth first-link, linked-login, missing-name, identity-conflict, Secretary correction, and seeded demo paths.

### Contract completion

- After confirming no application or deployment consumer requires the old columns, drop `first_name` and `last_name` in the contract migration.
- Run migration status and production-target verification.

### Rollback and recovery

- Before the contract migration, roll back application code to the previous release while retaining the legacy columns and compatibility trigger, or forward-fix the name-based release. The trigger is the documented bridge for old writes; restore the prior release only through the documented release procedure.

- After dropping old columns, do not promise an automatic down migration: splitting an opaque name cannot reliably reconstruct the original first/last values. Recovery requires restoring the pre-contract database snapshot and deploying the matching previous application, or completing a forward fix against `User.name`.
- Any migration failure before commit must leave the database unchanged; any post-commit failure must stop deployment and use the recorded snapshot/forward-fix procedure rather than rerunning destructive SQL blindly.

## Open Questions

None blocking. The product decisions are recorded in ADR 0014 and the remaining historical-name snapshot question is explicitly out of scope.
