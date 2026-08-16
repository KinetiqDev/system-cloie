## Context

System CLOIE already has the canonical selected-Program route `/program-head/programs/[programId]/analytics`, selected-Program layout authorization, `getProgramHeadDashboard`, Recharts chart wrappers, aggregate-only serialization tests, course-bound review drill-through, and winkNLP word-cloud processing. The current route is a minimal Server Component that renders a stakeholder mean chart and qualitative word cloud from a dashboard DTO. It has no academic-period scope, URL-backed filters, outcome views, exact-value evidence tables beyond the existing charts, trends, or on-demand interpretation.

The design must work with the current Prisma model. `Response` is one-to-one with `EvaluationAssignment`; response deployment IDs are not authoritative foreign keys. Submitted evidence is `Response.status = SUBMITTED`. Historical eligible opportunities are assignment rows in the selected scope. Stakeholder identity exists on central deployments; course-bound evidence is implicitly student evidence. Course-bound CILO bindings and current Program-specific CILO-to-GO mappings support outcome evidence. Central instrument questions have no canonical question-to-GO mapping. Institutional attainment thresholds, weighting, and minimum-response suppression remain undecided.

The selected Program is never client authority. `resolveProgramHeadContext(programId)` validates the route against the current active assignment set, and every analytics read or AI invocation must independently re-authorize before querying. Existing aggregate-only chart and deferred-payload specifications remain binding. No RLS, warehouse, persistent analytics cache, export system, or schema migration is required.

## Goals / Non-Goals

**Goals:**

- Make the existing selected-Program route a complete deterministic analytics workspace with Overview, Outcomes, Stakeholders, Breakdowns, Trends, Feedback, and AI Insights tabs.
- Keep tab and filter state bookmarkable, refreshable, and navigable through URL parameters while keeping reads in Server Components/server-only services.
- Use assignment-based denominators, submitted-only evidence, full internal precision, scale-aware distributions, and explicit limitations for unsupported mappings.
- Separate course-bound student evidence from central student, alumni, and industry-partner evidence rather than presenting unlike instruments as one construct.
- Provide course-bound CILO and Program-GO evidence only where canonical bindings and mappings exist.
- Render semantically correct, accessible, responsive charts and exact-value alternatives using the existing design system and Recharts primitives.
- Keep raw qualitative comments out of analytics and browser payloads; reuse aggregate word-frequency tokens and existing authorized review links.
- Add a bounded, on-demand AI interpretation that receives only server-authorized aggregate evidence, validates structured output, computes displayed counts in System CLOIE, and never becomes a CQI decision-maker.
- Preserve non-disclosing authorization failures and independently test selected-Program isolation, payload privacy, filter parsing, aggregation boundaries, and AI failure behavior.

**Non-Goals:**

- Faculty, Dean, or Secretary analytics redesign.
- PDF, spreadsheet, report generation, or a generic reporting engine.
- Attainment threshold administration, automatic below-target classification, stakeholder weighting, or minimum-response policy invention.
- Central question-to-GO inference, ILO-to-GO crosswalks, or ILO attainment/insights.
- Predictive student analytics, grades, mastery claims, grading, automatic CQI plans, curriculum revisions, chatbot behavior, AI agents, RAG, embeddings, vector storage, AI history, or persisted AI results.
- Persistent caching, materialized views, analytics warehouse, WebSockets, TanStack Query, or a new analytics microservice.
- New raw-comment review permissions or a central qualitative review product.

## Decisions

### 1. Keep one canonical route and use URL-backed tabs

The implementation modifies `src/app/(app)/program-head/programs/[programId]/analytics/page.tsx` rather than adding child route segments. The selected-Program catch-all intentionally rejects unknown child paths. The page parses `tab` with allowed values `overview`, `outcomes`, `stakeholders`, `breakdowns`, `trends`, `feedback`, and `ai`; missing or invalid values canonicalize to `overview`. Tab links preserve the active filter parameters.

This follows the existing Program Head tools `?tab=` convention while allowing each analytics view to have a view-specific server read. Separate child routes were rejected because they would expand the route surface, conflict with the fail-closed catch-all, and make shared scope state harder to preserve.

### 2. Use a server-first canonical filter state

Add a feature-local parser/schema under `src/features/analytics/` for URL parameters:

