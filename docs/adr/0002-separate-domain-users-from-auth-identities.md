# Separate Domain Users from Auth Identities

CLOIE keeps its own stable domain user ID and links Google OAuth identities through a nullable unique `auth_user_id`. Admin-created users can exist before first sign-in and are linked by email during OAuth callback. Directly using Supabase Auth UUID as `User.id` was rejected because it prevents coherent admin provisioning before first login and creates mismatches between pre-created users and OAuth identities.
