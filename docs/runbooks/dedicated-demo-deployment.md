# Dedicated Demo Deployment Runbook

This is the operator-facing contract for the isolated production-mode demo deployment. It complements [ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md); the full design and normative scenarios live in [`openspec/changes/add-dedicated-demo-auth/`](../../openspec/changes/add-dedicated-demo-auth/).

## Scope And Safety

- Use this deployment for demonstrations and production-build route/rendering evidence only.
- The primary public Production deployment remains OAuth-only. Never enable demo authentication there.
- Use a separate Supabase project or isolated disposable PostgreSQL database with no institutional Production data.
- Treat signed demo-session evidence as route/rendering evidence. It does not measure Google OAuth exchange, callback, or Supabase Auth session-refresh latency.
- Keep secrets, allowlists, cookies, tokens, credentials, and private response bodies out of this repository and evidence records.

## Authentication Modes

| Deployment or mode        | Authentication contract                                       | Allowed use                                                  |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Primary Production        | Supabase Auth with Google OAuth                               | Real institutional users and OAuth evidence                  |
| Local development         | `cloie_dev_auth` and `POST /api/auth/dev-login`               | Local role testing only                                      |
| Dedicated demo deployment | Short-lived signed demo session backed by seeded Prisma users | Production-build demonstrations and route/rendering evidence |

The demo mode is not a replacement for OAuth and must not reuse the local development cookie or login route.

## Implementation Seam

The implementation issues reference this seam:

- `src/features/auth/services/demo-auth.ts`: server-only configuration, signing, verification, cookie handling, and demo capability.
- `src/app/api/auth/demo-login/route.ts`: accepts only an allowlisted seeded catalog identifier and creates the signed demo session.
- `src/features/auth/services/resolve-auth-session.ts`: composes demo identity resolution with the normal request-scoped auth snapshot.
- `src/features/auth/components/demo-role-switcher.tsx`: production-facing role-switcher component.
- `src/components/layout/app-shell.tsx`: receives the server-derived demo capability and renders the switcher only when valid.

The signed session supplies identity only. Every request re-resolves the current Prisma user and applies the existing role, account-state, profile-gate, program scope, Course Assignment ownership, respondent eligibility, and mutation authorization rules. The client never supplies the authorization role or scope as authority.

The authenticated shell renders a visible, non-sensitive demo-environment indicator only when the server-derived dedicated-demo capability is valid. It never exposes the signing secret, allowlist, or backend identity values.

## Environment Contract

Set these values only in the dedicated demo deployment's server environment:

| Variable                    | Contract                                                                       |
| --------------------------- | ------------------------------------------------------------------------------ |
| `CLOIE_DEMO_ENABLED`        | Explicit enable flag; absent or false disables the flow.                       |
| `CLOIE_DEPLOYMENT_KIND`     | Must be `dedicated-demo` on the dedicated isolated demo deployment.            |
| `CLOIE_BACKEND_ID`          | Opaque identity of the running deployment; must equal `CLOIE_DEMO_BACKEND_ID`. |
| `CLOIE_DEMO_BACKEND_ID`     | Opaque identity of the dedicated demo deployment.                              |
| `CLOIE_PRIMARY_BACKEND_ID`  | Opaque identity of primary Production; must differ from the demo identity.     |
| `CLOIE_DEMO_DATABASE_ID`    | Opaque identity recorded in the target's private marker.                       |
| `CLOIE_DEMO_SESSION_SECRET` | Long random server-only HMAC signing secret.                                   |
| `CLOIE_DEMO_ALLOWED_USERS`  | Non-empty server-side allowlist of seeded demo catalog identifiers.            |