- `schoolYear`, `semester`, and `term`, resolved to the canonical `AcademicTermInstance` model;
- `stakeholder`, with distinct `COURSE_STUDENT`, `CENTRAL_STUDENT`, `ALUMNI`, and `INDUSTRY_PARTNER` buckets;
- contextual `instrument`, `course`, `major`, and `go` identifiers when valid options exist.

The page resolves and validates the cascade against the selected Program. Invalid IDs, impossible period combinations, and options outside the selected Program fail closed or redirect to one canonical URL according to existing list-state conventions. Empty option sets remove the corresponding control. The backend uses `term_instance_id`; it does not create parallel academic-period state.

Desktop primary controls navigate through GET links/forms. Secondary controls use the existing responsive Dialog/Drawer pattern. A visible scope summary is rendered from server-resolved labels. Ordinary filter changes do not use Server Actions.

The alternative of client-owned filter state was rejected because Faculty Analytics is an older interaction pattern, while course-roster and Dean period controls establish the stronger server-first URL convention needed for refresh, back/forward, and authorization-safe reads.

### 3. Add one view-gated Program Head read service and explicit DTOs

Create a sibling analytics service, preferably `src/features/analytics/services/get-program-head-analytics.ts`, and explicit contracts in `src/features/analytics/program-head-analytics-types.ts` (or the established shared analytics type module). The public read entry point accepts `{ programId, tab, filters }`, calls `resolveProgramHeadContext(programId)`, resolves filter options, and returns a serializable closed DTO. It does not expose Prisma objects.

Shared DTO data contains selected Program identity, canonical filter state, available options, readable scope summary, and empty-reason codes. View DTOs contain only labels, catalog identifiers needed for in-page links, counts, means, distributions, tokens, comparison flags, and limitations. Queries use narrow `select` projections, assignment-based response scoping through `EvaluationAssignment`, and one-pass grouping in memory. Each view loads only the data it needs; no monolithic dashboard DTO is expanded to contain every tab.

Pure aggregation helpers are kept separate from Prisma reads so deterministic formulas can be unit-tested without a database. The existing `getProgramHeadDashboard` remains available for the compact dashboard and shares helpers where semantics match. No generic analytics engine or provider framework is introduced.

### 4. Lock submitted and denominator semantics

All metrics include only responses with `status = SUBMITTED`. A missing `submitted_at` is an integrity limitation and does not make an otherwise submitted response eligible for aggregation when the existing analytics contract uses status; display timestamps remain separate.

`EvaluationAssignment` rows are the historical eligible-opportunity denominator. Course-bound live roster re-checks remain a Dashboard pending-response concern, not the Analytics historical rate denominator. Response rate is empty when the denominator is zero, otherwise `submittedAssignmentCount / eligibleAssignmentCount`. Rating count is the number of valid quantitative items, not response count. Mean is `sum(valid rating values) / valid rating count`, retained at full precision internally and rounded only in the UI.

Likert category values and labels are read per instrument-version structure snapshot. The implementation never assumes a universal 1–5 scale and does not merge descriptor sets with different scales. Invalid/out-of-scale values are excluded from the valid rating aggregate and represented in diagnostic counts where the view exposes them.

### 5. Keep outcome and stakeholder semantics defensible

Course-bound quantitative items use publication-time CILO bindings and the selected Program's current CILO-to-GO mappings. A rating may contribute once to each mapped GO in a many-to-many mapping, while the UI discloses that mapped evidence can appear in multiple GO rows. Central items never enter GO means because no canonical central question-to-GO relation exists. GE/ILO evidence is labeled separately and is not called Program GO attainment. Current mappings are explicitly labeled as current rather than publication-time snapshots.

Stakeholder views separate course-bound student evidence from central student, alumni, and industry-partner deployments. Stakeholder comparisons include instrument/source disclosures. Course and major views show only defensible dimensions; absent or transitive major/year-level attribution is shown as `Unspecified` or omitted rather than inferred from strings. Historical retired curriculum versions and inactive courses remain queryable when they are part of evidence scope.

No target/reference line or “below target” metric is rendered. The replacement KPI is evidence coverage or mean rating, depending on the view.

### 6. Use existing semantic visualization primitives

All quantitative charts use Recharts through `src/components/ui/chart.tsx`, `ChartContainer`, semantic chart roles, and deterministic patterns. Client charts receive server-prepared aggregates only. Independent means use horizontal bars, dots, or grouped bars. Donuts are reserved for response composition. Coverage uses horizontal bars, not a loading `Progress`. Trends use lines only when the series is comparable; instrument/scale/outcome changes create visible breaks.

