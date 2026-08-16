## Why

System CLOIE already has a selected-Program Program Head analytics route, but it is currently a thin dashboard projection with no period-aware scope, URL-backed filters, outcome breakdowns, exact-value evidence tables, trends, or evidence-oriented qualitative workspace. Program Heads cannot reliably move from an overview to the course-bound outcome evidence behind it, and the existing mean-as-pie presentation can misrepresent independent ratings as proportions. This change completes the selected-Program analytics workflow while adding a bounded, on-demand AI interpretation that remains supplementary to deterministic evidence and human CQI judgment.

## What Changes

- Expand `/program-head/programs/[programId]/analytics` into a server-first analytics workspace with URL-backed `tab` and filter state; retain the canonical selected-Program route and legacy root redirects.
- Add Overview, Outcomes, Stakeholders, Breakdowns, Trends, Feedback, and AI Insights views using Server Components for reads and narrow client islands for charts and interaction.
- Add context-aware school year, semester, term, stakeholder, instrument, course, major, and outcome filters only where the selected Program has defensible options; resolve academic scope through the canonical academic-term model.
- Add deterministic submitted-response analytics: submitted counts, assignment-based eligible counts, response rate, rating counts, full-precision mean ratings, scale-aware Likert distributions, course/CILO/Program-GO evidence where canonical mappings exist, stakeholder/instrument/course/major breakdowns, comparable trends, and qualitative token summaries.
- Keep Program-specific GO analysis to course-bound CILO bindings and mappings. Do not infer central instrument question-to-GO relationships or call ILO evidence GO attainment.
- Replace misleading mean-as-pie comparisons in the Program Head analytics surface with semantically appropriate ranked bars, dots, grouped bars, coverage bars, and part-to-whole composition charts.
- Add responsive filter controls, readable scope summaries, accessible chart summaries, exact-value tables, loading/empty/error states, mobile Drawer behavior, and evidence links back to authorized course-bound review pages.
- Add an on-demand bounded AI interpretation flow for the selected Program. Rebuild and authorize the evidence server-side, treat respondent text as untrusted data, validate model output, compute sentiment/theme counts in System CLOIE, return no raw comments or respondent identifiers to the client, and do not persist AI results.
- Gate AI by server-only `CLOIE_AI_*` configuration and degrade safely when disabled, unavailable, invalid, or evidence is insufficient.
- Extend analytics route, authorization, serialization/privacy, aggregation, filter, chart, and AI failure tests. No Prisma model, SQL migration, generated Supabase type, warehouse, cache, export, or reporting-engine change is included.
- **BREAKING**: The selected Program Analytics page no longer presents independent stakeholder means as pie slices; consumers must use the new semantically labeled comparison presentation.

## Capabilities

### New Capabilities

- `program-head-analytics`: Selected-Program deterministic analytics workspace, URL-backed scope state, outcome/stakeholder/breakdown/trend/feedback views, accessible visualizations, and evidence drill-through.
- `ai-assisted-analytics`: Bounded, on-demand, server-authorized AI interpretation of Program Head analytics evidence with validated output, privacy restrictions, failure handling, and human-decision boundaries.

### Modified Capabilities

None. Existing aggregate-only visualization and deferred-interactive-payload requirements remain binding constraints for the new capabilities rather than being changed.

## Impact

- **Affected routes:** `src/app/(app)/program-head/programs/[programId]/analytics/**`; selected-Program navigation and route builders as needed.
- **Affected feature modules:** `src/features/analytics/**`, selected academic-period and outcome read services, and `src/lib/actions/**` for the single AI Action.
- **Authorization:** Preserve `SessionGuard`, `resolveProgramHeadContext(programId)`, selected assignment-set scope, and independent service/Action re-authorization. Explicit `programId` remains a server-authorized object scope.
- **Privacy:** Preserve aggregate-only client DTOs, SUBMITTED-only evidence, anonymized review labels, and raw-comment confinement to existing reviewer routes. AI packets are server-only and bounded.
- **Data and deployment:** No Prisma schema, SQL migration, generated type, persistent analytics cache, AI-result table, or deployment infrastructure change. Add only server-only AI configuration and the smallest reviewed provider dependency if the implementation uses an external model.
- **Open methodology decisions:** No attainment threshold, minimum-response suppression rule, stakeholder weighting, or central question-to-GO mapping is invented. Means, distributions, counts, limitations, and evidence scope remain explicit until institutional decisions are approved.
- **Out of scope:** Faculty, Dean, or Secretary analytics redesign; reports/PDF/Excel export; generic reporting or dashboard frameworks; predictive analytics; grading; automatic CQI actions; chatbot, agents, RAG, embeddings, vector storage, AI history, and AI-generated curriculum revisions.
