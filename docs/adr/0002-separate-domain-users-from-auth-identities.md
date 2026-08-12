# Separate Domain Users from Auth Identities

CLOIE keeps its own stable domain user ID and links Google OAuth identities through a nullable unique `auth_user_id`. Admin-created users can exist before first sign-in and are linked by email during OAuth callback. Directly using Supabase Auth UUID as `User.id` was rejected because it prevents coherent admin provisioning before first login and creates mismatches between pre-created users and OAuth identities.

The domain `User` remains the owner of the canonical account name. For an unlinked Secretary-created account, the Secretary-entered `User.name` is a required provisional pre-link name. During the first successful Google OAuth link matched by exact normalized email, that provisional value is replaced by the Google-derived account name defined by ADR 0014. Later callbacks preserve the stored name, and a Secretary may correct it through user management without changing the stable domain-user/Auth-identity separation.
