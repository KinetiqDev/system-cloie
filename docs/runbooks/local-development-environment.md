---
title: System CLOIE Local Development Environment
kind: runbook
status: living
last_verified: 2026-10-05
---

# Local Development Environment

How the development backend on a workstation is provisioned, what it is not, and the three hazards that only exist locally. This runbook owns the **local** target; [deployment.md](../architecture/deployment.md) owns staging, demo, and production, and [`deployment-coolify.md`](../deployment-coolify.md) owns the Coolify procedure.

Verified on Arch Linux x86_64 with Docker and Supabase CLI 2.116.0 (pinned in `package.json`), against the committed migration history at 88 migrations.

## Scope

The local backend is the **Supabase CLI-managed Docker stack**. It is a development convenience, not a deployment target. It exists so the app can be iterated and tested without touching a shared or hosted database. It is **not** production-hardened, it carries development credentials in a committed file, and its mail is captured rather than delivered. Never represent it as staging or production, and never treat it as evidence for either.

Everything about the stack is derived from `supabase/config.toml` and the Supabase CLI. The CLI synthesizes the Compose file at start time into `supabase/.temp/`; the repository contains no local stack Compose file. The only Compose file tracked here is [`supabase/docker-compose.auth-mail.yml`](../../supabase/docker-compose.auth-mail.yml), which is an overlay for the _remote_ self-hosted deployment and is never applied to this stack.

## Target matrix

Four targets share one migration history and one environment contract ([ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md)). Only the first is this runbook's subject.

| Target                                | Postgres          | Gateway                        | Pooler                   | Mail                             | Auth mode                                           | Destructive reset           |
| ------------------------------------- | ----------------- | ------------------------------ | ------------------------ | -------------------------------- | --------------------------------------------------- | --------------------------- |
| **Local CLI Docker stack** (this doc) | 17.6              | `127.0.0.1:54321`              | none (`enabled = false`) | bundled catcher, never delivered | `cloie_dev_auth` cookie, `POST /api/auth/dev-login` | `pnpm supabase:reset`       |
| Staging (Coolify)                     | 17.6              | `https://api.system-cloie.app` | Supavisor (private)      | real relay                       | Google OAuth                                        | operator-run migration push |
| Dedicated demo                        | own DB            | own origin                     | Supavisor (private)      | real relay                       | signed demo session                                 | `pnpm demo:reset`           |
| Disposable CI                         | 16-alpine service | none — bypasses Supabase       | none                     | bundled catcher                  | signed `cloie_ci_test_auth` session                 | job teardown                |

