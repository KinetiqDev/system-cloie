# Secretary Term Placement for an Unplaced Student

## Status

Accepted

## Date

2026-09-13

## Context

[Issue #81](https://github.com/KinetiqDev/system-cloie/issues/81) accepted that the Secretary Edit User dialog never creates an enrollment: placement fields (year level, section) were unavailable whenever the Student had no active enrollment, `editUserBySecretary` rejected any placement payload without one ("Student has no editable active enrollment."), and the save transaction carried the rule as `Do NOT create a missing enrollment per spec #79 / #81`.

That rule leaves a dead end for a Student who has a Student academic profile but no row in the ACTIVE Academic Period. Such a Student resolves to `DEFERRED_ENROLLMENT` at sign-in, so they cannot enter the portal to self-place, and they appear in the Secretary's "Students awaiting term placement" attention filter (`/secretary/users?state=awaiting-term-placement`) with no administrative surface that can place them:

- Student onboarding writes an `ONBOARDING` row only for the active term at self-signup, and creates the profile deferred when no period is active.
- Secretary account creation writes a `SECRETARY` row only when a period is already ACTIVE.
- Term rollover copies existing rows into the target term and never places a Student who has none.
- The enrollment editor (`src/features/enrollments/components/enrollment-editor-dialog.tsx`, `adminUpsertEnrollment`) is not wired into any route.

The result: no administrative user can set year level, section, or a placement into the active Academic Period for a Student who lacks an enrollment. [Issue #619](https://github.com/KinetiqDev/system-cloie/issues/619) covers the bulk term-placement and transfer design and proposes no single-Student behavior change.

## Decision

The Secretary Edit User flow writes a Student's current-term placement whenever an Academic Period is ACTIVE, whether or not the Student already has an enrollment:

- Placement controls (year level, section) are gated on the ACTIVE Academic Period, not on the presence of an enrollment. With no ACTIVE period they stay locked, and the helper text names the reason.
- Year level and section remain required as a pair; the server rejects a one-sided placement.
- Without an ACTIVE period the service rejects a placement save before issuing a confirmation token, so the Secretary never reviews a change that cannot be written.
- The save writes the unique `(student_user_id, term_instance_id)` row for the ACTIVE period: it updates the row in place and forces `is_active` true (reactivating a soft-deactivated row), or creates it with source `SECRETARY` and `created_by` set to the acting Secretary.
- Placement stays a Protected account edit: the confirmation review shows the previous and requested year level and section, and the token is bound to the reviewed before-state plus the requested after-state exactly as before.
- The static academic profile (program, major) and other terms' enrollments are untouched, and no bulk, historical, or cross-term placement path is added.

## Considered Options

- **Wire the existing enrollment editor and `adminUpsertEnrollment` into the Secretary Users page.** Rejected. It adds a second placement write path with its own authorization, no Protected account edit review, and arbitrary-term targeting the reported gap does not need.
- **Allow creation only, leaving deactivated rows alone.** Rejected. Soft deactivation is the ledger's removal rule, so the unique `(student, term)` row can exist inactive; create-only would either violate the unique constraint or silently skip the Student. Upsert is the documented enrollment rule.
- **Let the Secretary choose any term from the edit dialog.** Rejected. The dialog owns current-term placement; cross-term and bulk transitions belong to the term-placement design in issue #619.
- **Leave placement to Student self-service.** Rejected. A Student with no active enrollment is gated as `DEFERRED_ENROLLMENT` and cannot reach the portal.

## Consequences

- `src/features/users/CONTEXT.md` gains the **Secretary term placement set** definition. The Enrollments domain contract is unchanged: upsert semantics, `SECRETARY` as an admin-created source, and soft deactivation still govern the ledger.
- The Edit User record projects the ACTIVE Academic Period so the dialog can distinguish "no placement yet" from "no active period".
- #81's "the flow does not create an enrollment" acceptance criterion is reversed for the case where an Academic Period is ACTIVE. The static-profile-only path still exists: with no ACTIVE period, profile fields save and placement stays unavailable.
- The `DEFERRED_ENROLLMENT` profile gate is unchanged. A Student enters the portal after a placement exists; this decision only gives an administrator a way to create it.
- Issue #619 stays open for bulk placement updates, section transfers, and program/major transfers after rollover.
- Tests pin placement creation, reactivation of a deactivated active-term row, the no-ACTIVE-period rejection, dialog enablement and review content, and Student placement field forwarding in the Server Action.

## Related

- [Issue #79](https://github.com/KinetiqDev/system-cloie/issues/79) — Secretary role-based user edit (parent flow).
- [Issue #81](https://github.com/KinetiqDev/system-cloie/issues/81) — Student academic identity and placement slice (criterion reversed for the ACTIVE-period case).
- [Issue #619](https://github.com/KinetiqDev/system-cloie/issues/619) — bulk term-placement update design (unchanged, still open).
- `src/features/users/CONTEXT.md` — Secretary term placement set, Protected account edit.
- `src/features/enrollments/CONTEXT.md` — student enrollment ledger, enrollment upsert, enrollment source.
