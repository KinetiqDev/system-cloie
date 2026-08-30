# Supabase Backend Workflow

System CLOIE runs against self-hosted Supabase backends only: the **local Supabase CLI Docker stack** for development and **independently deployed Supabase Docker instances** for every other target. Supabase Cloud (Platform login, project linking, project references, and access tokens) is not supported.

There is one migration history and one environment contract across local Docker, remote self-hosted Docker, dedicated demo, and disposable CI. Switching targets is an operator action: stop System CLOIE, activate another environment profile, clear stale Auth cookies, and restart. See [ADR 0020](../docs/adr/0020-self-hosted-supabase-target-neutral-backends.md).

## Environment

Copy `.env.example` to `.env.local` (local development) and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` — browser-safe public contract.
- `DATABASE_URL`, `DIRECT_URL` — server database contract. `DIRECT_URL` is used by every remote schema command via `--db-url`.
- `CLOIE_BACKEND_ID`, `CLOIE_DEPLOYMENT_KIND`, `CLOIE_PRIMARY_BACKEND_ID`, `CLOIE_DEMO_BACKEND_ID`, `CLOIE_DEMO_DATABASE_ID` — server-only opaque backend and demo database identity.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — local Google OAuth (consumed by `supabase/config.toml` via environment substitution).

Local values for the CLI Docker stack:

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Get the local anon key from `pnpm supabase:status`.

## Local Development (canonical)

Start the stack once, then reset the database freely; local commands never touch a remote database.

```bash
pnpm supabase:start              # Start the local Supabase CLI Docker stack
pnpm supabase:status             # Inspect local endpoints and generated credentials
pnpm supabase:reset              # Destructive reset of the local database (explicit --local)
pnpm supabase:migration:list:local  # List migrations against the local stack
pnpm supabase:types:local        # Generate TypeScript types from the local stack
pnpm supabase:stop               # Stop the local stack
```

`pnpm supabase:reset` always names the local CLI target explicitly (`--local`) and never consumes a remote database URL.

### Local Google OAuth

Local OAuth is configured in `supabase/config.toml`:

- `[auth.external.google]` is enabled with `client_id = "env(GOOGLE_CLIENT_ID)"` and `secret = "env(GOOGLE_CLIENT_SECRET)"`. Provide both values in an ignored env file; never commit them.
- `[auth]` allowlists the exact localhost and `127.0.0.1` System CLOIE callbacks. It also allows `https://*.trycloudflare.com/api/auth/callback?intent=*` for ephemeral local-development Quick Tunnels. The wildcard covers one generated tunnel hostname and the required role-intent value; it does not allow other callback paths. Do not copy it into production.

The two-stage flow needs two callbacks registered:

1. **Google Cloud Console** — create an OAuth client and set the authorized redirect URI to the local Supabase Auth callback: `http://127.0.0.1:54321/auth/v1/callback`.
2. **System CLOIE** — after Supabase Auth completes, the browser redirects to `/api/auth/callback` on the origin that initiated sign-in. `supabase/config.toml` allows localhost, `127.0.0.1`, and one generated `trycloudflare.com` subdomain.

For a Quick Tunnel session, leave `NEXT_PUBLIC_SITE_URL` unset before starting System CLOIE. The browser then supplies the current tunnel origin. A fixed localhost value overrides the tunnel origin and sends the OAuth callback back to localhost. Restart System CLOIE after changing this public environment value. Restart the local Supabase stack after changing `supabase/config.toml`.

After changing backend targets, clear stale Auth cookies (`cloie_dev_auth`, `sb-*` session cookies) and re-authenticate; sessions are not portable between instances because issuers and signing keys differ.

## Prisma-Owned Schema Changes

Prisma is the canonical schema source. `src/types/supabase-database.ts` is generated output and should never be hand-maintained. When schema changes land, update Prisma, generate the matching Supabase migration, apply it to the intended target, then regenerate the Supabase types.

1. Edit `prisma/schema.prisma` or a file under `prisma/models/`.
2. Run `pnpm supabase:migration:diff -- your_change_name` (or `pnpm supabase:migration:baseline` for the initial empty baseline).
3. Review the SQL created in `supabase/migrations/`.
4. Dry-run before applying: `pnpm supabase:push:dry-run`.
5. Apply to the remote self-hosted target: `pnpm supabase:push`.
6. Regenerate types: `pnpm supabase:types` (remote) or `pnpm supabase:types:local` (local stack).

Some older SQL migrations record historical pre-alignment states. Treat the newest cleanup migration plus the complete Prisma schema directory, entered through `prisma/schema.prisma`, as the current truth.

## Explicit Remote Targets

Remote schema commands never rely on linked state. They read `DIRECT_URL` from the active environment and pass it explicitly with `--db-url`:

```bash
pnpm supabase:migration:list      # Remote migration list (--db-url DIRECT_URL)
pnpm supabase:push:dry-run        # Remote dry-run before applying
pnpm supabase:push                # Remote migration push
pnpm supabase:types               # Remote type generation
```

These commands fail with a useful error when `DIRECT_URL` is missing; there is no linked-project fallback. `DATABASE_URL` remains the pooled runtime connection; schema operations prefer `DIRECT_URL`.

## Removed Cloud Workflow

The Supabase Cloud workflow is removed:

- No `pnpm supabase:login`, `pnpm supabase:link`, or `pnpm supabase:migration:repair-latest`.
- No `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, or `SUPABASE_DB_PASSWORD` environment values.
- No `--linked` flags, Platform access tokens, project references, or `*.supabase.co`/Supavisor hostname parsing.
- No `supabase db pull` or `supabase db diff --linked`.

## Development Versus Production Self-Hosting

- **Local CLI Docker stack** — canonical for development only. It is not production-hardened infrastructure and must not be represented as such.
- **Self-hosted Supabase Docker instances** — used for staging, dedicated demo, disposable CI, and production. They consume the same environment contract, one migration history, and the same commands; only the configured URLs and backend identity differ.
