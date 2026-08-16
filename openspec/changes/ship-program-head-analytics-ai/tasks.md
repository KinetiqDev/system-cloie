## 1. Selected-Program Overview and URL Scope

**Scope:** Replace the current analytics stub with a server-first Overview workspace. Establish the closed DTO, canonical `tab`/filter parser, selected-Program authorization, assignment-based denominator, KPI semantics, scope summary, and responsive shell. No Prisma or SQL migration is required.

**Affected paths:** `src/app/(app)/program-head/programs/[programId]/analytics/page.tsx`, `src/app/(app)/program-head/programs/[programId]/analytics/loading.tsx`, `src/features/analytics/services/get-program-head-analytics.ts`, `src/features/analytics/program-head-analytics-types.ts`, `src/features/analytics/services/program-head-analytics-state.ts`, `src/lib/constants/program-head-routes.ts`, `src/features/analytics/components/program-head-analytics-shell.tsx`, `src/features/analytics/components/program-head-analytics-filters.tsx`, focused analytics route/service tests.

**Acceptance criteria:** The canonical route authorizes the selected Program independently of the layout; invalid `tab`/filters canonicalize safely; refresh and back/forward preserve scope; Overview shows submitted count, assignment denominator, response-rate unavailable state for zero denominator, rating count, full-precision-derived mean, readable scope summary, and explicit empty reasons; no out-of-Program query is issued; no raw response data crosses the RSC boundary.

**Verification:** `pnpm vitest run src/__tests__/app/selected-program-insights-route.test.tsx src/__tests__/modules/analytics-reporting-and-review/dashboard-access.test.ts src/__tests__/features/analytics/program-head-analytics-state.test.ts`

**Commit:** `feat(program-head-analytics): add selected-program overview scope`

- [ ] 1.1 Define the canonical tab/filter schemas, parser, canonical URL builder, filter-option cascade, and readable scope-summary contract.
- [ ] 1.2 Define closed Program Head analytics DTOs and pure submitted-count, denominator, response-rate, mean, and rating-count helpers.
- [ ] 1.3 Implement the authorized view-gated read service with selected-Program response predicates, narrow projections, and Overview aggregation.
- [ ] 1.4 Replace the analytics page stub with URL-backed shell, filters, KPI cards, scope summary, and Overview content while preserving the existing loading/error conventions.
- [ ] 1.5 Add route, parser, authorization, multi-Program isolation, denominator, zero-rate, draft-exclusion, and aggregate-serialization tests.

## 2. Outcomes Evidence and Accessible Distributions

**Scope:** Add Outcomes view for course-bound CILO/Program-GO evidence, scale-aware Likert distributions, mapped detail, and authorized drill-through. Keep central questions and ILO evidence out of Program GO analytics when canonical mappings do not exist.

**Affected paths:** `src/features/analytics/services/get-program-head-analytics.ts`, `src/features/analytics/services/program-head-analytics-aggregators.ts`, `src/features/analytics/components/program-head-outcomes-view.tsx`, `src/features/analytics/components/program-head-likert-distribution.tsx`, `src/features/analytics/components/program-head-go-detail.tsx`, `src/lib/constants/program-head-routes.ts`, `src/__tests__/features/analytics/program-head-outcomes.test.ts`, `src/__tests__/components/program-head-outcomes-view.test.tsx`.

**Acceptance criteria:** GO ranking contains code/name, mean, rating count, response count, contributing CILOs/courses, and exact values; each rating contributes once per mapped GO; central questions are never string-inferred to a GO; distributions use instrument-version snapshot descriptors and do not merge incompatible scales; limitations identify current-mapping semantics; course-bound detail links remain selected-Program authorized.

**Verification:** `pnpm vitest run src/__tests__/features/analytics/program-head-outcomes.test.ts src/__tests__/components/program-head-outcomes-view.test.tsx`

**Commit:** `feat(program-head-analytics): add mapped outcome evidence`

