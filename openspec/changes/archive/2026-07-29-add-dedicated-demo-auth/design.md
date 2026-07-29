## Context

System CLOIE already seeds representative accounts for Secretary, College Dean, Program Head, Faculty Member, Student, Alumni, and Industry Partner routes. The existing `DevRoleSwitcher` and `POST /api/auth/dev-login` path use an unsigned JSON cookie and are explicitly limited to `NODE_ENV=development`. The rendering work needs production-mode browser traces, but OAuth setup is unnecessary when measuring route rendering, server reads, hydration, and LCP.

The chosen environment is a dedicated demo deployment: a production-built Next.js server connected to an isolated demo database or Supabase project. The primary public Production deployment remains OAuth-only. Existing server authorization and account-state behavior remains the source of truth.

## Goals / Non-Goals

**Goals:**

- Reuse the existing role-switcher interaction for production-mode demonstrations and performance testing.
- Add a narrow signed-session seam for dedicated demo identity selection.
- Fail closed when demo configuration is absent, incomplete, or attached to the primary Production deployment.
- Keep the demo deployment isolated, resettable, and free of institutional data.
- Preserve all role, account-state, program, Course Assignment, respondent, and mutation authorization.
- Make browser evidence repeatable without Google OAuth setup while clearly separating route-performance evidence from OAuth evidence.

**Non-Goals:**

- Enabling demo authentication on the primary public Production deployment.
- Replacing Google OAuth for real users.
- Creating Supabase Auth identities or passwords for demo fixtures in this change.
- Making the demo cookie a general-purpose application authentication mechanism.
- Bypassing profile gates, external verification, enrollment, affiliation, ownership, or mutation checks.
- Adding a Prisma model, SQL migration, generated Supabase type, service worker, offline cache, or client-side authentication library.

## Decisions

### 1. Use a dedicated signed demo session, not Supabase email/password

The role switcher needs fast repeatable account changes and the performance work does not measure OAuth or Auth token exchange. A signed demo session avoids demo passwords, Auth-user lifecycle management, refresh-token residue, and extra Supabase Auth provisioning while retaining server-side identity resolution through Prisma.

Supabase email/password remains a viable future option when Auth-session behavior itself needs measurement. It is not selected here because it adds operational setup without improving the requested route and UI testing signal.

### 2. Separate local development auth from dedicated demo auth

The existing development path remains under its current cookie and route names. Dedicated demo auth gets a separate module, cookie name, route, configuration predicate, and tests. No caller should infer that `NODE_ENV=production` is sufficient to authorize demo mode.

The dedicated demo configuration is server-only and consists of:

- an explicit demo deployment marker;
- an explicit enabled flag;
- a long random session-signing secret;
- a server-side allowlist of demo catalog identifiers; and
- an optional deployment identifier used to reject the primary Production deployment.

All values default to disabled. The configuration loader fails closed when enabled configuration is incomplete or when the deployment kind is not the dedicated demo kind. No `NEXT_PUBLIC_` variable contains the secret or allowlist.

### 3. Sign only a stable user identity and re-resolve all authorization data

The demo cookie contains a stable Prisma user ID, issued-at time, expiry time, and an HMAC-SHA256 signature over the canonical payload. It does not contain a role, program scope, account-state result, or permission list.

Cookie verification uses strict parsing, expiry validation, allowlist validation, and constant-time signature comparison. The resolver then loads the Prisma user and its current role/profile state. A short lifetime, such as one hour, limits stale access after configuration or fixture changes.

### 4. Reuse the existing switcher through a server-provided capability

The existing client interaction remains a narrow Client Component because it requires browser state, dragging, search, and navigation. The authenticated server shell receives a serializable `demoEnabled` capability from the server configuration and passes it to a renamed production-facing `DemoRoleSwitcher`.

The browser receives only the boolean capability and catalog display data already intended for the switcher. It never receives the signing secret or an authorization scope. The server route validates the selected catalog entry again.

### 5. Preserve authorization by making demo identity orthogonal to account state

The dedicated demo path must not set a generic `isDemoUser` flag that forces `profileGate` to `COMPLETE`. Seed fixtures must contain the required account-state data, and the normal `resolveProfileGate` path must run. This keeps demo pages useful for testing denial, onboarding, inactive, pending, rejected, and incomplete states when such fixtures are intentionally configured.

The existing development bypass may retain its current behavior until a separate cleanup change removes it. It must not be reused by dedicated demo authentication.

### 6. Keep Supabase middleware behavior explicit

