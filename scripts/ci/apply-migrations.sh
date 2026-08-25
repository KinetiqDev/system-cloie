#!/usr/bin/env bash
# Apply the canonical Supabase migration history to a disposable PostgreSQL
# database (CI Postgres service, local test container).
#
# The migration files are authored against the hosted Supabase stack and
# reference auth.* helpers (RLS policies). A minimal auth stub is created
# first; the postgres superuser bypasses RLS, so the stub only needs to make
# the DDL valid.
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
  localhost|127.0.0.1|::1|postgres|db|0.0.0.0|host.docker.internal) ;;
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
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
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

echo "Migrations applied."
