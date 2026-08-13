## Why

**BREAKING**: CLOIE currently stores human identity as `User.first_name` and `User.last_name`, accepts duplicate name input during self-service onboarding, and decomposes Google metadata into Western first/last components. This creates conflicting identity sources and cannot represent a single canonical name safely across OAuth, Secretary provisioning, rosters, evaluations, and audit-facing projections. The accepted identity decision in ADR 0014 makes one opaque `User.name` authoritative: Google supplies it for new accounts and first OAuth links, later logins preserve it, and authorized Secretary corrections remain authoritative.

## What Changes

- **BREAKING** Replace `User.first_name` and `User.last_name` with required `User.name`, preserving existing values through a production-safe backfill migration.
- Resolve the Google-derived name server-side with precedence `name`, `full_name`, then `given_name + family_name`; never derive a name from the Gmail address.
- On first OAuth link, including an unlinked Secretary-created account matched by normalized email, replace the provisional Secretary-entered name with the Google-derived name.
- Preserve the stored name on later OAuth callbacks, including after a Secretary correction; fail closed if a linked email is presented with a different Auth identity.
- Remove name fields from self-service Student, Faculty, Alumni, and Industry Partner registration payloads and forms; the server obtains identity from the authenticated OAuth-linked User.
- Replace first/last-name application DTOs, projections, search, sorting, labels, profile displays, roster/evaluation presentations, seed fixtures, and demo/bootstrap scripts with the canonical name contract.
- Retain fixture-controlled names for development and dedicated-demo authentication because those paths do not use Google OAuth.
- Update focused identity documentation and reconcile ADR 0001, ADR 0002, the Identity and Access glossary, and the PRD/SRS discrepancy inventory with ADR 0014.

## Capabilities

### New Capabilities

- `canonical-user-name`: Defines one opaque canonical `User.name`, its validation, projections, search/sort behavior, and removal of first/last-name contracts.
- `google-authoritative-name-linking`: Defines Google provider precedence, new-account creation, first OAuth-link overwrite, linked-account preservation, missing-name failure, Secretary correction, identity-conflict handling, and non-OAuth boundaries.
- `user-name-data-migration`: Defines production-safe backfill, required-column transition, generated-type regeneration, seed/demo reconciliation, and migration verification.

### Modified Capabilities

- None. Existing OpenSpec capabilities do not currently define the canonical account-name contract; the new capabilities establish it without changing role, account-state, authorization, enrollment, roster, or evaluation requirements.

## Impact

- **Prisma model and SQL migration**: `prisma/models/identity-access.prisma`, `supabase/migrations/`, and the deployed PostgreSQL `users` table change. Existing values must be backfilled before old columns are removed.
- **Generated types**: `src/types/supabase-database.ts` must be regenerated with `pnpm supabase:types`; it must not be hand-edited.
- **Authentication**: `src/app/api/auth/callback/route.ts` and callback tests change first-link name authority, provider precedence, missing-name handling, and linked-identity conflict behavior.
- **Identity and registration**: `src/features/auth/`, `src/lib/schemas/`, `src/lib/actions/`, and `src/features/users/` change forms, server actions, schemas, Secretary CRUD, and DTOs.
- **Downstream read models**: enrollment, academic calendar, course assignments/rosters, dean oversight, evaluations, responses, dashboards, profiles, and audit labels consume `name` directly.
- **Seed and demo**: `prisma/seed/`, `scripts/bootstrap-outline-defense-demo.ts`, and related tests use one name value; development and dedicated-demo authentication remain fixture-controlled.
- **Authorization and privacy**: No role, account-state, authorization scope, roster eligibility, evaluation targeting, caching, or privacy policy changes are intended. Name data remains request-scoped and server-authorized.
- **Deployment**: Supabase migration dry-run/push and generated type regeneration are required. No new dependency or authentication provider is introduced.
