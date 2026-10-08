# System CLOIE Dean analytics verification

## Workspace

`/dean/analytics` offers college participation and active course-assignment evaluation coverage, program-specific PO evidence, course/instrument breakdowns, stakeholder source evidence, period history, repeated-term feedback and a separate General Education ILO view. Evaluation provenance narrows the PO drill-down without granting identified response access. The Dean navigation includes Analytics under College Oversight.

The technical scope decision is ADR 0038. Deterministic calculations reuse the existing analytics engines. No schema, migration, dependency, production configuration or persisted cache is added.

## Metric contracts

- Participation is submitted responses divided by historical EvaluationAssignment opportunities, multiplied by 100 for display. Zero opportunities reports unavailable. It is not a count of distinct eligible people.
- College activity includes General Education and Central deployments without an attributed program. Program comparison excludes both, so program cards are not additive to the college total.
- Evaluation coverage counts active program-specific course assignments with no non-draft evaluation. This is a live assignment inventory, separate from readiness snapshots. Deactivated assignments do not create operational gap flags.
- PO evidence retains owning-program context, frozen direct PO bindings and current typed CILO-to-PO mapping disclosures. Many-to-many outcome rows are not additive.
- General Education ILO evidence follows typed CILO-to-ILO mappings and does not imply attainment or PO propagation. Its service response rate is a ratio; the Dean display converts it to percentage.
- Dean program history excludes invalid frozen-scale ratings and withholds a period mean spanning multiple instrument versions, scales or sources. Existing comparability fingerprints control chronological comparisons.
- Qualitative terms require repeated mentions and more than one distinct contributing response. No raw comments or respondent records reach the workspace or AI.
- Selected ACTIVE period alignment uses live readiness. COMPLETED period alignment uses the immutable readiness snapshot. Missing snapshots degrade only alignment context, not rating evidence.

## Executed verification

- Full Vitest regression passed with 481 files and 4,600 tests before the final additional three readiness-composition tests. Seven tests and one file retained repository opt-in skips. An earlier full run failed one mobile-drawer Escape timing assertion; the unchanged focused drawer suite and the subsequent full run passed. No assertion or timeout was weakened.
- Latest focused analytics, Dean, route, navigation and design inventory run passed 37 files and 588 tests.
- TypeScript `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with two existing warnings in `src/app/error.tsx` and `src/components/ui/alert.tsx`.
- `pnpm build` passed repeatedly, including the production-runtime Playwright gate.
- Changed-file Fallow audit reports no dead-code or complexity findings. One warning-only clone joins the pre-existing central PO binding grouping in analytics and dashboard services. It is retained because the two reads intentionally differ in historical snapshot semantics. No suppression or baseline refresh was used.
- Prettier checked changed files; the new files were formatted explicitly.
- Playwright `e2e/dean-analytics.spec.ts` passed against a production build with the repository's signed CI-test session and an isolated `cloie_test` database. The canonical migrations and seed were replayed into a new container on port 55441. The shared development database was not changed.
- Browser coverage includes six programs with different evidence volumes and gaps, all analytics views, actual period apply/reset, selected-program preservation, mandatory course/evaluation drill-down, General Education, stale period, unselected program, optional disabled AI and direct Program Head route denial.
- Axe found no serious or critical WCAG A/AA issues in the reviewed desktop, 390px mobile and 820px dark-tablet states. Horizontal-overflow checks passed. Screenshots were inspected as rendered application output, not inferred from JSX.

## Corrections found through verification

Independent standards and spec reviews led to current-scope AI thresholds, qualitative singleton withholding, explicit Dean aggregate authorization documentation, filtered empty states, college/program denominator disclosure and active-only evaluation coverage. Browser testing led to a native-form scope key that clears stale controls, accessible link color in dark mode, and corrected General Education percentage units. Static-analysis review led to cohesive per-view rendering and AI packet builders without introducing another analytics framework.

## Limitations and release notes

- Historical CILO mappings are current mappings; publication-time snapshots are not available. Direct PO snapshots and completed readiness snapshots retain their separate historical guarantees.
- ILO attainment, ILO-to-PO propagation, normalized program ranking and accreditation verdicts are intentionally absent.
- No export/report-generation workflow is added. Existing reports remain outside this change; the workspace is supporting review evidence, not an accreditation decision engine.
- The college all-period read returns deployment-level aggregates without pagination. It avoids respondent-row loading and per-program queries, but production-scale load testing was not performed. ACTIVE alignment adds the existing college-wide live-readiness computation. Select a period for bounded routine review; measure query plans before adding caching or indexes.
- Segment loading can replace the workspace during a slow navigation. URL context survives, and filter navigation uses App Router with an updating-evidence status. Per-view streaming is a future UX refinement.
- AI provider success/failure behavior was tested through controlled transport contracts. No live external AI provider call was required. Production AI enablement remains a separate governance decision.
- The shared local seed failed the existing General Education ILO fixture contract. Verification used a fresh disposable fixture instead of modifying shared data.
- The existing Playwright production startup uses `next start` despite standalone output and logs that warning. Some cross-role navigations log `destination stream closed early` while route-denial assertions still pass. These are retained observations, not hidden test failures.
- No deployment, remote push or database migration was performed against a deployed environment.