- [ ] 2.1 Add course-bound binding and current Program CILO-to-GO aggregation with many-to-many disclosure and historical-mapping limitation metadata.
- [ ] 2.2 Add structure-snapshot scale resolution and per-scale Likert count/percentage aggregation without hardcoded 1–5 bins.
- [ ] 2.3 Implement Outcomes ranking, selected GO contextual detail, exact-value tables, and authorized course-bound evidence links.
- [ ] 2.4 Add tests for mapping multiplicity, central mapping exclusion, scale separation, invalid ratings, current-map disclosure, and accessible empty/detail states.

## 3. Stakeholder and Contextual Breakdowns

**Scope:** Add Stakeholders and Breakdowns views with source-aware comparisons and defensible course/instrument/major dimensions. Do not present unlike stakeholder instruments as one construct or infer respondent attributes that are not snapshotted.

**Affected paths:** `src/features/analytics/services/get-program-head-analytics.ts`, `src/features/analytics/program-head-analytics-types.ts`, `src/features/analytics/components/program-head-stakeholder-view.tsx`, `src/features/analytics/components/program-head-breakdowns-view.tsx`, `src/features/analytics/components/program-head-comparison-chart.tsx`, relevant route/service/component tests.

**Acceptance criteria:** Course-bound student, central student, alumni, and industry-partner evidence remain distinct; means use bars/dots/grouped bars rather than pie slices; response composition alone may use a donut; course and instrument breakdowns expose counts and means; major controls appear only when applicable; incomplete attribution is `Unspecified`; `NULL` central Program rows are excluded rather than inferred.

**Verification:** `pnpm vitest run src/__tests__/features/analytics/program-head-breakdowns.test.ts src/__tests__/components/program-head-comparison-chart.test.tsx`

**Commit:** `feat(program-head-analytics): add stakeholder and breakdown views`

- [ ] 3.1 Aggregate source-aware stakeholder buckets and instrument metadata with explicit evidence-source disclosures.
- [ ] 3.2 Aggregate course and defensible major breakdowns with incomplete-attribution handling and context-aware filter options.
- [ ] 3.3 Implement semantic comparison/coverage charts and exact-value tables with no color-only meaning.
- [ ] 3.4 Add tests for source separation, NULL central scope exclusion, major/unspecified behavior, count-vs-rating semantics, and mobile/empty states.

## 4. Comparable Trends

**Scope:** Add the Trends view using canonical term instances and explicit comparability breaks. Preserve historical retired/inactive evidence where it belongs to a selected scope and avoid inferring a continuous trend across changed instruments or scales.

**Affected paths:** `src/features/analytics/services/get-program-head-analytics.ts`, `src/features/analytics/services/program-head-analytics-aggregators.ts`, `src/features/analytics/components/program-head-trends-view.tsx`, `src/features/analytics/components/program-head-trend-chart.tsx`, trend tests.

**Acceptance criteria:** Trends resolve school year/semester/term through `AcademicTermInstance`; comparable periods show period, mean, submitted count, rating count, instrument/version and exact table; scale/instrument/outcome identity changes produce visible breaks; fewer than two comparable periods produce an explanatory empty state; no interpolation is performed.

**Verification:** `pnpm vitest run src/__tests__/features/analytics/program-head-trends.test.ts src/__tests__/components/program-head-trend-chart.test.tsx`

**Commit:** `feat(program-head-analytics): add comparable period trends`

- [ ] 4.1 Add period-series aggregation and instrument/scale/outcome comparability fingerprinting.
- [ ] 4.2 Implement trend chart, break markers, tabular alternative, and no-history state.
- [ ] 4.3 Add tests for canonical term resolution, comparable series, break detection, and no-interpolation behavior.

## 5. Aggregate Feedback and Evidence Return Path

**Scope:** Add Feedback view using the existing word-cloud pipeline, identifier redaction, aggregate prompt/source counts, exact values, and links to the existing authorized reviewer pages. Keep raw comments out of all analytics payloads.

