# Users

Users defines System CLOIE account administration — the readiness gates an account must pass to enter a portal, how roles are provisioned and revoked, Secretary-managed external invitations, and the records that scope a role to programs.

## Role lifecycle

**Profile gate**:
The per-role readiness verdict resolved at sign-in that states what an account must finish before entering its portal: ROLE_SELECTION_REQUIRED (no role chosen), a role-specific onboarding requirement (FACULTY_ONBOARDING_REQUIRED, ALUMNI_ONBOARDING_REQUIRED, INDUSTRY_PARTNER_ONBOARDING_REQUIRED), STUDENT_PLACEMENT_REQUIRED (Secretary-provisioned Student whose placement the institution has not recorded yet), INACTIVE (deactivated account), REJECTED_EXTERNAL_ACCOUNT (rejected alumni or industry partner verification), FACULTY_APPROVAL_PENDING or FACULTY_REQUEST_REJECTED (a self-submitted Faculty request awaiting or refused by Secretary review), DEFERRED_ENROLLMENT (student profile present but no active enrollment), AUTH_METHOD_MISMATCH (a Google-only role opened by a password, one-time-code or recovery session), or COMPLETE (portal entry allowed). A Student has no self-service onboarding step: placement is institution-recorded, so STUDENT_PLACEMENT_REQUIRED routes to the Secretary-guidance status rather than a form. A gate that only redirects to an entry route keeps the account's active role; a gate that denies authority withholds it, so role guards fail closed.
_Avoid_: account status, sign-in result

**Assigned-role set**:
The distinct System CLOIE roles attached to one account. The `(user_id, role)` pair is unique, so the same role cannot be assigned twice; one assigned role is selected as active at a time.
_Avoid_: Role stack, simultaneous authority, primary role

**Role revocation gate**:
An assigned role cannot be revoked while its supporting records are active: Program Head requires all program-head assignments deactivated, Faculty requires all faculty-program affiliations deactivated, Student requires the student academic context removed, and Industry Partner requires the profile removed. The role-removal write settles the Faculty and Program Head scope records itself — deactivated in the same transaction that deletes the role, so they are never active once the role is gone and their history stays on the account — while the Student academic context and the Industry Partner profile carry no active flag and must be removed first. ALUMNI revocation carries no such gate.
_Avoid_: Active role selection, revoking before cleanup

**Secretary role-bound edit**:
A Secretary edit form is bound to one role the account is assigned — for a multi-role account, the Secretary chooses which assigned role's profile the form edits. The save carries that expected role, and the service rejects the request as stale if the account no longer holds it; role-specific validation never retargets the old form to another role.
_Avoid_: Inferring a replacement role at submit time, silently retargeting stale edit data

**Secretary add-role pivot**:
The Add User form's email-first entry: an address that already belongs to an account switches the form from account creation to granting a new role on that account, showing the account's canonical name and current roles and offering only roles it does not hold yet. A grant writes the `(user_id, role)` pair together with the role's supporting record, so the account keeps its identity and history. If creation races the lookup, the creation result names the existing account and the form pivots instead of reporting a duplicate.


**Secretary-only Student provisioning**:
A Student role enters the assigned-role set only under a Secretary's authority, through either account creation or the role grant on an existing account. Both entry points share one role-entry gate that reads the granting account's active role, so the shared administrative role held by a Dean does not extend to provisioning: a Dean may activate, deactivate, and revoke the accounts a Secretary created, but cannot create or grant a Student. The grant stays a single atomic write of the role row together with its academic context and active-term placement, so narrowing the grant never leaves a partial Student account.
_Avoid_: Admin-may-provision, self-provisioned Student, role-membership grant

**Secretary Student CSV import**:
A Secretary-only bulk creation flow with Prepare, Review, Confirm, and Results steps. Its six columns are `name`, `email`, `program_code`, `major_name`, `year_level`, and `section`. Catalog matching and headers are case-insensitive; account emails retain the existing trimmed lowercase identity rule. Existing accounts are skipped regardless of roles or activity, without granting roles, changing placement, or reactivating accounts. Invalid rows block confirmation. Each new Student is an atomic account/role/profile/enrollment transaction; successful rows remain committed when another row fails, and retries skip existing accounts. A signed, expiring review binds the actor, CSV, active catalog, and academic-period context. No active period preserves deferred enrollment. Import does not create Supabase Auth identities, send mail, or assign course roster membership.
_Avoid_: Bulk enrollment update, role-grant import, student self-registration

**Secretary term placement set**:
The Secretary Edit User flow's write of a Student's current-term placement: year level and section save together into the unique enrollment row for the active Academic Period — created with source `SECRETARY` when the Student has none, updated in place and reactivated otherwise. It requires an active Academic Period, leaves the static academic profile and other terms' enrollments untouched, and is a Protected account edit reviewed before saving.
_Avoid_: Bulk placement update, term rollover, profile-only correction

**Secretary Users placement filter**:
The Secretary Users list's year level and section filters read the Student's enrollment row in the active Academic Period — the same row the Secretary term placement set writes and the Year & Section column displays. They are honored only alongside the Student role context, and only while that period is active and the Student is not already filtered to awaiting placement; elsewhere the list canonicalizes them away rather than keep a filter it cannot show. Program and major filters read the static student academic context.
_Avoid_: Year level over enrollment history, section from the academic profile, placement filters without an active Academic Period

**Faculty approval state**:
The role-scoped PENDING / APPROVED / REJECTED review state on a self-submitted Faculty request. A self-request writes the FACULTY role together with a PENDING request and no program affiliation, so the profile gate resolves it to FACULTY_APPROVAL_PENDING and the Faculty workspace stays closed; approval creates the primary active affiliation in the same transaction. It never deactivates the account globally and never reuses external VerificationStatus. A rejected request revokes only the affiliation that approval granted — a Secretary-provisioned primary or additional program is never touched, and revocation deactivates rather than deletes so the affiliation history stays on the account. Secretary-provisioned Faculty has no request row and is complete at creation.
_Avoid_: Account deactivation, external verification status, deleting affiliations

Approval revalidates both account activity and the requested Program's activity inside the decision transaction. A Program archived while the request awaits review cannot receive an active Faculty affiliation.

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

**Canonical-name ordering**:
The Secretary Users list sorts by the complete canonical account name (with legacy canonicalization for pre-canonical rows) and uses the canonical name for display labels, never split first/last name components.
_Avoid_: First/last name columns, legacy split-name sorting
