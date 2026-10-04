# PR gates

This file is the map. `scripts/ci/select-checks.mjs`, `scripts/ci/lib/risk-domains.mjs`, `.github/workflows/ci.yml`, and `.github/workflows/code-intelligence.yml` are the source — read them when either changes.

## Selection

`Risk Selection` classifies changed files into risk domains and decides which production gates run: Production Build, Database Integration, Auth Integration, and Browser E2E. Static Checks and both Unit Tests projects run on every PR, selected or not.

A gate that did not select shows as skipped: that is the selector working, not a failure.

Rules that matter when reading a red PR:

- Anything under `src/`, `e2e/`, or `playwright.config.ts` selects **Browser E2E** and the curated visual baselines.
- The schema, auth, role, response, and publication domains also select **Database Integration**.
- Auth, credential, template, and package changes select **Auth Integration**.
- `.github/workflows/` and `scripts/ci/` changes fail closed: every production gate runs.
- See what a diff selects: `node scripts/ci/select-checks.mjs`.

A diff that changed something the selector does not cover is a finding to report, not a gap to widen in the same PR — the classifier carries a documented contract, and changing it belongs to the ticket that owns it.

## The checks

| Check                                   | What runs                                                                                                 | Reproduce locally                                                                                            | Evidence the body records                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Risk Selection`                        | domain classifier                                                                                         | `node scripts/ci/select-checks.mjs`                                                                          | domains hit, gates selected or skipped                              |
| `Static Checks`                         | `pnpm format:check:changed`, `pnpm lint:changed`                                                          | same                                                                                                         | pass, with no blanket disables                                      |
| `Unit Tests (node)`, `Unit Tests (dom)` | `pnpm test --project=node` / `--project=dom`, plus tooling-subprocess contracts                           | `pnpm test`, `pnpm test:tooling-integration`                                                                 | passed and skipped counts per project                               |
| `Production Build`                      | `pnpm build`, a primary-production server smoke, then `pnpm verify:production-auth-boundary`              | `pnpm build`, `pnpm verify:production-auth-boundary`                                                         | build ok, auth boundary ok                                          |
| `Database Integration`                  | disposable target verified, migrations applied, seed, `pnpm test:db`                                      | `pnpm verify:database-target`, `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db` against a disposable database | suite counts, migration preflight numbers                           |
| `Auth Integration (real GoTrue)`        | real Auth service plus mail catcher                                                                       | `pnpm test:auth-integration`                                                                                 | scenarios run                                                       |
| `Browser E2E`                           | Playwright against a production build and disposable Postgres: desktop and Pixel 7 projects, `retries: 0` | `pnpm test:e2e`                                                                                              | journeys passed, retries disabled, baselines reviewed               |
| `Fallow Audit Gate`                     | new findings in changed files, pull requests only                                                         | `pnpm exec tsx scripts/run-fallow-audit.ts <base-sha>`                                                       | no new findings, no suppressions, no baseline refresh               |
| `Fallow Code Intelligence Reports`      | scheduled push run                                                                                        | —                                                                                                            | intentionally skipped on pull requests                              |
| `Analyze (javascript-typescript)`       | CodeQL                                                                                                    | —                                                                                                            | no new alert introduced                                             |
| `Greptile Review`                       | Greptile scan                                                                                             | —                                                                                                            | the check means the scan finished; the verdict lives in the PR body |

## Reading a failure

```bash
gh pr checks <PR> --json name,state,bucket,link,workflow
JOB_ID=<last path segment of the check's link>
gh run view --job "$JOB_ID" --log-failed > /tmp/job.log
grep -nEi '##\[error\]|FAIL |✕|Error:|exit code' /tmp/job.log | head -20
```

The log is long and ends in teardown noise; the failure sits where the markers are. Read around them.

Infrastructure gets one rerun, with evidence in the log — a runner timeout, a registry 5xx, a network error:

```bash
gh run rerun <run-id> --failed
```

A second identical failure is a real failure. Diagnose it like any other.
