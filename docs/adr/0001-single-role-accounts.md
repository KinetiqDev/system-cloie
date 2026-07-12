# Single-Role Accounts

CLOIE accounts are single-role accounts. Although the current implementation uses a `UserRole` join table and primary-role resolution, the desired product model is one role per account; the database should enforce that invariant to prevent ambiguous dashboards, onboarding gates, and role changes. Multi-role flexibility was rejected because role changes should be administrator-controlled, not accumulated by self-service role claims.

The existing `user_roles` table should be kept initially, but constrained so each user can have only one role assignment. This enforces the invariant with a smaller migration and refactor than immediately replacing the join table with a `users.role` column.

Single-role accounts do not mean a user can only perform one kind of work. Operational capabilities can be granted by domain assignments, such as Course Assignment ownership giving a Program Head teaching capability for a specific assignment period. These capabilities do not create additional account roles or enable role switching.
