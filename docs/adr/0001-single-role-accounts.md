---
status: superseded by ADR 0022
---

# Single-role accounts

System CLOIE accounts were originally constrained to one assigned role to avoid ambiguous dashboards, onboarding gates, and role changes. The database enforced that model with a unique constraint on `UserRole.user_id`.

ADR 0022 supersedes this decision. Accounts may now hold distinct assigned roles while exactly one server-resolved active role controls authorization and profile gating.
