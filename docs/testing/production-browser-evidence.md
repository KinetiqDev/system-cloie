# Production Browser Evidence

This is the repeatable evidence path for issue #193 and the authenticated performance slices that depend on it.

## Security Contract

- Run `pnpm build` and `pnpm start`; do not use `pnpm dev` for accepted evidence.
- Use either disposable real Supabase-authenticated test accounts or the separately reviewed signed demo session in an isolated dedicated demo deployment.
- The dedicated demo deployment MUST use a production-mode build and a resettable non-Production database or dataset.
- The primary public Production deployment remains OAuth-only. Demo variables MUST NOT be configured there, and its database MUST NOT be used for demo resets.
- `cloie_dev_auth` and `POST /api/auth/dev-login` remain development-only and MUST NOT be used after `pnpm build` and `pnpm start`.
- Signed demo-session evidence measures route rendering, server reads, hydration, navigation, UI, and LCP. It does not measure Google OAuth exchange, callback, or Supabase Auth session-refresh latency.
- Keep demo secrets, allowlists, OAuth credentials, database connection secrets, cookies, access tokens, refresh tokens, and private response data outside the repository and outside trace exports.
- Disable the dedicated demo configuration or destroy the disposable environment after the evidence window.

The application permits one reviewed test-only authentication mechanism for production builds: the signed demo session defined by ADR 0008. It is valid only in a dedicated isolated demo deployment and cannot be enabled on the primary public Production deployment.

## Disposable Environment Setup

1. Create or select an isolated Supabase project and disposable database dataset. Never point DB integration tests or demo resets at a shared hosted database.
2. Choose one evidence mode. For signed demo-session evidence, configure the dedicated demo deployment marker, demo enable flag, session secret, and allowlist through server-only environment variables. For OAuth evidence, configure the isolated project's OAuth redirect URL for the exact production origin.
3. Provision representative accounts with the required active role, complete role requirements, active account status, and any role-specific scope required by the route. The signed demo-session path uses seeded Prisma identities; the OAuth path uses real Supabase-authenticated accounts.
4. Set runtime variables in an ignored env file or deployment environment, including the normal Supabase/database variables and, only for the dedicated demo deployment, the `CLOIE_DEMO_*` variables. Do not place values in this document or an evidence record.
5. Build and start the production server:

```bash
pnpm build
pnpm start
```

6. Run the no-session boundary check in a separate terminal:

```bash
PRODUCTION_EVIDENCE_BASE_URL=http://127.0.0.1:3000 pnpm verify:production-auth-boundary
```

The check must pass before any authenticated trace is accepted. It verifies that representative protected routes redirect to `/portal/respondents` without a session and that `POST /api/auth/dev-login` remains unavailable outside development. A dedicated demo deployment also runs the demo-boundary check defined by ADR 0008.

## Browser Trace Procedure

Use a fresh browser context for each role. Clear site data or sign out before changing roles. Never export cookies or storage state.

1. Open the production origin in Chrome DevTools.
2. Set **Fast 3G** network throttling and **4x CPU throttling**.
3. Authenticate using the selected evidence mode. For signed demo sessions, use the server-rendered role switcher and record only `signed demo session`; for OAuth, use the normal role-aware Google OAuth flow and record only `Supabase OAuth via existing Google callback`. Never record account emails, credentials, authorization codes, cookies, or session values.
4. Navigate to the representative route for the role:

| Role | Account state | Representative route |
| --- | --- | --- |
| Secretary | active, complete | `/secretary/course-assignments` |
| College Dean | active, complete | `/dean/dashboard` |
| Faculty Member | active, complete, active program affiliation | `/faculty/dashboard` |

5. Capture a performance trace with reload. Use Chrome DevTools **Performance** rather than Lighthouse as the performance proof.
6. Inspect the trace's LCP insight and record the selected LCP element and all four breakdown values: TTFB, resource load delay, resource load duration, and element render delay.
7. Inspect the Network panel and record only relevant request metadata for `document`, `fetch`, and `script` requests: method, same-origin path or redacted origin category, status, transfer size, and duration. Do not include request headers, cookies, authorization values, query values containing identifiers, or response bodies with private data.
8. For Course Assignments, confirm the first authorized records are present in the initial document/RSC response and that no mount-time read is required. For Faculty Dashboard, identify chart/word-cloud script chunks and whether they are deferred. For Dean Dashboard, record the initial document and relevant data requests without copying response payloads.
9. Sign out, start a fresh context, and repeat the protected-route no-session check. The response must redirect to `/portal/respondents` and must not contain protected headings, records, or role navigation.

## Evidence Record

Copy `docs/testing/templates/production-browser-evidence.md` for each run. Store trace files only in an approved private evidence location. Do not commit traces, screenshots with account data, browser profiles, or generated records containing identifiers.

Lighthouse may be run for accessibility and best-practice snapshots, but it does not replace the performance trace, LCP breakdown, or network evidence above.
