---
status: accepted
supersedes: ADR 0001 Single-Role Accounts
---

# Multi-role accounts with active role context

System CLOIE accounts may hold more than one distinct assigned role so one authenticated person can participate in separate institutional capacities without duplicate accounts. Exactly one assigned role is active at a time. Every role-owned authorization and profile gate uses that server-resolved active role, while the complete assigned-role set only establishes which contexts the person may select.

The database enforces uniqueness per `(user_id, role)` rather than per user. A server-managed, HTTP-only active-role cookie records the requested context but grants no role by itself. Session resolution accepts it only when the role still exists on the domain account. Missing, stale, or invalid selections fail closed to role selection rather than falling back to unrelated authority.

Eligible self-service claims may add Faculty, Student, Alumni, or Industry Partner roles to an already-linked account. Pre-provisioned roles remain administrator-assigned. Cancelling an incomplete claim may remove only the specifically requested assigned role and only while that role's required profile artifact is absent. Switching active context never creates, revokes, or completes a role.

## Considered options

Keeping the single-role constraint was rejected because one person may legitimately participate in separate staff and respondent capacities. Creating one account per role was rejected because Google OAuth identifies one person by one normalized email and duplicate identities would split ownership and response history. Treating every assigned role as simultaneously authoritative was rejected because it would make route authorization ambiguous and allow one role's permissions to leak into another context.

## Consequences

Role-owned services must authorize `activeRole`, not membership anywhere in `roles`. Role-specific readiness must be resolved for the selected role. Role assignment and active-role selection remain separate operations. ADR 0001's single-role constraint and all documentation derived from it are superseded by this decision.
