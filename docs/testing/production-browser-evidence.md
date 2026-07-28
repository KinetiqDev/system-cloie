# Production Browser Evidence

This is the repeatable evidence path for issue #193 and the authenticated performance slices that depend on it.

## Security Contract

- Run `pnpm build` and `pnpm start`; do not use `pnpm dev` for accepted evidence.
- Authenticate only with disposable real Supabase-authenticated test accounts in an isolated Supabase project or approved disposable environment.
- Use the existing Google OAuth entry point and callback. Do not add a test login route, header, query parameter, JWT, cookie, or production-only branch.
- Do not use `cloie_dev_auth`, `POST /api/auth/dev-login`, `NEXT_PUBLIC_DEMO_MODE`, seeded demo identities, credentials, access tokens, refresh tokens, or copied browser cookies as production evidence.
- Keep account provisioning, OAuth credentials, and database connection secrets outside the repository and outside trace exports.
- Destroy or disable the disposable accounts and environment after the evidence window.

The application has no test-only authentication mechanism for production builds. The production path uses the normal Supabase session cookie issued by the existing OAuth flow, so a deployed environment cannot enable a separate test bypass.

## Disposable Environment Setup

1. Create or select an isolated Supabase project and disposable database dataset. Never point DB integration tests at a shared hosted database.
2. Configure the isolated project OAuth redirect URL for the exact local production origin, for example `http://127.0.0.1:3000/api/auth/callback`.
3. Provision one disposable Google-authenticated account for each required role: Secretary, College Dean, and Faculty Member. Account records must have the required active role, complete role requirements, active account status, and any role-specific scope required by the route.
4. Set the normal runtime variables in a local ignored env file, including `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `DIRECT_URL`, and `CONFIRMATION_SECRET`. Do not place values in this document or an evidence record.
5. Build and start the production server:

```bash
pnpm build
pnpm start
```

6. Run the no-session boundary check in a separate terminal:

```bash
PRODUCTION_EVIDENCE_BASE_URL=http://127.0.0.1:3000 pnpm verify:production-auth-boundary
```

The check must pass before any authenticated trace is accepted. It verifies that the representative protected routes redirect to `/portal/respondents` without a session and that `POST /api/auth/dev-login` returns `404`.

## Browser Trace Procedure

Use a fresh browser context for each role. Clear site data or sign out before changing roles. Never export cookies or storage state.

1. Open the production origin in Chrome DevTools.
2. Set **Fast 3G** network throttling and **4x CPU throttling**.
3. Sign in through the normal role-aware Google OAuth flow using the disposable account. Record only `Supabase OAuth via existing Google callback`; never record the account email, credential, authorization code, or session value.
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
