# Supabase Backend Workflow

System CLOIE runs against self-hosted Supabase backends only: the **local Supabase CLI Docker stack** for development and **independently deployed Supabase Docker instances** for every other target. Supabase Cloud (Platform login, project linking, project references, and access tokens) is not supported.

There is one migration history and one environment contract across local Docker, remote self-hosted Docker, dedicated demo, and disposable CI. Switching targets is an operator action: stop System CLOIE, activate another environment profile, clear stale Auth cookies, and restart. See [ADR 0020](../docs/adr/0020-self-hosted-supabase-target-neutral-backends.md).

## Email-Password Auth for External Participants (issue #649)

Alumni and Industry Partner may sign in with an email address and password
alongside Google. Credentials, six-digit codes, and recovery live in Supabase
Auth only — the application schema has no password column, and GoTrue stores
passwords hashed.

Local CLI Docker stack: `supabase/config.toml` already sets `enable_signup =
true`, `enable_confirmations = true`, `secure_password_change = true`,
otp_length = 6, otp_expiry = 3600, and a 60s resend cooldown. Restart the
local stack after editing the file. Local mail is captured by the built-in
mail catcher; it is never delivered to a real inbox. Keep it that way for
the dedicated demo deployment and disposable CI as well.

Every other target (staging, dedicated demo, disposable CI, production) is an
independently deployed Supabase Docker instance. The operator configures mail
there and **never** in this repository. Start from
[`supabase/mail.env.example`](mail.env.example), which carries every required
value as a `<<FILL: ...>>` token, and follow
[docs/runbooks/external-entry-mail.md](../docs/runbooks/external-entry-mail.md)
for the full procedure, the zero-cost relay rules, and verification. Copy it to
`mail.env` in the deployment repository, not here; `supabase/mail.env` is
git-ignored. The required settings on each real-delivery instance are:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, and
  `SMTP_SENDER_NAME`, plus SPF and DKIM records for the sending domain.
  `SMTP_USER_NAME` is not a variable upstream Compose reads; the sender name
  arrives through `SMTP_SENDER_NAME`.
- `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` and
  `GOTRUE_MAILER_TEMPLATES_RECOVERY` must point at HTTP(S) URLs the Auth
  container can fetch, serving `supabase/templates/confirm_signup.html` and
  `supabase/templates/recovery.html`. GoTrue fetches the body at send time and
  treats an unreachable URL as a send failure. Its built-in defaults render a
  link, not the `{{ .Token }}` the entry form needs, so mail can arrive and
  still be unusable. `GOTRUE_MAILER_URLPATHS_*` is a different setting: it
  builds link targets for link-based templates and stays unset here.
- `ENABLE_EMAIL_SIGNUP=true` and `ENABLE_EMAIL_AUTOCONFIRM=false`. Autoconfirm
  would let an unverified address reach domain linkage, and it also suppresses
  the verification mail entirely.
- `GOTRUE_MAILER_OTP_EXP` (seconds; keep it at or below `GOTRUE_SECURITY_MAX_AGE`
  so a code cannot outlive its session), `GOTRUE_MAILER_OTP_LENGTH=6`, and
  `GOTRUE_MAILER_AUTOCONFIRM=false`.
- Rate limits on the instance: mail send rate, `GOTRUE_RATE_LIMIT_EMAIL_SENT`,
  `GOTRUE_RATE_LIMIT_OTP`, and the password minimum
  (`GOTRUE_PASSWORD_MIN_LENGTH`, keep at 8 or more to match the app schema).
- `ADDITIONAL_REDIRECT_URLS` must include every per-target System CLOIE
  origin, including the `/verify-email` and `/reset-password` origins.

Code lifetime, attempt limits, and resend cooldown are therefore properties of
the instance configuration, not of the application. Do not infer production
readiness from this file or from local settings.

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
- `[auth]` allowlists the exact localhost and `127.0.0.1` System CLOIE callbacks. The shared
  configuration is fail-closed: it never contains public wildcard callback hosts. Quick Tunnel
  callbacks are added locally per session (see below) and must not be committed.

The two-stage flow needs two callbacks registered:

1. **Google Cloud Console** — create an OAuth client and set the authorized redirect URI to the local Supabase Auth callback: `http://127.0.0.1:54321/auth/v1/callback`.
2. **System CLOIE** — after Supabase Auth completes, the browser redirects to `/api/auth/callback`
   on the origin that initiated sign-in. `supabase/config.toml` allows localhost and `127.0.0.1`
   by default.

For a Quick Tunnel session, append the session's exact callback URL — one generated hostname at a
time, for example `"https://<tunnel-subdomain>.trycloudflare.com/api/auth/callback?intent=*"` — to
`additional_redirect_urls` in your local `supabase/config.toml`, and keep that edit uncommitted.
Leave `NEXT_PUBLIC_SITE_URL` unset before starting System CLOIE so the browser supplies the current
tunnel origin. A fixed localhost value overrides the tunnel origin and sends the OAuth callback
back to localhost. Restart System CLOIE after changing this public environment value. Restart the
local Supabase stack after changing `supabase/config.toml`.

#### Remote-device Quick Tunnel (different network)

The flow above assumes the browser can reach the local Supabase stack directly at
`127.0.0.1:54321` — true only when testing from the same machine. When the browser is on a
different device or network (the reason to expose the dev server through a tunnel), it cannot reach
the loopback Supabase Auth endpoint. System CLOIE handles this by proxying Supabase Auth through
the app origin:

- `src/lib/supabase/client.ts` resolves the browser's Supabase origin from `window.location.origin`
  when `NEXT_PUBLIC_SUPABASE_URL` is a loopback address, so OAuth requests go to the tunnel origin.
- `next.config.ts` adds an `async rewrites()` rule forwarding `/auth/v1/:path*` to
  `NEXT_PUBLIC_SUPABASE_URL` when that URL is loopback, so the tunneled requests reach the local
  stack.

With the proxy in place, two callbacks must point at the current tunnel origin:

1. **System CLOIE callback** — append `"https://<tunnel-subdomain>.trycloudflare.com/api/auth/callback?intent=*"`
   to `additional_redirect_urls` in `supabase/config.toml` (same as the same-machine flow).
2. **Google Cloud Console callback** — Supabase Auth passes its own callback to Google when
   initiating OAuth. Set `[auth.external.google] redirect_uri = "https://<tunnel-subdomain>.trycloudflare.com/auth/v1/callback"`
   in `supabase/config.toml`, and add that exact URL as an authorized redirect URI for the Google
   OAuth client in the Cloud Console. Both are per-session entries for an ephemeral tunnel.

Then restart System CLOIE and the local Supabase stack. For a stable (one-time) registration, use a
named Cloudflare Tunnel with a fixed hostname instead of an ephemeral Quick Tunnel.

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