The configuration loader must fail closed when any required value is absent, malformed, or attached to the primary Production deployment. Runtime demo authentication requires `CLOIE_BACKEND_ID` to equal `CLOIE_DEMO_BACKEND_ID` and differ from `CLOIE_PRIMARY_BACKEND_ID`, together with `NEXT_PUBLIC_SUPABASE_URL` and `DATABASE_URL`. Backend identity is an opaque operator-assigned string (`[A-Za-z0-9._-]`), compared by strict equality, never derived from hostnames or URLs, and never logged. Do not expose the signing secret, allowlist, or backend identity through `NEXT_PUBLIC_*`, browser bundles, logs, or evidence. `CLOIE_DEMO_ALLOWED_USERS` must contain only the intended seeded demo catalog. The demo cookie is separate from `cloie_dev_auth`, httpOnly, secure for HTTPS, same-site, path-scoped, short-lived, and HMAC-SHA256 signed.

Before accepting an authenticated trace, verify the deployment marker, database target, seed state, and production build. Use the procedure in [`docs/testing/production-browser-evidence.md`](../testing/production-browser-evidence.md) and label the authentication mode exactly as `signed demo session`.

## Provision And Reset

1. Create or select the isolated demo Supabase Docker instance or disposable PostgreSQL database. Confirm that its database URL is not the primary Production target.
2. Configure the normal application environment plus the server-only `CLOIE_DEMO_*` values and the demo backend identity. Do not configure them on primary Production.
3. Confirm `CLOIE_BACKEND_ID` equals `CLOIE_DEMO_BACKEND_ID` and differs from `CLOIE_PRIMARY_BACKEND_ID`, and that `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, and `DIRECT_URL` all point at the dedicated demo instance.
4. Before the first reset, create the private `cloie_ops.demo_target` marker on the demo database. Record the demo backend identity, `CLOIE_DEMO_DATABASE_ID`, and the configured public Supabase URL. Revoke schema and table access from `PUBLIC`, `anon`, and `authenticated`, and enable RLS. The marker is independent of the active environment, so environment mistakes alone cannot authorize destruction. Later successful resets recreate it automatically.
5. Run `pnpm demo:reset`. The reset verifies deployment kind, backend identity, database identity, separation from primary Production, and the persisted target marker before it invokes Supabase; it resets the isolated database through the migration history (including SQL-only triggers and policies), generates Prisma, and seeds known fixtures. Reset and baseline seed use `--db-url`; no generic command resets whichever database happens to be configured.
6. Build and start the production server with `pnpm build` and `pnpm start`.
7. Verify the deployment boundary before browser work: run `pnpm verify:production-auth-boundary` against primary Production and `pnpm verify:dedicated-demo-auth-boundary` against the dedicated demo deployment.

Reset before repeatable traces and after demonstrations with `pnpm demo:reset`. Do not use `pnpm db:push` or `pnpm db:seed` as a demo reset procedure: they do not establish target identity and do not remove arbitrary mutations. The reset command fails before running Supabase or Prisma unless deployment kind, backend identity, expected database identity, primary Production separation, and the persisted target marker all agree with the dedicated demo instance.

## Rollback And Incident Disable

1. Remove `CLOIE_DEMO_ENABLED`, `CLOIE_DEPLOYMENT_KIND`, `CLOIE_DEMO_SESSION_SECRET`, and `CLOIE_DEMO_ALLOWED_USERS` from the demo deployment environment, then redeploy or restart it. This disables creation of new demo sessions.
2. Revoke or clear active demo-session cookies through the hosting/session controls. Short-lived cookies must not be treated as a substitute for incident response.
3. If isolation is uncertain or demo data is exposed, delete the dedicated demo deployment and its isolated database/project. Do not attempt to repair it by resetting primary Production.
4. Rotate the demo signing secret and replace the allowlist before re-enabling a newly verified isolated deployment.
5. Confirm that primary Production OAuth and local development auth remain independently deployable. Do not change `cloie_dev_auth`, `POST /api/auth/dev-login`, `src/proxy.ts`, or `src/lib/supabase/middleware.ts` as part of this rollback.

## Evidence Limits

Record only the deployment class, role, account-state summary, route, viewport, throttle settings, authentication mode, LCP breakdown, and redacted request metadata. Never record account identifiers, credentials, cookies, authorization headers, tokens, or private response bodies. Use real Supabase OAuth accounts for OAuth exchange, callback, session-refresh, and identity-provider evidence.