Two consequences worth stating plainly. First, **the local stack has no connection pooler**, so the pooler behavior that production depends on is not reproduced locally. Second, **the local stack does not use Google OAuth for application sign-in** — `cloie_dev_auth` bypasses GoTrue entirely, so a change that breaks the Google callback can be green locally and broken everywhere else. [`pnpm test:auth-integration`](#real-auth-integration) exists to close that specific gap.

## Ports

Read from `supabase/config.toml`.

| Port    | Service              | Exposed to host   | Configured by      |
| ------- | -------------------- | ----------------- | ------------------ |
| `54321` | Kong (API gateway)   | yes               | `[api]`            |
| `54322` | PostgreSQL           | yes               | `[db]`             |
| `54320` | Shadow database      | no (db diff)      | `[db] shadow_port` |
| `54329` | Pooler               | no — **disabled** | `[db.pooler]`      |
| `54323` | Studio               | yes               | `[studio]`         |
| `54324` | Mail catcher         | yes               | `[inbucket]`       |
| `54327` | Logflare / analytics | yes               | `[analytics]`      |

Five ports are bound on `0.0.0.0`: `54321`, `54322`, `54323`, `54324`, `54327`. `54320` is used by the CLI internally for shadow-database diffs, and `54329` is not bound because the pooler is disabled. Every other container (`studio`, `pg_meta`, `storage`, `vector`) is reachable on the `supabase_network_project-cloie` network only.

## Lifecycle

```bash
pnpm supabase:start              # Start the stack
pnpm supabase:status             # Endpoints plus generated credentials
pnpm supabase:reset              # Destructive reset: drops, recreates, migrates, seeds
pnpm supabase:stop               # Stop
pnpm supabase:migration:list:local
pnpm supabase:types:local        # Regenerate src/types/supabase-database.ts
```

`pnpm supabase:reset` always passes `--local` explicitly and cannot be pointed at a remote database.

Verify the stack is actually healthy rather than trusting the last start:

```bash
pnpm supabase:status
curl -s -o /dev/null -w 'kong %{http_code}\n' http://127.0.0.1:54321/rest/v1/
curl -s -o /dev/null -w 'studio %{http_code}\n' http://127.0.0.1:54323/
curl -s -o /dev/null -w 'mail %{http_code}\n' http://127.0.0.1:54324/
curl -s -o /dev/null -w 'analytics %{http_code}\n' http://127.0.0.1:54327/
```

Expected: `kong 200`, `studio 307` (redirect to the login page), `mail 200`, `analytics 302`. **A healthy `pnpm supabase:status` does not mean every service is up.** The status line lists stopped services separately; a start with services in a failed state can leave the status call succeeding while a container has exited. Check the container list directly when a service behaves inconsistently:

```bash
docker ps -a --filter name=supabase_ --format '{{.Names}}\t{{.Status}}'
```

`edge_runtime`, `imgproxy`, and the pooler are commonly stopped or degraded locally. This is expected and harmless for application work: the repository has no `supabase/functions/` directory and no source path calls `functions/v1`. `edge_runtime` is enabled in `config.toml` but nothing depends on it.

## Hazard: the stack is shared across every git worktree

Every worktree of this repository carries the same `project_id = "project-cloie"` in `supabase/config.toml`. That single value determines the ports, the Compose project name, and the Docker volume name. Consequences:

- **One database serves every worktree.** They are not isolated from each other in any way.
- **`pnpm supabase:reset` in any worktree destroys the data under all of them.** This is the single most destructive local action.
- **The `supabase/config.toml` in effect is whichever worktree started the stack**, not the one you edited. Containers carry `com.supabase.cli.workdir` for exactly this reason:

  ```bash
  docker inspect supabase_db_project-cloie --format '{{index .Config.Labels "com.supabase.cli.workdir"}}'
  ```

  If that path is not the worktree you are in, your `config.toml` edits (redirect allowlists, `[auth]` settings, Google OAuth client) have no effect until the stack is restarted from your worktree.

- Because ports are fixed by `project_id`, two worktrees cannot run stacks concurrently. A port conflict means the other stack is already up.

Check migration drift after pulling or switching branches, because the shared database is not reset for you:

```bash
pnpm supabase:migration:list:local
```

Applied versions must equal the committed files in `supabase/migrations/` with no extra entries. If the branch added migrations you have not reset for, or applied ones the branch no longer contains, reconcile before trusting local data.

## Hazard: `verify:database-target` does not protect the dev stack

`pnpm verify:database-target` and the guarded runners reject hosted Supabase hostnames and refuse any host outside the disposable allowlist. `127.0.0.1` is on that allowlist — and so is the port the dev stack publishes.

That means a normal `.env.local`, which points `DATABASE_URL` at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, **passes the check**:

```text
Disposable database target OK: postgresql://127.0.0.1:54322/postgres
```

The check proves the target is not a _hosted_ backend. It does not prove the target is disposable. Never run a destructive or gated command — `pnpm test:db`, `pnpm supabase:push`, `pnpm demo:reset`, `pnpm supabase:migration:diff` — against the default `.env.local`. Point the command at a dedicated throwaway database as described below.

## Disposable database for `pnpm test:db`

The gated DB invariant suites write to the database. They must never run against the shared dev stack. CI provisions its own container; locally, do the same.

**Prerequisite:** a PostgreSQL client. `psql` is required by `scripts/ci/apply-migrations.sh` and is frequently absent on a workstation. Install it if `psql --version` fails (Arch: `pacman -S postgresql-libs`, or just `postgresql`).

Start a throwaway database:

```bash
docker run -d --name cloie-test-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cloie_test \
  -p 55440:5432 \
  postgres:16-alpine
```

Replay the canonical migration history and seed the fixture into it:

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' \
DIRECT_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' \
  bash scripts/ci/apply-migrations.sh

DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' \
DIRECT_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' \
  pnpm db:seed
```

`apply-migrations.sh` needs no changes: it creates the `auth` stub, `anon`, `authenticated`, and `test_authenticated` roles and replays every migration in order.

Run the suites against **only** that database, never letting `.env.local` supply the URL:

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' \
RUN_DATABASE_INTEGRATION_TESTS=1 \
  pnpm test:db
```

Verify the target and suite discovery first if you want the guard:

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55440/cloie_test' pnpm verify:database-target
pnpm verify:database-suites
```

Expected: 16 suites discovered and passing. Confirmed locally on 2026-10-05 — 16 files, 222 tests.

Discard it when finished. It holds nothing but seeded fixture data:

```bash
docker rm -f cloie-test-pg
```

Do not name the container `cloie-test-pg` while another exists; pick a free port and record it, because the port becomes part of every command above.

## Real Auth integration

`pnpm test:auth-integration` is the only gate that exercises the actual GoTrue service — signup, six-digit code verification, recovery, and the mail templates — rather than a signed cookie that bypasses it. Locally it starts the stack itself, excluding services it does not need, and **stops the stack again only if it started it**. If you already have the dev stack running, it uses yours and leaves it running.

```bash
pnpm test:auth-integration
```

Read captured mail at http://127.0.0.1:54324. Nothing is ever delivered to a real inbox: GoTrue's SMTP points at the bundled catcher, and the suite refuses any endpoint that is not loopback.

This gate is not in the README script table. It is also not in `AGENTS.md`; see [architecture/deployment.md → CI environments](../architecture/deployment.md).

## Local Google OAuth and tunnels

`supabase/config.toml` holds `[auth.external.google]` with `client_id`/`secret` from `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (keep them in an ignored env file). Two callbacks are needed: `http://127.0.0.1:54321/auth/v1/callback` in the Google Cloud Console, and the app's own `/api/auth/callback`, which the committed allowlist already covers for `localhost` and `127.0.0.1`.

Editing `config.toml` only takes effect after restarting the stack from the worktree that owns it (see the worktree hazard above). For remote-device testing through a Quick Tunnel, including the two per-session callback entries and the app-origin Auth proxy, follow [supabase/README.md → Remote-device Quick Tunnel](../../supabase/README.md).

## Environment files

All env files are ignored except `.env.example`. The local ones are:

| File                       | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `.env.local`               | Default development values, including the local URL triple               |
| `.env.production.local`    | Local rehearsal of the dedicated demo deployment against the local stack |
| `.env.application.local`   | Credential-free production worksheet template (`<<FILL: …>>` values)     |
| `supabase/.env.auth.local` | Untracked Google OAuth values for the local stack                        |
| `supabase/mail.env`        | Real relay settings; the tracked `mail.env.example` is the template      |

`.env.local` sets `CLOIE_DEPLOYMENT_KIND="dedicated-demo"` with `CLOIE_DEMO_ENABLED="false"`, which is inert but inconsistent: the kind is set while demo authentication is off. Set it to a value matching what you are actually exercising, or leave it empty.

**Do not create or keep a file holding Supabase Cloud values.** Cloud is not supported ([ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md)): there is no `supabase:login`, no `supabase:link`, no project reference, and no access token in any workflow. A Cloud credential file on disk is a live secret for a project the codebase cannot reach. If one exists, delete it and rotate the credential.

## Containerized development image

`Dockerfile.dev` builds a containerized dev server that runs `pnpm dev` against the local Supabase stack. It is not referenced by any document, CI workflow, or script — treat it as a local convenience, not a maintained target, and prefer the documented workflow above. Avoid accumulating tagged build layers; rebuild or prune when done.

## Not applicable locally

- **Mail delivery.** The catcher only. Real relay configuration belongs to a deployed target: [external-entry-mail.md](external-entry-mail.md).
- **Demo reset.** `pnpm demo:reset` targets the dedicated demo deployment and validates that target's identity before doing anything. Local rehearsal of that deployment uses `.env.production.local` plus the reset command, and is not part of this stack's lifecycle.
- **Pushes and type generation against a remote.** `pnpm supabase:push` and `pnpm supabase:types` read `DIRECT_URL` from the active environment. With the local `.env.local` active they target the local database, not a deployment.
- **`pnpm test:e2e` at production parity.** Locally Playwright boots the dev server with `cloie_dev_auth`; only CI runs the production build with the signed CI session.
