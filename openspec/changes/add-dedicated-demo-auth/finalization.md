# Finalization Assessment

## Automated Completion

The implementation and automated verification cover these vertical slices:

- Deployment-scoped configuration, signed demo sessions, separate cookie handling, and fail-closed session resolution.
- Dedicated demo login, logout cleanup, role-switcher capability, visible demo indicator, and local-development auth separation.
- Runtime project identity binding across the configured demo project ref, `SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, and `DATABASE_URL`.
- Reset preflight and force-reset/seed command ordering, including rejection before Prisma runs when any configured target identity is invalid.
- Primary catalog-wide demo-login denial and dedicated-demo allowlist verification, including an authenticated request to each accepted fixture destination without a cookie jar.
- Dedicated-demo profile-gate coverage for inactive, deferred-enrollment, and rejected external accounts. Existing role and scope policy suites continue to authorize from the same request-scoped session snapshot.
- Browser-evidence documentation, template, ADR, and runbook rules identifying `signed demo session` as distinct from OAuth evidence.

## Current Verification Record

- Focused dedicated-demo auth, session-resolution, route, shell, switcher, boundary, reset, and isolation suites passed: 11 files and 75 tests.
- `pnpm test` passed: 169 files and 1,362 tests, with 4 database-gated files and 9 database tests skipped by design.
- `pnpm lint` completed with the repository's existing 77 warnings and no errors.
- `pnpm build` completed successfully.
- `openspec validate add-dedicated-demo-auth --strict` and `openspec validate improve-navigation-rendering-and-caching --strict` both passed.
- The README workflow now retains the required inline-coded Supabase environment variable names, so the repository documentation contract test passes.

## External Acceptance Gates

The change cannot be archived until these operations produce sanitized evidence in an approved private location:

1. Provision an isolated demo Supabase project with no primary institutional data and configure the declared project refs.
2. Run `pnpm demo:reset` against that target and verify seeded baseline fixtures after the command completes.
3. Run `pnpm verify:production-auth-boundary` against primary Production and retain its pass result.
4. Run `pnpm verify:dedicated-demo-auth-boundary` against the isolated dedicated demo deployment and retain its pass result.
5. Capture dedicated-demo production-build Fast 3G and 4x CPU traces for Secretary Course Assignments, Dean Dashboard, and Faculty Dashboard, including the required LCP breakdown and sanitized document/fetch/script metadata.
6. Record the final ADR/OpenSpec/GitHub acceptance review and explicitly retain the limitation that signed-demo traces do not measure OAuth exchange, callback, or session-refresh latency.

## Archive Decision

Do not sync or archive `add-dedicated-demo-auth` yet. The remaining work is operational verification and dedicated-demo end-to-end authorization evidence, not a code-only checklist. The linked work remains tracked by GitHub issues #196, #200, and #201.
