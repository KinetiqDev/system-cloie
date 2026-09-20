---
title: Testing and Validation Evidence
kind: living-project-document
status: living
last_verified: 2026-09-17
---

# Testing and Validation Evidence

This is the Appendix G working record. The executed technical-alpha results are consolidated in [Alpha Testing Evidence Report — 2026-09-17](alpha-testing-report-2026-09-17.md). The technical alpha was completed with automated evidence, but the human-validation fields remain incomplete because no participant session, signature, acceptance decision, or final-defense readiness review was recorded.

## Header block (pending)

| Capstone Project Title:     | pending                                      |
| :-------------------------- | :------------------------------------------- |
| **Team / Proponents:**      | pending                                      |
| **Client / Partner:**       | pending                                      |
| **Capstone Adviser:**       | pending                                      |
| **System / Build Version:** | pending                                      |
| **Testing Period:**         | pending                                      |
| **Project Stage:**          | ☐ Pre-Final ☐ Pre-Defense Validation ☐ Final |
| **Document Version:**       | pending                                      |

## Automated test layers (existing infrastructure)

### Unit and integration suites, Vitest

- Runner: `pnpm test` ([package.json](../../../package.json)); unit and integration suites under [src/**tests**/](../../../src/__tests__/).
- Database-invariant suites are **gated**. They run only via `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db` against a disposable test database, so `pnpm test` never writes to a shared backend. The runner prepares the disposable `test_authenticated` role before the suites execute. Target verification: `pnpm verify:database-target`; suite-discovery completeness: `pnpm verify:database-suites` ([scripts/verify-database-suite-completeness.ts](../../../scripts/verify-database-suite-completeness.ts)).
- Corrected local alpha evidence: full Vitest passed 430 files and 3,914 tests, the production build passed, tooling integration passed 5 files and 60 tests, and all 15 database suites passed 209 tests. See the [alpha-testing report](alpha-testing-report-2026-09-17.md) for exact commands, snapshot provenance, and residual failures.
- CI enforcement: the `database-integration` job applies migrations, seeds the fixture, and runs the gated suites against an ephemeral Postgres service container, never a hosted backend ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)).

### Browser E2E, Playwright

- Config: [playwright.config.ts](../../../playwright.config.ts). The required projects are `desktop` using Desktop Chrome and `mobile` using Pixel 7, matching `e2e/mobile*.spec.ts`. Scheduled deep runs add `firefox` and `webkit`. Retries are disabled. A red-then-green run counts as flaky evidence, not a clean pass.
- Journeys: [e2e/](../../../e2e/) includes role journeys, `cross-role-privacy.spec.ts`, `a11y.spec.ts`, `mobile.spec.ts`, and curated visual baselines ([e2e/visual-baseline.spec.ts](../../../e2e/visual-baseline.spec.ts), [e2e/mobile-visual-baseline.spec.ts](../../../e2e/mobile-visual-baseline.spec.ts)).
- CI: the `browser-e2e` gate runs in production mode (`next build` plus `next start`) against the disposable seeded database with the isolated signed CI test session, without OAuth UI automation ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)).
- Corrected local alpha evidence used the Next.js development server on port `3110`. It is exploratory evidence, not accepted production-browser evidence.
- Current local result: 44 of 48 desktop and Pixel 7 mobile tests passed. Four route or visual-baseline failures remain open. See the [alpha-testing report](alpha-testing-report-2026-09-17.md).

### Production browser evidence

Process: [docs/testing/production-browser-evidence.md](../../testing/production-browser-evidence.md), using a production build (`pnpm build` plus `pnpm start`), disposable environment, no-session boundary check before any authenticated trace, per-role trace capture with recorded LCP breakdown, and the run template at [docs/testing/templates/production-browser-evidence.md](../../testing/templates/production-browser-evidence.md).

No accepted production browser trace was produced. See the [alpha-testing report](alpha-testing-report-2026-09-17.md).

## G-1. System test record

Per [Appendix G-1](../guide/appendix-g-simplified-testing-user-validation.md). The executed rows are summarized below. The full command ledger and issue references are in the [alpha-testing report](alpha-testing-report-2026-09-17.md).

