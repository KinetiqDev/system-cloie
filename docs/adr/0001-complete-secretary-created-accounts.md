# Complete Secretary-Created Accounts

## Status

Accepted

## Context

CLOIE accounts are created through two paths:

1. **Public entry** via Google OAuth, where the person already has an ACD institutional email for internal roles or completes self-service onboarding for external roles.
2. **Secretary-created accounts**, where a Secretary pre-provisions an active account for a specific CLOIE account role.

The Secretary-created path historically captured only base identity plus a loose program affiliation, leaving role-specific records incomplete (for example, placeholder company names for Industry Partners, missing student academic profiles, or pending external verification). That forced follow-up edits and made the created accounts inconsistent with the participation requirements already modeled by Identity and Access.

GOogle OAuth is the only authentication mechanism. There are no CLOIE-managed passwords, magic links, or invitation workflows.

## Decision

Secretary-created accounts must be **complete for their selected CLOIE account role at creation time**, using the existing role-specific tables and exact normalized email matching for Google OAuth. The feature does not introduce new profile schema, password handling, or email delivery.

### Role completeness rules

| Role | Required information at creation | Role-specific record |
|---|---|---|
| Secretary | First name, last name, ACD institutional email | `User` + `UserRole` |
| College Dean | First name, last name, ACD institutional email | `User` + `UserRole` |
| Program Head | First name, last name, ACD institutional email, exactly one managed program | `User` + `UserRole` + `ProgramHeadAssignment` (active) |
| Faculty | First name, last name, ACD institutional email, one primary program affiliation | `User` + `UserRole` + `FacultyProgramAffiliation` (active, primary) |
| Student | First name, last name, ACD institutional email, program, student ID number, year level, section, and major when the program has active majors | `User` + `UserRole` + `StudentAcademicProfile`; plus `StudentEnrollment` in the active term when one exists |
| Alumni | First name, last name, any valid email, program, graduation year, and major when the program has active majors | `User` + `UserRole` + `AlumniProfile` (approved) |
| Industry Partner | First name, last name, any valid email, company/organization name, optional position, optional affiliated program | `User` + `UserRole` + `IndustryPartnerProfile` (approved) |

### Supporting rules

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
- Google OAuth login will match on the exact normalized email address the Secretary registered, so spelling and casing must match.
- A Secretary-created account bypasses self-service onboarding and external verification for Alumni and Industry Partners; access control must continue to treat these as institution-verified.
- Tests must cover every supported role, duplicate-email rejection, institutional-domain enforcement, conditional major behavior, active-term vs. deferred enrollment, and the dynamic form field visibility/reset behavior.

## Related

- Identity and Access glossary: `src/features/auth/CONTEXT.md`
- Create-user schema: `src/features/users/schemas/create-user.ts`
- Create-user service: `src/features/users/services/create-user-by-secretary.ts`
- Secretary create-user form: `src/features/users/components/secretary-add-user-form.tsx`
