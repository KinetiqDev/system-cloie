# ADR 0010: Unified Appearance and Protected Showcase

- **Status:** Accepted
- **Date:** 2026-08-04
- **Contexts:** Identity and Access, Design System, Deployment Operations

## Decision

System CLOIE will support Light, Dark, and System appearance resolution through a browser-local preference and a single root semantic token contract. The appearance rollout is a server-owned gate; primary Production remains Light-only until a cross-surface acceptance gate passes. A protected Design System Showcase will operate under the authenticated application shell in development and the isolated dedicated demo deployment, fail-closed with not-found UI in primary Production, and use only static, mutation-free representative fixtures.

Appearance storage carries no authorization value. No service worker, offline cache, or persistent application cache is added. The showcase is a static visual reference and must not add `navigator.onLine`, a service worker, offline guards, or mutation behavior.

The first-paint appearance bootstrap mechanism depends on deployment Content Security Policy evidence. The CSP feasibility investigation is a blocking task before appearance implementation proceeds; the chosen mechanism (inline `'unsafe-inline'`, hash-based SRI, or nonce) must operate with the existing `src/proxy.ts` session-refresh flow and the streamed `Suspense` root layout.

## Context

`docs/design.md` defines the approved Light, Dark, and System visual contract. Current `main` has Light token values in `src/styles/tokens.css`, no Dark block, no appearance provider, no persistence, and no first-paint resolver. The repository has no effective Content Security Policy header in `src/proxy.ts` or `next.config.ts`. The authenticated `(app)` layout already streams `AuthenticatedAppShell` under `Suspense` (`src/app/(app)/layout.tsx`).

ADR 0008 requires development and demo tooling to fail closed in primary Production. ADR 0006 defers service workers, offline caching, and mutation queues. ADR 0009 establishes canonical Program Head selected-Program routes under `programs/[programId]/...` and preserves the single-role account invariant.

The showcase is an authenticated design reference that renders real production tokens and components. It uses static fixtures without database queries, mutations, user data, or credentials. Its access policy is server-side only; no `NEXT_PUBLIC_*` flag enables it. The route is intentionally URL-only and does not enter role-primary navigation.

## Options Considered

### Account-persisted appearance preference

Rejected. Storing appearance in a user profile would add Prisma schema changes, a Server Action, and cross-device privacy surface for a cosmetic browser preference. Browser-local storage meets the approved persistence requirement without account coupling.

### `next-themes`

Rejected. It has no current dependency, the root `.dark` selector already exists in `globals.css`, and the required behavior (resolve preference, apply root class, listen for OS changes) is small and auditable in project-owned code.

### Nonce-based CSP as default

Rejected as a casual fallback. Nonce CSP forces dynamic rendering on every page, removes static/CDN benefits, and is incompatible with Partial Prerendering. The feasibility task must compare inline `'unsafe-inline'` bootstrap, same-origin external bootstrap, hash-based SRI policy, and nonce policy before the implementation path is chosen.

## Decision Details

### 1. Appearance persistence and rollout

- Preference is stored in browser storage under a stable key, parsed through a pure resolution module shared by the bootstrap script and hydrated provider.
- A missing, malformed, or unavailable value defaults to System.
- Explicit Light or Dark takes precedence over OS preference.
- Primary Production appearance is enabled only when the server-only `CLOIE_APPEARANCE_ENABLED` release setting is exactly `"true"`; unset, empty, `"false"`, malformed, and all other values remain disabled. When disabled, the bootstrap forces Light before paint, ignores storage, and writes no preference. The avatar menu omits the control and `Settings → Appearance` returns not-found UI.
- Repository readiness is recorded in the OpenSpec task; a separate operator follows `docs/runbooks/appearance-production-activation.md` to make, verify, record, or roll back the deployment configuration change. No source-code or example-environment default enables the rollout.
- The setting is listed in `.env.example` as a release control, never exposed through `NEXT_PUBLIC_*`.

### 2. Protected showcase access

| Environment | Behavior |
| --- | --- |
| `NODE_ENV === "development"` | Available to authenticated accounts that pass the parent account-state guard |
| Isolated dedicated demo deployment with valid `getDemoAuthConfig()` | Available to demo-authenticated accounts |
| Primary Production or malformed demo configuration | Route returns not-found UI before showcase content renders |

- The policy relies on ADR 0008's fail-closed dedicated-demo identity checks.
- Under streamed layouts, the access check runs in the route's server component before content is yielded. This may produce a not-found UI within the authenticated shell rather than an HTTP 404 status. An actual 404 is only promised if the check can execute before the streaming response commits and tests prove the status code.
- Every authenticated active role may view the showcase because its content is static design reference. The route neither changes the active role nor exposes a role-owned domain operation.

### 3. Offline and cache boundaries

- The offline showcase section is a static visual reference card. It must not claim offline data, service-worker caching, or mutation behavior is available.
- No `navigator.onLine` consumer, service worker, persistent application cache, offline mutation queue, or network simulation feature is added. ADR 0006 remains the deferred authority for any offline implementation.

### 4. CSP and first-paint mechanism

- The current effective deployment CSP headers need inspection. The repository has no CSP in `src/proxy.ts` or `next.config.ts`.
- A dedicated CSP feasibility task must investigate before appearance implementation: compare inline bootstrap (`'unsafe-inline'`), same-origin external bootstrap, hash-based SRI (experimental, Next.js 16 App Router), and nonce policy through `src/proxy.ts`.
- Nonce CSP forces all pages to dynamic rendering and removes static/CDN benefits. It cannot be a casual fallback clause.

## Consequences

### Positive

- Appearance preference is self-contained, browser-local, and does not couple account, authorization, or database state.
- The rollout gate gives operators an explicit separator between design-system implementation and primary-Production availability.
- The showcase provides a single live visual-regression and accessibility reference without duplicating production components.
- Fail-closed showcase access reuses existing ADR 0008 guards.

### Negative

- Two separate controls (avatar menu and Settings Appearance) must remain synchronized; the appearance provider is the single source of truth.
- The CSP feasibility task is a blocking dependency before appearance selection reaches any deployment.
- Showcase denial under streamed layouts may produce not-found UI rather than an HTTP 404 until implementation proves the earlier check.
- The server-owned rollout setting adds an operator step that could be missed if not documented in the release runbook.

## References

- `docs/design.md` — approved visual contract
- ADR 0006 — deferred PWA/offline
- ADR 0008 — dedicated demo deployment fail-closed
- ADR 0009 — Program Head selected-Program routes
- OpenSpec change: `openspec/changes/migrate-unified-design-system/`