**Affected paths:** `src/features/analytics/services/get-program-head-analytics.ts`, `src/features/analytics/services/qualitative-analytics.ts`, `src/features/analytics/services/get-faculty-dashboard.ts` or shared token utility as appropriate, `src/features/analytics/components/program-head-feedback-view.tsx`, `src/features/analytics/components/qualitative-word-cloud.tsx`, serialization/privacy tests.

**Acceptance criteria:** Only submitted non-empty qualitative evidence contributes; Program Head tokens use identifier redaction and deterministic sorting; browser payloads contain only token text/value, counts, labels, and links; no raw comments, response IDs, emails, or assignments appear; no-qualitative state is explicit; course-bound review links independently re-authorize.

**Verification:** `pnpm vitest run src/__tests__/modules/analytics-reporting-and-review/faculty-analytics-serialization.test.ts src/__tests__/features/analytics/program-head-feedback.test.ts src/__tests__/components/course-bound-review/qualitative-word-cloud.test.tsx`

**Commit:** `feat(program-head-analytics): add aggregate feedback evidence`

- [ ] 5.1 Consolidate or safely share the identifier-redacted winkNLP token pipeline without changing existing Faculty output contracts.
- [ ] 5.2 Add qualitative token, source/prompt count, response-count, and evidence-link DTOs to the Feedback view.
- [ ] 5.3 Implement Feedback UI with word cloud, exact-value table, accessible empty state, and authorized review links.
- [ ] 5.4 Add serialization and regression tests for email fragments, digit-bearing identifiers, raw text, submitted-only behavior, and deterministic token order.

## 6. Responsive, Accessible Workspace Hardening

**Scope:** Finish the seven-tab workspace composition and ensure desktop/mobile filters, tabs, loading, error, empty, accessibility, theme, reduced motion, and route-state behavior match System CLOIE conventions.

**Affected paths:** `src/app/(app)/program-head/programs/[programId]/analytics/page.tsx`, `src/features/analytics/components/program-head-analytics-shell.tsx`, `src/features/analytics/components/program-head-analytics-filters.tsx`, new chart components, `src/components/ui/*` only when an existing primitive is insufficient, route/component tests, `docs/agents` only if a runbook is required.

**Acceptance criteria:** All seven tab links preserve valid filters; desktop primary filters and mobile Dialog/Drawer filters expose active counts and reset behavior; charts have title/insight/legend or direct labels/exact-value tables; controls are keyboard and touch usable; light/dark semantic tokens and reduced motion are preserved; operational loading/error and distinct empty reasons render without blank regions or horizontal overflow.

**Verification:** `pnpm vitest run src/__tests__/app/selected-program-insights-route.test.tsx src/__tests__/components/program-head-analytics-shell.test.tsx src/__tests__/components/ui/chart-wrapper.test.tsx && pnpm lint && pnpm build`

**Commit:** `feat(program-head-analytics): harden responsive analytics workspace`

- [ ] 6.1 Compose all view tabs with URL links, active filter badges, reset behavior, scope summary, and selected-tab semantics.
- [ ] 6.2 Implement desktop and mobile filter surfaces using existing Base UI Dialog/Drawer and touch-target conventions.
- [ ] 6.3 Audit every new chart for semantic tokens, accessible summaries, exact values, direct labels/patterns, reduced motion, and explicit loading/error/empty states.
- [ ] 6.4 Add route/component tests for tab/filter navigation, mobile filter semantics, accessibility labels, error boundaries, and empty reason coverage.

## 7. Bounded AI Insights

**Scope:** Add disabled-by-default, on-demand AI interpretation over the authorized aggregate packet. Add one reviewed OpenAI-compatible dependency/client, server-only `CLOIE_AI_*` configuration, one Server Action, Zod output validation, bounded sentiment/theme counts, stale fingerprints, and safe failures. Do not send raw comments or persist results.

