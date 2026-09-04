---
title: System CLOIE Deployment
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Deployment

How System CLOIE reaches its runtime targets. Step-by-step procedures are **not** duplicated here — the linked runbooks own them.

## Target model (ADR 0020)

All backends are **self-hosted Supabase** ([ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md)): the local Supabase CLI Docker stack for development and independently operated Supabase Docker instances for every non-local target (staging, dedicated demo, disposable CI, primary production). Supabase Cloud is not part of any workflow — no Platform login, linking, project references, or access tokens. The application keeps one runtime path and one environment contract; selecting a different backend is an operator-controlled restart boundary, never a live switch.

## Production target: Coolify on the home-lab host

Primary production runs as two Coolify resources on the `home-lab` Ubuntu host behind Cloudflare Tunnel:

- **System CLOIE App** — Next.js standalone build (`Dockerfile`, Node 22, pnpm 10.30.3), internal port 3000, domain `https://system-cloie.app`, `CLOIE_DEPLOYMENT_KIND=production`, health endpoint `/api/health`.
- **System CLOIE Supabase** — self-hosted Supabase stack (PostgreSQL 17, Supavisor pooler, Auth with Google provider), public API domain `https://api.system-cloie.app`.

The full procedure — host layout, secrets, first deployment, redeployments, schema-change deployments, rollback, Supabase updates — is the runbook [`docs/deployment-coolify.md`](../deployment-coolify.md). Current observed resource UUIDs, versions, verification results, and outstanding operational-readiness items are recorded in [`docs/operations/deployment-inventory.md`](../operations/deployment-inventory.md) (note its `last_verified` date; the runbook defers to the executable repository when they disagree).

## Demo deployment separation (ADR 0008)

The dedicated demo deployment is an **isolated production-mode System CLOIE deployment** with its own database, resettable demo data, and explicitly enabled signed demo sessions for demonstrations and route-performance evidence. Primary Production stays OAuth-only, must never enable demo authentication, and its database must never be the demo reset target. Isolation is enforced in code (see [auth-and-authorization.md](auth-and-authorization.md)) and verified by the scheduled CI `demo-reset-gate` job. Provisioning, reset, rollback, and incident-disable procedures live in the [dedicated demo deployment runbook](../runbooks/dedicated-demo-deployment.md).

## Production browser evidence

Accepted production-behavior evidence (production-mode server, real routes) follows the process in [`docs/testing/production-browser-evidence.md`](../testing/production-browser-evidence.md). UI work is verified on desktop and mobile first per [AGENTS.md → Verification](../../AGENTS.md); production evidence is for acceptance, not everyday iteration.

## CI environments

CI never touches a hosted database. Every job that needs one starts its own disposable `postgres:16-alpine` service container:

- **Database integration** and **browser E2E** jobs set `DATABASE_URL`/`DIRECT_URL` to the disposable instance, replay the canonical migration history (`scripts/ci/apply-migrations.sh`), and seed the deterministic fixture (`pnpm db:seed`).
- **Browser E2E** runs the app in production mode (`next build` + `next start`) with `CLOIE_CI_TEST_ENABLED=true` and `CLOIE_DEPLOYMENT_KIND=ci-test`, enabling the isolated signed CI test session (allowlisted seeded accounts, filesystem-marker-verified CI identity — see [auth-and-authorization.md](auth-and-authorization.md)). The marker file is created by the workflow immediately before the production server starts.
- The scheduled workflow adds cross-browser and **production-boundary** verification: a production-mode server must refuse the dev-login endpoint (`verify:production-auth-boundary`), proving the demo/dev/CI regimes stay off in production.

Gate inventory and job details: [overview.md → CI gate inventory](overview.md#ci-gate-inventory). Workflow sources: `.github/workflows/ci.yml`, `.github/workflows/scheduled.yml`, `.github/workflows/code-intelligence.yml`.

## Retired Depot workflows

CI previously ran on Depot; those workflows were ported to GitHub Actions and retired. The old definitions remain locally under `.depot/workflows/` (gitignored) for reference and **must not be re-added** ([AGENTS.md → Continuous Integration](../../AGENTS.md)).

## Related runbooks

| Document                                                                                               | Owns                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/deployment-coolify.md`](../deployment-coolify.md)                                               | Full production deployment runbook (host, Coolify, Supabase, secrets, migrations, backups, rollback).                                                |
| [`docs/operations/deployment-inventory.md`](../operations/deployment-inventory.md)                     | Observed deployment state, verification evidence, open operational items.                                                                            |
| [`docs/runbooks/dedicated-demo-deployment.md`](../runbooks/dedicated-demo-deployment.md)               | Demo deployment environment contract, provisioning/reset, rollback and incident disable.                                                             |
| [`docs/runbooks/appearance-production-activation.md`](../runbooks/appearance-production-activation.md) | Fail-closed activation of Light/Dark/System appearance in primary production ([ADR 0010](../adr/0010-unified-appearance-and-protected-showcase.md)). |
| [`docs/testing/production-browser-evidence.md`](../testing/production-browser-evidence.md)             | Accepted production browser evidence process.                                                                                                        |
