## Why

System CLOIE already contains seeded role fixtures and a development-only role switcher, but production-mode browser and performance verification still requires real Google OAuth accounts. That makes it expensive to exercise Secretary, College Dean, Program Head, Faculty Member, Student, Alumni, and Industry Partner routes, especially when measuring server rendering and LCP rather than OAuth itself.

The project needs a controlled demo deployment that runs a production build, exposes the familiar role switcher, and remains isolated from the primary public Production deployment and institutional data.

## What Changes

- Add a dedicated demo-deployment authentication capability using a short-lived signed server-side demo session.
- Reuse the existing seeded demo-user catalog and role-switcher interaction, while renaming the production-facing concept from development auth to demo auth.
- Add explicit server-only deployment configuration that fails closed unless the deployment is marked as a dedicated demo environment.
- Keep `cloie_dev_auth` and `POST /api/auth/dev-login` development-only and separate from the dedicated demo session.
- Preserve all existing server-side role, account-state, program, Course Assignment ownership, and respondent-eligibility checks.
- Require an isolated demo database or Supabase project and provide a resettable demo-data operating procedure.
- Permit the dedicated demo session as an approved authentication mode for production-build browser evidence, while distinguishing it from OAuth performance evidence.
- **BREAKING**: The primary public Production deployment remains OAuth-only and MUST NOT expose or enable the dedicated demo login path.
- Do not add a Prisma schema change, SQL migration, generated Supabase type change, service worker, or client-side authentication dependency.

## Capabilities

### New Capabilities

- `dedicated-demo-auth`: controlled demo-deployment authentication, role switching, session integrity, deployment isolation, and browser-evidence use.

### Modified Capabilities

None.

## Impact

- Affected contexts: Identity and Access, deployment operations, seeded demo data, and production browser evidence.
- Affected application areas: authentication services, the authenticated application shell, the role switcher, authentication route handlers, logout, environment configuration, and verification scripts.
- Affected operational systems: Vercel Preview/Custom Environment or an equivalent dedicated production-mode deployment, plus an isolated Supabase/PostgreSQL dataset.
- Authorization and privacy: the demo session supplies identity only; existing account-state and domain authorization remain authoritative. Demo users and demo mutations MUST NOT share primary Production data.
- Deployment: the feature is server-only and opt-in. No demo secret, allowlist, or session-signing key may be exposed through `NEXT_PUBLIC_` variables or client bundles.
- Verification: focused auth tests, primary/demo deployment boundary checks, production `pnpm build`, and Chrome DevTools performance evidence under Fast 3G and 4x CPU throttling.
