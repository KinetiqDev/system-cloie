---
title: Testing and Validation Evidence
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Testing and Validation Evidence

Skeleton aligned to [Appendix G — Simplified Testing and User Validation Forms](../guide/appendix-g-simplified-testing-user-validation.md). All result fields are **pending** until real runs and validation sessions are recorded; no counts, dates, versions, signatures, or approvals are fabricated. The automated layers below already exist and are linked to their real configuration; the human-validation layers have not been run yet.

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

### Unit and integration suites — Vitest

- Runner: `pnpm test` ([package.json](../../../package.json)); unit/integration suites under [src/**tests**/](../../../src/__tests__/).
- Database-invariant suites are **gated**: they run only via `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db` against a disposable test database, so `pnpm test` never writes to a shared backend. Gate rationale and the full sixteen-suite list: [README.md](../../../README.md) ("Running Tests"). Target verification: `pnpm verify:database-target`; suite-discovery completeness: `pnpm verify:database-suites` ([scripts/verify-database-suite-completeness.ts](../../../scripts/verify-database-suite-completeness.ts)).
- CI enforcement: the `database-integration` job applies migrations, seeds the fixture, and runs the gated suites against an ephemeral Postgres service container — never a hosted backend ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)).
- Test evidence to record: suite counts, latest run reference, failing/flaky findings. **All pending.**

### Browser E2E — Playwright (CI gate, including mobile Pixel 7)

- Config: [playwright.config.ts](../../../playwright.config.ts). Two required projects: `desktop` (Desktop Chrome) and `mobile` (**Pixel 7**, matching `e2e/mobile*.spec.ts`); scheduled deep runs add `firefox`/`webkit`. Retries are disabled — a red-then-green run counts as flaky evidence, not a clean pass.
- Journeys: [e2e/](../../../e2e/) — role journeys, `cross-role-privacy.spec.ts`, `a11y.spec.ts` (axe sweeps), `mobile.spec.ts`, curated `@visual` baselines ([e2e/visual-baseline.spec.ts](../../../e2e/visual-baseline.spec.ts), [e2e/mobile-visual-baseline.spec.ts](../../../e2e/mobile-visual-baseline.spec.ts)).
- CI: the `browser-e2e` gate runs in production mode (`next build` + `next start`) against the disposable seeded database with the isolated signed CI test session — no OAuth UI automation ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)).
- Test evidence to record: latest CI run references per project, visual-baseline status, a11y findings. **All pending.**

### Production browser evidence (authenticated performance / boundary checks)

Process: [docs/testing/production-browser-evidence.md](../../testing/production-browser-evidence.md) — production build only (`pnpm build` + `pnpm start`), disposable environment, no-session boundary check before any authenticated trace, per-role trace capture with recorded LCP breakdown, per-run record from the template [docs/testing/templates/production-browser-evidence.md](../../testing/templates/production-browser-evidence.md).
Evidence records: **pending** — none recorded yet.

## G-1. System Test Record

Per [Appendix G-1](../guide/appendix-g-simplified-testing-user-validation.md). One row per feature/workflow/critical requirement; populated from actual executed runs only.

| No. | Feature / Requirement Tested | What Was Tested / Test Scenario | Expected Result | Result        | Issue / Finding | Evidence / Reference |
| :-: | ---------------------------- | ------------------------------- | --------------- | ------------- | --------------- | -------------------- |
|  1  | pending                      | pending                         | pending         | ☐ Pass ☐ Fail | pending         | pending              |

**Testing Summary:** Total Tested: pending Passed: pending Failed: pending Pass Rate: pending%

**Major unresolved system issue(s), if any:** pending

## G-2. User / Stakeholder Validation Record

Per [Appendix G-2](../guide/appendix-g-simplified-testing-user-validation.md). No alpha/beta/pilot/UAT/usability session has been conducted or scheduled yet; this section is a placeholder and MUST NOT be filled with projected participants or results.

| Field                               | Value                                                                                         |
| :---------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Validation Type**                 | ☐ Alpha ☐ Beta ☐ Pilot/Field ☐ Usability ☐ UAT ☐ Other: pending                               |
| **Date / Location or Mode**         | pending                                                                                       |
| **User / Stakeholder Group**        | pending                                                                                       |
| **Number of Participants**          | pending                                                                                       |
| **Main Tasks / Features Evaluated** | pending                                                                                       |
| **Method Used**                     | ☐ Task Performance ☐ Observation ☐ Questionnaire ☐ Interview ☐ UAT Checklist ☐ Other: pending |

Task-level result rows: pending — added only after sessions occur.

## G-3. Issue, Revision and Retest Log

Per [Appendix G-3](../guide/appendix-g-simplified-testing-user-validation.md). Records significant defects/feedback requiring action, with retest results. Empty until real findings exist; IDs are issued sequentially (ISS-01, ISS-02, …) and never reused.

| Issue ID | Defect / Feedback / Finding | Priority              | Revision / Action Taken | Where Changed | Retest Result | Status          |
| :------: | --------------------------- | --------------------- | ----------------------- | ------------- | ------------- | --------------- |
| ISS-\_\_ | pending                     | ☐ High ☐ Medium ☐ Low | pending                 | pending       | ☐ Pass ☐ Fail | ☐ Closed ☐ Open |

## G-4. User / Client Validation Summary and Acceptance

Per [Appendix G-4](../guide/appendix-g-simplified-testing-user-validation.md). Entirely **pending** — blocked on G-2 sessions and G-3 revisions/retests.

| System / Build Validated                                     | pending                                                                 |
| :----------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Users / Stakeholders Represented**                         | pending                                                                 |
| **Number of Participants**                                   | pending                                                                 |
| **Main Strengths Observed**                                  | pending                                                                 |
| **Most Important Issues / Feedback**                         | pending                                                                 |
| **Major Revisions Made After Validation**                    | pending                                                                 |
| **Remaining Known Limitations**                              | pending                                                                 |
| **Overall User / Stakeholder Result**                        | ☐ Accepted ☐ Accepted with Minor Conditions ☐ Requires Further Revision |
| **Ready for Final Defense from User-Validation Perspective** | ☐ Yes ☐ Yes, with Minor Conditions ☐ Not Yet                            |

Signatures (user/stakeholder confirmation, proponent and adviser review per Appendix G): **pending** — no names, signatures, or dates may be entered until the corresponding activities have occurred.