Each chart has a title, concise text insight, legend or direct labels, keyboard/touch-accessible exact values, and a table disclosure. New chart components live under `src/features/analytics/components/` and justify their client boundary only because Recharts or word-cloud rendering requires browser APIs. `isAnimationActive={false}`, semantic tokens, pattern distinctions, and reduced-motion-safe behavior follow `docs/design.md` and the existing chart spec.

The existing mean pie components are not reused for independent means. The current PH analytics stakeholder mean presentation changes to a semantically correct comparison chart; the existing dashboard can be updated in the dedicated dashboard-consistency slice without broad Faculty redesign.

### 7. Keep qualitative analytics aggregate-only

Reuse `buildReviewWordCloudTokens` and the existing `QualitativeWordCloud`, but standardize Program Head token preprocessing with the existing identifier-redaction behavior before tokenization. The browser receives only `{ text, value }` tokens, response/item counts, and source labels. Raw `QualitativeResponseItem.text_content` remains confined to the independently authorized course-bound response review route. Feedback includes top-term tables, source/prompt counts, and links to authorized course-bound review evidence.

A word-count control, if needed, is a narrow client-only presentation control over tokens already in the DTO. It does not trigger a read and does not introduce a new generic filter framework.

### 8. Add one bounded AI Server Action without persistence

Create one server-only service under `src/features/analytics/services/` and one thin action under `src/lib/actions/`, such as `generate-program-head-analytics-insight.ts` and `program-head-analytics-actions.ts`.

The client submits only `{ programId, tab/filter state }`. The Action validates the input, re-runs `resolveProgramHeadContext`, rebuilds the deterministic aggregate read packet, and rejects unsupported or empty scopes. The model packet contains means, distributions, response/rating counts, source labels, comparable trend summaries, and bounded word-frequency tokens; it does not contain raw comments, response rows, respondent IDs, account emails, or client-supplied computed metrics. Respondent-controlled token text is treated as untrusted data and cannot supply instructions.

Use server-only `CLOIE_AI_ENABLED`, `CLOIE_AI_API_KEY`, `CLOIE_AI_BASE_URL`, and `CLOIE_AI_MODEL` configuration. The feature is disabled unless the explicit enable flag and required credentials are present. Use one reviewed OpenAI-compatible client/dependency rather than a provider abstraction. Validate the structured model output with Zod 4 before returning it. The model may return summary, strengths, areas for review, themes, sentiment labels over supplied aggregate evidence, questions for human review, and limitations. System CLOIE computes sentiment/theme counts and percentages from the validated output and attaches a filter fingerprint. No output is persisted, cached, streamed, or used to mutate domain data.

Raw-comment AI summarization was rejected for V1 because the existing aggregate-only visualization/deferred-payload contract and open qualitative privacy policy do not authorize a new raw-text client or provider boundary. If institutional policy later authorizes raw-comment processing, it requires a separately reviewed privacy/domain change.

### 9. Preserve authorization and privacy at every boundary

The `[programId]` layout remains an early non-disclosing gate. The new read service and AI Action independently call `resolveProgramHeadContext(programId)` before any selected-Program query. Central scope uses `central_deployment.program_id`; course-bound scope uses `course_bound.course_assignment.program_id`; NULL central Program deployments are excluded rather than inferred. No client-selected Program, remembered preference, JWT metadata, or profile join establishes authority.

DTO serialization tests assert closed key sets and absence of raw text, response IDs, respondent IDs, emails, assignments, and qualitative item rows. Review links point only to existing selected-Program paths. Unauthorized, malformed, or unassigned Program requests produce the existing non-disclosing `notFound`/safe Action failure behavior.

### 10. Keep caching request-scoped and explicit

No persistent or shared analytics cache is introduced. The cache matrix is:

| Data | Key | Scope | Lifetime | Tags | Invalidation | Authorization | Stale behavior |
|---|---|---|---|---|---|---|---|
| Analytics read DTO | none | request-local Prisma/read execution only | one request | none | none | `resolveProgramHeadContext` before query | never served stale from shared storage |
| AI packet/result | none | one Action invocation/client response | one invocation | none | none | Action re-authorizes and rebuilds packet | failure or disabled state; no stale result persisted |
| Academic/filter catalog | none beyond existing request memoization | request | one request | none | existing route behavior | selected Program scope | re-read on next request |

