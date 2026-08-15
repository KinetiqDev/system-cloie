# Google-Authoritative Account Names

## Status

Accepted

## Context

CLOIE authenticates real accounts through Supabase Auth with Google OAuth while keeping a separate domain `User` record, as established by [ADR 0002: Separate Domain Users from Auth Identities](0002-separate-domain-users-from-auth-identities.md). The current domain model stores `first_name` and `last_name`, and the OAuth callback decomposes Google metadata into those fields. Self-service onboarding then accepts the same identity fields from the browser.

This creates several problems:

- It imposes first-name/last-name semantics on a provider-supplied display name.
- It makes the browser a second source of identity data during registration.
- It does not consistently support single-word, compound, or culturally varied names.
- It creates ambiguity when a Secretary-created account has a provisional name before first sign-in.
- It allows future implementation changes to overwrite institution corrections on later OAuth callbacks.

The system needs one canonical account name while preserving the stable domain-user/auth-identity separation and the complete Secretary-created account model from ADR 0001.

## Decision

CLOIE will replace `User.first_name` and `User.last_name` with one required, opaque `User.name` field. `User.name` is the canonical human-readable account name displayed throughout the application. The application must not derive semantic first-name or last-name values from it.

### Name source and OAuth lifecycle

For a real Supabase Google OAuth flow:

1. A new self-service account receives its `User.name` from the authenticated Google profile during the OAuth callback.
2. An unlinked Secretary-created account matched by normalized email receives the Google-derived name when `auth_user_id` is first linked. This replaces the required provisional Secretary-entered name.
3. An already-linked account preserves its stored `User.name` on later OAuth callbacks, even if Google metadata changes or is absent.
4. An authorized Secretary may correct `User.name` after linking through the existing Secretary user-management flow. Later OAuth callbacks must not overwrite that correction.
5. The Gmail address is used for account identity matching only. The name must never be derived from the email local part.

The first-link transition is:

```text
Secretary-created User
  name = provisional value
  auth_user_id = null
        |
        | first OAuth callback matched by normalized email
        v
User.name = Google-derived value
User.auth_user_id = Google/Supabase Auth ID
        |
        | later OAuth callbacks
        v
User.name remains unchanged
```

### Provider name precedence

The server-side resolver uses the following order:

1. Provider `name` claim.
2. Provider `full_name` claim.
3. `given_name` plus `family_name` when a complete display value is unavailable.

The resolver trims leading and trailing whitespace, preserves internal spacing, casing, punctuation, and diacritics, and accepts single-word names. It does not split a full name into components.

A real new account or first OAuth link with no usable provider name fails safely and does not create or link an account with an email-derived value or invented placeholder. An already-linked account may continue to authenticate using its stored `User.name` when later provider metadata has no usable name.

### Authentication-mode boundary

Google-derived names apply only to real Supabase Google OAuth callbacks. Development authentication and dedicated demo authentication provide seeded domain identities and retain fixture-controlled names. They do not pretend to have Google provider metadata and do not trigger first-link name replacement.

### Account and authorization invariants

This decision does not change:

- CLOIE's stable domain `User.id`.
- The nullable unique `auth_user_id` link to Supabase Auth.
- Exact normalized email matching for the initial link.
- The one active CLOIE account role invariant.
- Secretary-created account role completeness and atomicity.
- Student profile, enrollment, roster eligibility, evaluation targeting, or external verification rules, except where ADR 0015 later removes Student ID and permits temporary authorized name comparison for Course roster resolution.
- Server-side authorization or account-state handling.

If an email match belongs to a User already linked to a different `auth_user_id`, the callback must fail closed. It must not replace the existing Auth link or change the stored name.

## Consequences

### Positive

- Google is the single source of identity name data for the initial real OAuth link.
- Students, Faculty, Alumni, and Industry Partners no longer enter a duplicate name during self-service onboarding.
- Single-word, compound, and culturally varied names are preserved without false parsing.
- Secretary corrections remain possible without being silently reverted by later logins.
- Development and dedicated-demo workflows remain deterministic and independent of Google OAuth.

### Negative

- Surname-specific sorting and `Last, First` presentation are removed unless a separate, explicitly approved name model is introduced later.
- The change is breaking for Prisma fields, Supabase generated types, server actions, schemas, DTOs, components, tests, seed fixtures, and query URLs that reference first or last name.
- A Google profile with no usable name cannot complete a new account or first link until the profile supplies one.
- Secretary-created accounts have a required provisional name that may be replaced at first OAuth link.
- Historical screens that currently resolve names from the live User relation will continue to display the current `User.name`; immutable historical name snapshots remain a separate future decision.

## Supersession

This ADR supersedes only the identity-name source and OAuth overwrite portions of [ADR 0001: Complete Secretary-Created Accounts](0001-complete-secretary-created-accounts.md). ADR 0001 remains authoritative for complete-at-creation role requirements, atomic writes, email-domain rules, enrollment behavior, conditional majors, and external verification.

[ADR 0015: Name-Based Course Roster Resolution and Student ID Removal](0015-name-based-course-roster-resolution-and-student-id-removal.md) later permits temporary normalization of this opaque name solely for authorized Course roster candidate discovery. It does not weaken the canonical-name ownership or persistence rules in this ADR.

## Related

- `src/features/auth/CONTEXT.md`
- `prisma/models/identity-access.prisma`
- `src/app/api/auth/callback/route.ts`
- `docs/adr/0001-complete-secretary-created-accounts.md`
- `docs/adr/0002-separate-domain-users-from-auth-identities.md`
