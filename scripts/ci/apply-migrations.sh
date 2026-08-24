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

# psql(1) accepts libpq connection strings directly.
PSQL="psql -v ON_ERROR_STOP=1 -q -d ${DATABASE_URL}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

$PSQL <<'SQL'
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
  $PSQL -f "$migration"
done

echo "Migrations applied."
