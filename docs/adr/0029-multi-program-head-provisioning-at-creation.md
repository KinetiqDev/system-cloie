# Multi-Program Program Head Provisioning at Creation

## Status

Accepted — partially supersedes
[ADR 0001](0001-complete-secretary-created-accounts.md), which required
exactly one managed program when a Secretary creates a Program Head account.

## Context

Program Head authority is already a set, not a singleton:

- `program_head_assignments` carries `(program_head_id, program_id, is_active)`
  with a compound unique key, so one account holds several assignments.
- The seed fixture keeps a multi-program head (`PH_MULTI` with BEED and BSED).
- The Secretary Edit User flow writes the complete desired assignment set, and
  the revocation gate requires every assignment deactivated.
- `resolveProgramHeadContext` resolves the authorized set at sign-in.

Only the creation entry points lagged: the Add User form offered one combobox
and the creation/grant services wrote one assignment, forcing a follow-up edit
for every additional program.

## Decision

Secretary creation and Secretary role grants accept a managed-program set for
Program Head accounts:

- The Add User form shows a Managed programs checkbox set (the same control
  vocabulary as the Edit User Managed Programs set) requiring at least one
  selection. Other roles keep their single program select.
- `createUserBySecretary` and `addRoleToExistingUser` write one active
  assignment per submitted program inside the existing atomic transaction,
  validating every program active first.
- A legacy single `program_id` degrades to a one-item set in the shared
  role-entry gates, so older grant callers keep working.
- The ADR 0001 single-page form consequence stands: the form remains a
  dedicated page with dynamic role-specific sections.

## Consequences

- New Program Head accounts are complete for every managed program at
  creation; no follow-up edit is required.
- Client creation validation requires `program_ids` for Program Head while the
  server gates keep the single-`program_id` fallback for legacy grant callers.
- Tests cover single, multiple, duplicate, missing, and legacy-single
  submissions at the schema, service, and form levels.
