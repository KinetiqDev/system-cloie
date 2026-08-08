# Primary Production Appearance Activation Runbook

This is the operator-facing procedure for activating the server-owned primary Production appearance release control after the repository readiness gate in `openspec/changes/migrate-unified-design-system/tasks.md` task 26 is accepted. It complements [ADR 0010](../adr/0010-unified-appearance-and-protected-showcase.md). A Git commit documents this procedure but never performs its deployment action.

## Scope And Safety

- Perform this action only on the intended primary Production deployment after task 26 evidence is accepted.
- Do not modify application source, `.env.example`, or deployment configuration stored in the repository during this procedure.
- Keep `CLOIE_APPEARANCE_ENABLED` server-only. Never expose it through `NEXT_PUBLIC_*`, browser bundles, logs, screenshots, traces, or evidence records.
- The protected Design System Showcase remains unavailable in primary Production before and after appearance activation.
- Do not change dedicated demo authentication, `CLOIE_DEMO_*` settings, `cloie_dev_auth`, or `POST /api/auth/dev-login`.

## Fail-Closed Contract

Primary Production appearance is enabled only when the server-only `CLOIE_APPEARANCE_ENABLED` release setting is exactly `"true"`; unset, empty, `"false"`, malformed, and all other values remain disabled.

When disabled, the bootstrap forces Light before paint, ignores stored preferences, writes no preference, omits the avatar-menu appearance control, and serves not-found UI for Settings Appearance. Safe Light tokens remain available during activation and rollback.

## Target Identity Checks

1. Confirm the hosting-project name, deployment URL, and deployment environment identify the intended primary Production target. Do not activate a preview, local, or dedicated demo deployment.
2. Confirm the deployment uses the primary Production Supabase project reference. If `CLOIE_PRIMARY_SUPABASE_PROJECT_REF` is available to the operator, compare it through the hosting secret manager without recording its value.
3. Confirm any configured `CLOIE_DEMO_SUPABASE_PROJECT_REF` differs from the primary Production reference. Do not treat an isolated-demo project reference as an activation target.
4. Confirm no `CLOIE_DEMO_*` configuration is present on the primary Production deployment. The primary Production authentication boundary remains OAuth-only.
5. Run the boundary check against the verified primary Production origin. Do not continue if it fails.

```bash
PRODUCTION_EVIDENCE_BASE_URL="<verified-primary-production-origin>" \
  pnpm verify:production-auth-boundary
```

## Pre-Activation Verification

1. Confirm task 26 completion evidence includes the approved Light/Dark/System viewport matrix, accessibility checks, raw-color allowlist, type-scale audit, focused tests, `pnpm lint`, `pnpm test`, `pnpm build`, effective CSP check, and protected deployment-boundary checks.
2. In a fresh browser context with OS Dark selected, verify the primary Production target remains Light before paint, has no appearance selector, and returns not-found UI for Settings Appearance.
3. Record the required redacted evidence in a comment on [GitHub issue #225](https://github.com/KinetiqDev/system-cloie/issues/225): deployment identifier, pre-activation forced-Light result, activation timestamp, post-activation selector and OS-Dark result, boundary-check result, and rollback readiness. Link to approved private trace storage only when needed; do not commit traces or screenshots.

## Activation Procedure

1. In the intended primary Production hosting environment, set the server-only `CLOIE_APPEARANCE_ENABLED` release setting to exactly `"true"`.
2. Redeploy or restart the primary Production deployment using normal hosting controls so the server reads the new setting.
3. Do not add a source-code default, change `.env.example` to an enabled value, or set any `NEXT_PUBLIC_*` setting.

## Post-Activation Verification

1. Reconfirm the deployment URL and primary Production project identity after the redeploy.
2. In fresh Light, Dark, and System browser contexts, verify the avatar-menu selector and Settings Appearance route appear for an authenticated eligible account, and explicit Light/Dark/System behavior matches the accepted matrix.
3. In an OS-Dark System context, verify first paint and hydrated state resolve Dark without a Light flash. Verify a stored explicit Light preference takes precedence over OS Dark.
4. Verify representative public, operational, and respondent routes retain their existing URLs and behavior. The protected Design System Showcase must still return not-found UI in primary Production.
5. Re-run the same `PRODUCTION_EVIDENCE_BASE_URL` boundary command against primary Production. Update the issue #225 evidence comment with only the required redacted evidence fields.

## Rollback

1. Remove or unset `CLOIE_APPEARANCE_ENABLED` from the primary Production deployment environment. Do not replace it with a source or example-environment default.
2. Redeploy or restart the target using normal hosting controls.
3. In a fresh OS-Dark browser context, verify forced Light before paint, absence of the appearance selector, and not-found UI for Settings Appearance.
4. Re-run the same `PRODUCTION_EVIDENCE_BASE_URL` boundary command and update the issue #225 evidence comment with the redacted rollback result.
5. If target identity is uncertain, stop the procedure and correct the hosting target. Do not use demo reset, database commands, or dedicated-demo configuration to repair primary Production.

## Evidence Limits

Use [GitHub issue #225](https://github.com/KinetiqDev/system-cloie/issues/225) as the redacted activation evidence record. Include deployment identifier, pre-activation result, activation timestamp, post-activation result, boundary-check result, and rollback readiness. Never record project-reference values, environment values, credentials, cookies, tokens, account identifiers, headers, private response bodies, or screenshots containing private data. Store trace files only in approved private storage and link to them without publishing sensitive content.
