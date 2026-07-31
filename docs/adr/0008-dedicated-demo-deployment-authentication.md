# ADR 0008: Dedicated Demo Deployment Authentication

- **Status:** Accepted
- **Date:** 2026-07-28
- **Contexts:** Identity and Access, Deployment Operations, Production Browser Evidence

## Decision

System CLOIE will support the existing role-switcher experience in a dedicated demo deployment that runs a production-mode Next.js build. The demo deployment may use a short-lived HMAC-signed application demo session to select and impersonate seeded demo accounts for demonstrations and route-performance testing.

The primary public Production deployment remains OAuth-only. Demo authentication MUST NOT be enabled there, and its database MUST NOT be used as the demo reset target.

The dedicated demo session supplies identity only. The server re-resolves the Prisma user and applies the existing active account role, account-state, profile-gate, program scope, Course Assignment ownership, respondent eligibility, and mutation authorization rules.

## Context

The application already seeds representative domain users for Secretary, College Dean, Program Head, Faculty Member, Student, Alumni, and Industry Partner experiences. The development-only `cloie_dev_auth` cookie and `POST /api/auth/dev-login` route make local role testing efficient, but they are intentionally unavailable in production builds.

The rendering and LCP work requires authenticated production-build traces. Requiring real Google OAuth accounts for every role adds setup and measures OAuth overhead that is unrelated to server rendering, route transitions, hydration, and page performance. Supabase email/password demo identities were considered, but would introduce demo passwords, Auth-user lifecycle management, refresh-token state, and additional provisioning without improving the requested route-performance signal.

## Options Considered

### Real Supabase OAuth accounts

Rejected as the default demo mechanism. This remains the correct path for validating OAuth exchange, callback behavior, and real Auth-session latency, but it is operationally expensive for routine role-page demonstrations and rendering traces.

### Seeded Supabase email/password accounts

Rejected as the default demo mechanism. It would reuse the normal Supabase SSR session path, but it requires provisioning Auth users and passwords, creates real refresh-token/session state, and still requires isolated Auth/database infrastructure. It remains a possible future evidence mode for Auth-specific work.

### Dedicated signed demo session

Accepted. It is efficient for repeated role switching, does not issue Supabase JWTs to demo users, is easy to disable, and can be tested at a narrow server-side seam. Its use is limited to the isolated demo deployment and must not become a general authentication path.

## Security Contract

- Configuration is server-only and defaults to disabled.
- Enablement requires an explicit dedicated-demo deployment marker, an enable flag, a long random signing secret, and an allowlist of seeded demo-user identifiers.
- Primary Production fails closed even if an operator accidentally supplies a demo flag or secret.
- The demo cookie is separate from `cloie_dev_auth`, httpOnly, secure in HTTPS deployments, same-site, path-scoped, and short-lived.
- The cookie payload contains only a stable user identifier and expiry metadata protected by an HMAC-SHA256 signature.
- The server never trusts a client-provided role, program, account state, scope, or permission.
- Demo identities are resolved against the allowlisted seeded catalog and current Prisma user record on every request.
- Demo data is isolated from institutional Production data and resettable through an idempotent operator procedure.
- Demo secrets, allowlists, cookies, credentials, tokens, and private response data do not enter browser evidence or committed files.
- Removing demo deployment configuration disables new sessions; short-lived existing cookies expire naturally, and operators may clear them through deployment/session controls.

## Consequences

### Positive

- Role switching remains fast and usable in a production-mode demo deployment.
- LCP and route-rendering evidence does not require OAuth setup or include OAuth latency.
- No demo passwords or Supabase Auth refresh tokens need to be distributed.
- Existing domain authorization remains the single source of truth.
- The dedicated path is independently testable and reversible.

### Negative

- Signed demo-session traces do not prove OAuth correctness or OAuth performance.
- A leaked demo cookie can provide temporary access to the isolated demo deployment.
- Demo mutations can change the baseline until the reset procedure runs.
- The deployment contract is stricter than a simple environment flag; isolation and fail-closed checks are required.

## Operational Rule

Use `signed demo session` only for route rendering, UI, navigation, server-read, hydration, and LCP evidence. Use real Supabase OAuth accounts for OAuth exchange, callback, session-refresh, and identity-provider evidence.

## References

- OpenSpec change: `openspec/changes/add-dedicated-demo-auth/`
- Parent feature: [GitHub issue #196](https://github.com/Tugeru/project-cloie/issues/196)
- Contract issue: [GitHub issue #197](https://github.com/Tugeru/project-cloie/issues/197)
- Operator runbook: `docs/runbooks/dedicated-demo-deployment.md`
