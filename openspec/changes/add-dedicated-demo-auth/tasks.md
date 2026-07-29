## 1. Configuration And Session Seam

- [x] 1.1 Add a server-only dedicated-demo configuration loader with explicit enablement, deployment-kind validation, required signing secret, and allowlisted seeded demo-user identifiers; verify disabled, incomplete, and primary-Production configurations fail closed with focused unit tests. Verify: focused Vitest auth tests, `pnpm lint`.
- [x] 1.2 Implement the separate signed demo-session module with canonical payload encoding, HMAC-SHA256 signatures, constant-time verification, expiry handling, secure cookie attributes, and server-side user-ID re-resolution. Verify: focused cookie/signature tests covering valid, forged, malformed, expired, and allowlist-rejected sessions.

## 2. Dedicated Demo Login And Session Resolution

- [x] 2.1 Add the separate dedicated demo login route that accepts only a configured catalog identifier, validates the matching active Prisma user, creates the signed demo cookie, and never writes `cloie_dev_auth`. Verify: route tests for valid, unknown, inactive, malformed, disabled, and primary-Production requests.
- [x] 2.2 Integrate dedicated demo-session resolution into the request-scoped auth snapshot without changing OAuth or development-auth behavior. Preserve normal profile-gate, account-state, role, program, Course Assignment, respondent, and mutation authorization. Verify: focused auth/session tests across all seven SystemRole values and denial states.
- [x] 2.3 Update logout to clear the dedicated demo cookie while retaining current Supabase logout and development-cookie behavior. Verify: logout route tests and expired/disabled-session checks.

## 3. Role Switcher And Deployment Experience

- [x] 3.1 Rename or extract the production-facing role switcher around the existing interaction, preserving search, drag positioning, responsive visibility, and accessible labels while keeping development behavior compatible during migration. Verify: focused Testing Library component tests.
- [x] 3.2 Pass a server-derived demo capability into the authenticated application shell and render the switcher only in a valid dedicated demo deployment; add a non-sensitive visible demo-environment indicator. Verify: shell/component tests and primary/demo capability boundary tests.
- [x] 3.3 Update the switcher to call the dedicated demo login route in demo deployments and retain the development login route only for local development. Verify: focused interaction tests and browser smoke verification against a production build.

## 4. Isolated Demo Operations

- [x] 4.1 Document and validate a dedicated demo deployment using an isolated database or Supabase project, seeded role fixtures, no primary institutional data, and server-only environment variables. Verify: configuration checklist and deployment-boundary script.
- [x] 4.2 Add an idempotent demo-data reset/provisioning procedure that restores known fixtures without targeting the primary Production database. Verify: dry-run/target validation and disposable-database integration tests when applicable.
- [x] 4.3 Add primary/deployed boundary verification proving the primary deployment cannot expose demo login, the development login remains unavailable outside development, and the dedicated demo deployment can authenticate only configured fixture accounts. Verify: `pnpm verify:production-auth-boundary`, focused Vitest tests, and production `pnpm build`.

## 5. Evidence And Documentation Reconciliation

- [x] 5.1 Update production browser-evidence instructions and templates to support the dedicated signed demo session, identify its limits versus OAuth evidence, and prohibit credentials, cookies, tokens, and private payloads in records. Verify: documentation review and evidence-script tests.
- [x] 5.2 Update repository auth/deployment documentation and the dedicated demo ADR/runbook with configuration ownership, isolation, reset, rollback, and incident-disable procedures. Verify: documentation consistency review.
- [x] 5.3 Reconcile the navigation-rendering OpenSpec design, role-route spec, task 1.1, and related GitHub issues so authenticated performance evidence depends on the dedicated demo contract and preserves route scope. Verify: `openspec validate --change add-dedicated-demo-auth`, `openspec validate --change improve-navigation-rendering-and-caching`, and issue cross-reference review.

## 6. Final Verification

- [x] 6.1 Run focused auth, route, shell, and boundary tests, then `pnpm test`, `pnpm lint`, and `pnpm build`; confirm no Prisma schema, Supabase migration, or generated-type change was introduced.
- [x] 6.2 Capture dedicated-demo production-build traces for representative role routes under Fast 3G and 4x CPU throttling, recording LCP breakdown and document/fetch/script metadata while identifying `signed demo session` as the authentication mode. Verify: Chrome DevTools performance/network evidence and sanitized evidence records.
- [x] 6.3 Review the final implementation against the dedicated-demo ADR, OpenSpec scenarios, and GitHub acceptance criteria; record residual OAuth-testing and deployment-operation follow-ups.