`React.cache` or persistent caching is not added speculatively. Any future immutable-result cache requires a separate cache matrix review and must not cache authorization-dependent or qualitative data.

### 11. Test strategy and boundaries

Add focused tests for:

- URL parser canonicalization, cascading options, default tab, and readable scope summary.
- Program Head role/selected-assignment denial and multi-Program isolation for every view query.
- Submitted-only counting, assignment denominator, zero-denominator response rate, rating count vs response count, full-precision means, scale-specific distributions, mapping multiplicity, and trend comparability breaks.
- Aggregate-only DTO key sets and token-level identifier redaction.
- Chart empty/loading/error and exact-value accessibility contracts where new components are introduced.
- AI disabled, unauthorized, insufficient evidence, provider failure, invalid structured output, prompt-injection-like token content, valid output, bounded packet size, and stale filter fingerprint.

Use existing Vitest conventions and a disposable database only for tests that require database integration. Do not run shared hosted-database integration tests.

## Risks / Trade-offs

- **[Historical denominator differs from live eligibility]** → Use `EvaluationAssignment` consistently for Analytics rates and label Dashboard pending counts as operational “now” values.
- **[No universal Likert scale]** → Read descriptor values from each `InstrumentVersion.structure_snapshot`; do not hardcode 1–5 or merge incompatible scales.
- **[Current CILO-to-GO mappings can reinterpret historical evidence]** → State the limitation in DTO/UI; publication-time mapping snapshots require a separate schema change.
- **[Central instruments lack question-to-GO mappings]** → Keep central evidence at stakeholder/instrument level and never infer mappings from text or item keys.
- **[Major/year-level attribution is not response-snapshotted]** → Expose only defensible targeting/assignment dimensions and use `Unspecified` for incomplete attribution.
- **[Minimum-response suppression is unresolved]** → Do not invent a threshold; expose counts and limitations pending institutional policy.
- **[Aggregate-only AI is less semantically rich than raw-comment interpretation]** → Keep the V1 boundary safe and disclose that AI interprets aggregate evidence, not individual comments.
- **[Model output may be invalid, biased, or overconfident]** → Validate with Zod, show limitations, compute counts locally, require on-demand human review, and keep deterministic analytics authoritative.
- **[Provider latency or outage]** → Keep AI off the initial deterministic render, show loading/error states, and leave all other tabs usable.
- **[Synchronous NLP and broad historical queries may be slow]** → Use view-gated narrow selects and one-pass aggregation; do not add caching until measured evidence supports it.
- **[Existing PH word-cloud path lacks identifier redaction]** → Apply the established redaction pipeline before tokenization and add regression coverage.

## Migration Plan

1. Implement the read contracts and focused pure aggregation tests without changing Prisma models or SQL.
2. Add the route shell, URL parser, view-gated reads, chart islands, responsive filter controls, and selected-Program authorization tests.
3. Add qualitative aggregate views and evidence links while preserving the existing reviewer-only raw-text boundary.
4. Add the disabled-by-default AI Action, server-only configuration documentation, provider output validation, and failure tests. No AI call occurs until `CLOIE_AI_ENABLED=true` and credentials are deliberately configured.
5. Run focused Vitest tests, lint, build, and browser verification at representative desktop and mobile viewports.
6. Rollback is application-level: disable AI configuration to remove the AI path, or revert the analytics page/service/component change. Existing dashboard, review routes, responses, and data remain intact because no schema or data migration occurs.
7. If a future schema change is needed for publication-time mappings, thresholds, suppression, or snapshots, stop and create a separate Prisma→Supabase migration change; do not retrofit it into this rollout.

## Open Questions

- What institutional attainment threshold, if any, will be approved for future target lines and below-target classifications? Until then, none is displayed.
- What minimum-response and qualitative corpus suppression policy will SC-09/#176 approve? Until then, counts and explicit limitations are shown; the AI path remains aggregate-only.
- Should institution approve weighting across course-bound, central, and stakeholder instruments? V1 uses pooled item means within each disclosed evidence source.
- Should historical CILO-to-GO mapping be snapshotted at publication? The current design documents the limitation and does not add a migration.
- Should a future privacy-approved change allow server-side raw-comment AI analysis? That is not part of this capability and requires a separate review.