**Affected paths:** `package.json`, `pnpm-lock.yaml`, `.env.example`, `src/features/analytics/services/generate-program-head-analytics-insight.ts`, `src/features/analytics/services/program-head-analytics-ai-schema.ts`, `src/lib/actions/program-head-analytics-actions.ts`, `src/features/analytics/components/program-head-ai-insights-view.tsx`, `src/features/analytics/components/program-head-analytics-shell.tsx`, AI service/action/serialization tests.

**Acceptance criteria:** Missing flag/credentials disables AI; Action validates only program/filter input and re-authorizes; provider packet is bounded aggregate-only and prompt-injection resistant; invalid/oversized model output never reaches client; server computes sentiment/theme counts; stale fingerprints are marked after filter changes; provider errors are recoverable; no Prisma/cache/domain mutation occurs; deterministic tabs work when AI is unavailable.

**Verification:** `pnpm vitest run src/__tests__/features/analytics/program-head-ai-insights.test.ts src/__tests__/modules/analytics-reporting-and-review/program-head-analytics-serialization.test.ts && pnpm lint && pnpm build`

**Commit:** `feat(program-head-analytics): add bounded AI insights`

- [ ] 7.1 Add the smallest reviewed OpenAI-compatible client dependency, server-only `CLOIE_AI_*` env documentation, timeout/error handling, and disabled-by-default configuration parser.
- [ ] 7.2 Define bounded aggregate packet and Zod-validated AI output schemas with summary, strengths, areas for review, themes, sentiment classifications, questions, limitations, and filter fingerprint.
- [ ] 7.3 Implement the authorized server-only Action that rebuilds deterministic evidence, caps packet size, treats token text as untrusted data, validates output, and computes counts locally.
- [ ] 7.4 Implement AI Insights loading, disabled, insufficient-evidence, error, valid, and stale-result states with human-decision copy and no raw evidence rendering.
- [ ] 7.5 Add tests for auth denial, disabled configuration, packet privacy/limits, prompt-injection-like tokens, provider failure, timeout, invalid output, valid output, count computation, stale fingerprints, and non-persistence.

## 8. Dashboard Semantics and Final Verification

**Scope:** Align the compact Program Head dashboard with shared deterministic semantics without turning it into the seven-tab workspace, remove the misleading mean pie from the Program Head surface, and complete integrated verification/documentation.

**Affected paths:** `src/app/(app)/program-head/programs/[programId]/dashboard/page.tsx`, `src/features/analytics/services/get-program-head-dashboard.ts`, `src/features/analytics/components/stakeholder-mean-pie-chart.tsx` or replacement comparison component, dashboard tests, selected route tests, relevant OpenSpec evidence.

**Acceptance criteria:** Dashboard remains a concise “what should I know now?” surface; it shares submitted/mean/count semantics with Analytics; independent stakeholder means are not shown as pie slices; no unrelated Faculty/Dean surface changes; all focused tests, lint, build, and browser smoke checks pass at representative desktop and mobile sizes.

**Verification:** `pnpm vitest run src/__tests__/app/selected-program-dashboard-route.test.tsx src/__tests__/modules/analytics-reporting-and-review/dashboard-access.test.ts src/__tests__/app/selected-program-insights-route.test.tsx && pnpm lint && pnpm build`

**Commit:** `refactor(program-head-analytics): align dashboard evidence semantics`

- [ ] 8.1 Reuse the deterministic submitted/count/mean helpers in the compact Program Head dashboard without loading Analytics tab DTOs.
- [ ] 8.2 Replace the Program Head dashboard independent-mean pie presentation with a semantically correct compact comparison while retaining the composition donut only where it represents a whole.
- [ ] 8.3 Update dashboard/analytics serialization and route tests for selected-Program isolation, semantic chart data, and unchanged empty/error behavior.
- [ ] 8.4 Run the full focused analytics test set, `pnpm lint`, `pnpm build`, and browser smoke verification for Overview → Outcomes → Feedback → AI at desktop and mobile viewports; record any unresolved methodology limitations.