| No. | Feature / Requirement Tested          | What Was Tested / Test Scenario                    | Expected Result                                                        | Result | Issue / Finding                                                   | Evidence / Reference |
| :-: | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- | -------------------- |
|  1  | Unit and service behavior             | Full Vitest suite across Node and DOM projects.    | All discovered suites complete without failures.                       | Pass   | Initial analytics parse defect was corrected in the working tree. | ALPHA-01; ALPHA-11   |
|  2  | DOM component behavior                | DOM/jsdom Vitest project.                          | DOM suites complete without failures.                                  | Pass   | None in corrected run.                                            | ALPHA-13             |
|  3  | Tooling contracts                     | Tooling integration against real subprocesses.     | Tooling suites complete without failures.                              | Pass   | None.                                                             | ALPHA-14             |
|  4  | Production compilation                | `pnpm build`.                                      | Current source compiles into a production build.                       | Pass   | Evidence is from an uncommitted working tree.                     | ALPHA-15             |
|  5  | Database invariants and RLS           | All 15 gated suites against disposable PostgreSQL. | Roles are prepared and all invariant tests complete.                   | Pass   | Local runner now prepares `test_authenticated`.                   | ALPHA-16             |
|  6  | Browser role workflows and privacy    | Desktop and Pixel 7 mobile Playwright journeys.    | Journeys and privacy boundaries complete.                              | Mixed  | 44 of 48 tests passed; two route scenarios remain open.           | ALPHA-18             |
|  7  | Accessibility and responsive behavior | Axe, keyboard, focus, mobile, and visual journeys. | No serious or critical violations and supported layouts remain usable. | Mixed  | One route scenario and two visual baselines failed.               | ALPHA-18             |

**Testing Summary:** 7 evidence rows; 5 passed, 2 mixed. This row summary is not a test-case pass rate. Exact suite counts are in ALPHA-11 through ALPHA-18.

**Major unresolved system issues:** two route-state browser failures, two visual-baseline failures, no current committed CI result for the corrected changes, no accepted production browser trace, and no human validation record.

## G-2. User or stakeholder validation record

Per [Appendix G-2](../guide/appendix-g-simplified-testing-user-validation.md). The technical alpha used automated seeded identities only. No human participant alpha, beta, pilot, usability, or UAT session was recorded in this activity.

| Field                               | Value                                                                                                                                                                                              |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validation Type**                 | Technical/internal alpha verification; not a human participant session                                                                                                                             |
| **Date / Location or Mode**         | September 17, 2026; disposable local Supabase stack and local Next.js development server                                                                                                           |
| **User / Stakeholder Group**        | No external participants; deterministic seeded identities used by automated browser journeys                                                                                                       |
| **Number of Participants**          | 0 human participants                                                                                                                                                                               |
| **Main Tasks / Features Evaluated** | Role-scoped navigation, evaluation workflows, response lifecycle, privacy boundaries, accessibility, responsive mobile workflows, database invariants, production compilation, and CI safety gates |
| **Method Used**                     | Vitest, tooling integration, gated database suites, Playwright desktop and mobile journeys, and CI evidence review                                                                                 |

Human task-level result rows, signatures, and acceptance decisions remain pending.

## G-3. Issue, revision, and retest log

Per [Appendix G-3](../guide/appendix-g-simplified-testing-user-validation.md). The executed issue and retest log is maintained in the [alpha-testing report](alpha-testing-report-2026-09-17.md). It contains 13 open or conditionally resolved items, including the four residual browser failures and prior human-validation findings. No item is marked closed without a linked retest.

## G-4. User, client, or stakeholder validation summary and acceptance

Per [Appendix G-4](../guide/appendix-g-simplified-testing-user-validation.md). Technical alpha evidence exists, but formal human validation and acceptance remain pending.

| System / Build Validated                                     | Uncommitted working tree based on `eeccf8d`; see the alpha report for exact provenance                                                             |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Users / Stakeholders Represented**                         | Automated seeded identities; no human alpha participants                                                                                           |
| **Number of Participants**                                   | 0 human participants in this technical alpha execution                                                                                             |
| **Main Strengths Observed**                                  | Vitest, production build, tooling integration, and gated database checks passed on the corrected working tree                                      |
| **Most Important Issues / Feedback**                         | Four browser failures, incomplete cross-browser evidence, unresolved prior beta findings, and no signed acceptance                                 |
| **Major Revisions Made After Validation**                    | Analytics parse correction, local RLS test-role bootstrap, browser-server reuse change, and analytics regression coverage                          |
| **Remaining Known Limitations**                              | Four of 48 local browser tests fail; no current committed CI result or accepted production browser trace; no human validation or signed acceptance |
| **Overall User / Stakeholder Result**                        | Requires Further Revision                                                                                                                          |
| **Ready for Final Defense from User-Validation Perspective** | Not Yet                                                                                                                                            |

Signatures (user or stakeholder confirmation, proponent, and adviser review per Appendix G): **pending**. No human validation activity or signed acceptance was recorded.
