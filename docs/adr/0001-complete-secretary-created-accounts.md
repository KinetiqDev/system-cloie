# Complete Secretary-Created Accounts

## Status

Accepted

## Context

CLOIE accounts are created through two paths:

1. **Public entry** via Google OAuth, where the person already has an ACD institutional email for internal roles or completes self-service onboarding for external roles.
2. **Secretary-created accounts**, where a Secretary pre-provisions an active account for a specific CLOIE account role.

The Secretary-created path historically captured only base identity plus a loose program affiliation, leaving role-specific records incomplete (for example, placeholder company names for Industry Partners, missing student academic profiles, or pending external verification). That forced follow-up edits and made the created accounts inconsistent with the participation requirements already modeled by Identity and Access.

Google OAuth is the only primary Production authentication mechanism. There are no CLOIE-managed passwords, magic links, or invitation workflows for real accounts. A separately reviewed signed demo session is permitted only in the isolated dedicated demo deployment defined by ADR 0008.

## Decision

Secretary-created accounts must be **complete for their selected CLOIE account role at creation time**, using the existing role-specific tables and exact normalized email matching for Google OAuth. The feature does not introduce new profile schema, password handling, or email delivery.

The identity-name authority defined here is partially superseded by [ADR 0014: Google-Authoritative Account Names](0014-google-authoritative-account-names.md). This ADR remains authoritative for role completeness, atomic creation, enrollment, program, verification, and account-state rules. Only the source and overwrite behavior of the base account name changes.

### Role completeness rules

| Role | Required information at creation | Role-specific record |
|---|---|---|
| Secretary | Provisional account name, ACD institutional email | `User` + `UserRole` |
| College Dean | Provisional account name, ACD institutional email | `User` + `UserRole` |
| Program Head | Provisional account name, ACD institutional email, exactly one managed program | `User` + `UserRole` + `ProgramHeadAssignment` (active) |
| Faculty | Provisional account name, ACD institutional email, one primary program affiliation | `User` + `UserRole` + `FacultyProgramAffiliation` (active, primary) |
| Student | Provisional account name, ACD institutional email, program, student ID number, year level, section, and major when the program has active majors | `User` + `UserRole` + `StudentAcademicProfile`; plus `StudentEnrollment` in the active term when one exists |
| Alumni | Provisional account name, any valid email, program, graduation year, and major when the program has active majors | `User` + `UserRole` + `AlumniProfile` (approved) |
| Industry Partner | Provisional account name, any valid email, company/organization name, optional position, optional affiliated program | `User` + `UserRole` + `IndustryPartnerProfile` (approved) |

### Supporting rules

- Secretary-created accounts require a non-empty provisional `User.name` at creation so the account remains complete before first sign-in. If the account has no linked `auth_user_id`, its first successful Google OAuth link replaces that provisional name with the Google-derived account name defined by ADR 0014. Later OAuth callbacks do not synchronize the name; an authorized Secretary may correct a linked account name through the protected user-management flow.
- Internal roles (Secretary, Dean, Program Head, Faculty, Student) must use an ACD institutional email on exactly `acd.edu.ph` or `acdeducation.com`.
- External roles (Alumni, Industry Partner) may use any valid email.
- Secretary-created external profiles start with `verification_status = APPROVED` because the Secretary acts as the institution-managed verification step.
- New accounts are active immediately (`is_active = true`).
- Creation is atomic: base user, account role, and role-specific records are written inside one Prisma transaction. A duplicate email or invalid role-specific data must not leave a partial record.
- A Student created when an active academic term exists receives a `StudentEnrollment` tied to that term, with `source = SECRETARY`. When no active term exists, only the static `StudentAcademicProfile` is created, preserving the existing deferred-enrollment semantics.
- Major selection is required for Student and Alumni **only when the selected program has active majors in the catalog**. Because the schema does not have catalog state, the conditional-major rule is enforced by the creation service; the dynamic form adds a client-side guard so users see a field-level error before submission.

## Consequences

- The Secretary add-user form remains a single page with dynamic role-specific sections instead of separate per-role pages.
- No new database tables or profile fields are needed; the existing role-specific tables are sufficient.
- Google OAuth login matches on the exact normalized email address the Secretary registered. On the first link of an unlinked Secretary-created account, the Google-derived account name replaces the provisional Secretary-entered name; a later login preserves the stored name. Dedicated demo-session identity selection is limited to the allowlisted seeded catalog and does not perform Google name derivation.
- A Secretary-created account bypasses self-service onboarding and external verification for Alumni and Industry Partners; access control must continue to treat these as institution-verified.
- Tests must cover every supported role, provisional-name creation, first-link Google name replacement, already-linked name preservation, Secretary correction persistence, duplicate-email rejection, institutional-domain enforcement, conditional major behavior, active-term vs. deferred enrollment, and the dynamic form field visibility/reset behavior.

### Identity-name authority

The base account name is one canonical opaque `User.name`, not a first-name/last-name pair. ADR 0014 governs how Google supplies and preserves that name. The role-completeness and account-provisioning decisions in this ADR remain unchanged.

## Related

- Identity and Access glossary: `src/features/auth/CONTEXT.md`
- Create-user schema: `src/features/users/schemas/create-user.ts`
- Create-user service: `src/features/users/services/create-user-by-secretary.ts`
- Secretary create-user form: `src/features/users/components/secretary-add-user-form.tsx`
