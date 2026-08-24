# Users

Users defines System CLOIE account administration — the readiness gates an account must pass to enter a portal, how roles are provisioned and revoked, Secretary-managed external invitations, and the records that scope a role to programs.

## Role lifecycle

**Profile gate**:
The per-role readiness verdict resolved at sign-in that states what an account must finish before entering its portal: ROLE_SELECTION_REQUIRED (no role chosen), a role-specific onboarding requirement (STUDENT_ONBOARDING_REQUIRED, FACULTY_ONBOARDING_REQUIRED, ALUMNI_ONBOARDING_REQUIRED, INDUSTRY_PARTNER_ONBOARDING_REQUIRED), INACTIVE (deactivated account), REJECTED_EXTERNAL_ACCOUNT (rejected alumni or industry partner verification), DEFERRED_ENROLLMENT (student profile present but no active enrollment), or COMPLETE (portal entry allowed).
_Avoid_: account status, sign-in result

**Single active role**:
The UserRole row's user_id is unique, so an account holds exactly one role at a time. Assigning a role to an account that already holds one is rejected; switching roles requires revoking the current role first, then assigning the new one.
_Avoid_: multiple simultaneous roles, role replacement

**Role revocation gate**:
A role cannot be revoked while its supporting records are active: Program Head requires all program-head assignments deactivated first, Faculty requires all faculty-program affiliations deactivated, Student requires the student academic context removed, and Industry Partner requires the profile removed. ALUMNI revocation carries no such gate.
_Avoid_: revoking before cleanup

**Role provisioning category**:
The role-card taxonomy (self_service_internal, self_service_external, pre_provisioned_admin, provisioned_faculty) that drives which roles appear on the portal's role cards and whether an ACD institutional email is required at sign-up. Staff-facing roles are pre-provisioned by a Secretary; Faculty additionally appears as a self-service internal option.
_Avoid_: permission level, access tier

## Provisioning and invitations

**Institutional email rule**:
Secretary-provisioned internal roles (Secretary, Dean, Program Head, Faculty, Student, Gen Ed Coordinator) require an ACD institutional email; external stakeholders (Alumni, Industry Partner) may use any email.
_Avoid_: email domain policy (when referring to the whole rule set)

**External stakeholder invite**:
A Secretary-managed invitation with statuses DRAFT, SENT, ACCEPTED, or REVOKED, targeting an ALUMNI or INDUSTRY_PARTNER role with an optional program scope. A given email-role-program combination is unique, and an ACCEPTED invite cannot be reverted from the admin draft flow.
_Avoid_: access request, account request

**Verification status**:
The PENDING / APPROVED / REJECTED state carried by an alumni or industry partner profile. A REJECTED verification surfaces as REJECTED_EXTERNAL_ACCOUNT at sign-in, blocking portal entry until resolved.
_Avoid_: approval flag, email verification

## Scope records

**Program scope record**:
faculty_program_affiliations (carrying is_primary and is_active) and program_head_assignments (carrying is_active) — the records that define the Authorized Program set within which a Faculty member or Program Head acts, and whose deactivation gates role revocation.
_Avoid_: program membership, teaching load

**Student academic context**:
The student academic profile linking an account to a program and optional major. It must be removed before the Student role can be revoked; deleting it leaves the enrollment ledger rows and response history on the account.
_Avoid_: enrollment record, academic year assignment