The initial implementation does not alter `src/proxy.ts` or `src/lib/supabase/middleware.ts`. Demo-session requests continue through the existing request pipeline, and the demo identity is resolved by the application server. Any later optimization that skips unnecessary Supabase refresh for demo-only requests requires a measured trace, an explicit request classification, and separate authorization tests.

### 7. Isolate and reset the data plane

The dedicated demo deployment points at a separate database or isolated disposable dataset. The existing Prisma seed fixtures remain the source of demo domain data. An idempotent reset procedure restores the known baseline before performance runs and after demonstrations. The primary Production database is never a demo reset target.

### 8. Use two evidence modes

Evidence records distinguish:

- `signed demo session`: route rendering, server-read, hydration, navigation, UI, and LCP measurements;
- `Supabase OAuth`: authentication exchange and OAuth callback measurements.

Signed demo-session traces are accepted for the rendering change only when they originate from the dedicated demo deployment and include the deployment isolation statement.

## Request Flow

```text
role switcher
  -> POST /api/auth/demo-login with catalog identifier
  -> server demo-config validation
  -> server catalog + Prisma user validation
  -> HMAC-signed short-lived cloie_demo_auth cookie
  -> resolveAuthSession reads and verifies demo identity
  -> normal role/account-state/profile/scope authorization
  -> route Server Component renders
```

## Affected Paths

- `src/features/auth/services/demo-auth.ts`: dedicated configuration, signing, verification, and cookie reader.
- `src/app/api/auth/demo-login/route.ts`: dedicated demo login route.
- `src/features/auth/services/resolve-auth-session.ts`: compose dedicated demo identity with the existing auth resolver without changing OAuth behavior.
- `src/features/auth/components/demo-role-switcher.tsx`: renamed/reused switcher UI and capability prop.
- `src/components/layout/app-shell.tsx`: render the switcher only from the server-provided capability.
- `src/app/api/auth/logout/route.ts`: clear the dedicated demo cookie as well as existing auth cookies.
- `.env.example`, `AGENTS.md`, `README.md`, and deployment/evidence documentation: configuration and operating contract.
- Focused auth, route, component, and production-boundary tests under `src/__tests__/`.

No Prisma schema, migration, or generated Supabase type path is affected.

## Risks / Trade-offs

- [A leaked demo cookie permits demo-deployment access until expiry] -> Use HMAC signing, a one-hour maximum lifetime, secure/httpOnly cookies, isolated data, deployment protection, and a reset/disable procedure.
- [A configuration mistake enables demo auth on primary Production] -> Require an explicit dedicated-demo deployment marker, fail closed for primary Production, omit demo variables from primary Production, and verify both deployment classes.
- [Demo sessions do not exercise OAuth latency] -> Record authentication mode in every evidence record and retain a separate real-OAuth path for auth-performance work.
- [Demo mutations can alter the baseline] -> Use an isolated resettable dataset and reset before repeatable performance traces.
- [The role switcher could imply authorization is client-controlled] -> Treat the switcher as a selector only; derive role, scope, and account state from the server-side Prisma record.
- [Supabase refresh may remain in the critical path] -> Measure before changing middleware; keep any future optimization as a separate reviewed performance slice.
- [A broad rename could create unnecessary churn] -> Introduce the dedicated demo naming at the new seam, preserve development behavior during migration, and remove legacy naming only after callers and tests move.

## Migration Plan

1. Add and test the server-only demo configuration and signed-session module with demo mode disabled by default.
2. Add the dedicated demo login route and resolver integration without changing OAuth or development auth behavior.
3. Reuse the role switcher behind the server-provided demo capability and add the visible demo deployment indicator.
4. Provision an isolated demo deployment and resettable seeded dataset; never point the procedure at primary Production.
5. Run primary/deployed boundary tests, focused auth tests, `pnpm lint`, `pnpm test`, and `pnpm build`.
6. Capture browser evidence under Fast 3G and 4x CPU throttling, recording `signed demo session` and excluding secrets/tokens/private payloads.
7. Roll back by removing the demo configuration and deployment variables, then reverting the dedicated demo route/UI. Existing OAuth and development auth remain independently deployable.

## Open Questions

- Which hosting environment will own the isolated demo deployment: Vercel Preview/Custom Environment or a separately managed `next start` instance?
- Should demo mutations be enabled for demonstrations, or should the performance deployment be read-only after seeding and reset between runs?
- Should a later change provision real Supabase Auth email/password fixtures for OAuth-adjacent testing?
