#!/usr/bin/env bash
# Apply the canonical Supabase migration history to a disposable PostgreSQL
# database (CI Postgres service, local test container).
#
# The migration files are authored against the hosted Supabase stack and
# reference auth.* helpers (RLS policies). A minimal auth stub is created
# first; the postgres superuser bypasses RLS, so the stub only needs to make
# the DDL valid.
#
# The auth.uid() stub reads a settable request identity from the
# `app.test_auth_uid` GUC (see src/lib/db/rls-test-helpers.ts). Unset, it
# returns NULL — preserving the superuser-bypass behavior for non-RLS tests.
# RLS probes SET LOCAL the GUC and switch to the `test_authenticated` role
# (a LOGIN role that inherits `authenticated`), which is exactly how a
# Supabase request carrying an authenticated JWT behaves.
#
# Usage: DATABASE_URL=postgresql://user:pass@host:port/db scripts/ci/apply-migrations.sh
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 2
fi

# Target safety: refuse hosted Supabase before any mutation.
# Keep in sync with src/lib/db/verify-database-target.ts allowlist.
if [[ "$DATABASE_URL" == *"supabase.co"* ]] || [[ "$DATABASE_URL" == *"pooler.supabase.com"* ]]; then
  echo "Refusing to apply migrations against hosted Supabase target: DATABASE_URL looks like a hosted Supabase connection." >&2
  exit 2
fi
# Extract hostname from DATABASE_URL for disposable host check (best-effort bash).
DB_HOST="$(node -e 'try{console.log(new URL(process.env.DATABASE_URL).hostname)}catch{console.log("")}' 2>/dev/null || echo "")"
case "$DB_HOST" in
  localhost|127.0.0.1|::1|\[::1\]|postgres|db|0.0.0.0|host.docker.internal) ;;
  *)
    echo "DATABASE_URL must target a disposable database (allowed hosts: localhost, 127.0.0.1, ::1, postgres, db, 0.0.0.0, host.docker.internal); got \"$DB_HOST\"." >&2
    exit 2
    ;;
esac

# psql(1) accepts libpq connection strings directly; the array keeps the
# connection string a single quoted argument.
PSQL=(psql -v ON_ERROR_STOP=1 -q -d "$DATABASE_URL")
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"${PSQL[@]}" <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.test_auth_uid', true), '')::uuid
$$;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  raw_app_meta_data jsonb
);
CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid
);
SQL

for migration in "${REPO_ROOT}"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done

# Supabase applies these default grants at project initialization; the hosted
# role grants are not part of the migration ledger, so replicate them here for
# the disposable stack. `authenticated` receives ALL on every public object
# (matching the hosted default), and the RLS probes connect through the
# LOGIN role `test_authenticated` which inherits `authenticated`.
"${PSQL[@]}" <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
DO $$ BEGIN
  CREATE ROLE test_authenticated LOGIN INHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT authenticated TO test_authenticated;
SQL

echo "Migrations applied."
