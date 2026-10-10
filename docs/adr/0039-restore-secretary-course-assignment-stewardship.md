# Restore Secretary course assignment stewardship

## Decision

Supersede ADR 0019. Secretaries may create, update, activate, deactivate, preflight deletion, permanently delete, and bulk-create Course assignments across all Programs and both Course scopes. The active portal role determines authority. Existing Dean, Program Head, and General Education Coordinator boundaries remain unchanged.

Program-specific assignments must target the owning Program. General Education assignments retain one operational Program per class. Faculty affiliation is advisory, never a restriction on assignment.

Creation validates the target's current Faculty role, account activity, and Faculty approval state inside its transaction. Secretary-provisioned Faculty with no self-request and approved self-request Faculty are eligible; pending and rejected requests are not. Creation also requires an active target Program and a PLANNED or ACTIVE Academic Period in an active School Year. Search and picker options use the same Faculty eligibility predicate.

## Rationale

The Secretary coordinates teaching assignments college-wide. Reusing the existing assignment model and guarded operations supports this responsibility without role impersonation or separate assignment copies.

## Consequences

- Existing class uniqueness, roster identity locks, publication reassignment locks, deletion confirmation, and evaluation-history protections remain intact.
- The selected Program Head dashboard shows the five most recently created active assignments and a total for its selected period, including General Education. This summary is independent of evaluation evidence.
- General Education coverage and Faculty course overview continue to read the same assignment records.
- Successful actions invalidate affected assignment lists, selected Program dashboards, General Education dashboard, and Faculty dashboard and rosters. Other sessions receive current data on navigation or refresh, not through pushed notifications.
- No schema change, persistent cache, new role, or realtime infrastructure is introduced.
