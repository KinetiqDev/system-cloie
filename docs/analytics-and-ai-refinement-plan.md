# System CLOIE Analytics & AI Refinement Plan

**Status:** Proposed Specification
**Scope:** Faculty Analytics, Program Head Analytics, AI Integration, Traceability, Seed Data
**Date:** 2026-09-09

---

## 1. Findings & Concrete Problems

Based on a comprehensive audit of the repository, the brainstorming session, and the current implementation, the following concrete problems have been identified:

### Data & Analytics Correctness

- **Historical PLO Traceability Gap:** Course-derived PLO metrics (`buildCourseDerivedPloMetrics`) join publication-time question-to-CILO bindings with the **current, live** `CILOMapping` table. If a Program Head edits a CILO-to-PLO mapping today, historical course evidence from two years ago is reinterpreted under the new mapping. (Program-wide central deployments correctly use `CentralDeploymentPloSnapshot`).
- **Incomparable Visual Rankings:** The Program Head "Stakeholders" and "Courses" tabs visually rank evidence sources (e.g., Course-Bound vs. Industry Partner) side-by-side in single bar charts, implying an apples-to-apples comparison despite different instruments, scales, and respondent populations.

### UX & Data Visualization

- **Faculty CILO Visualization:** The current CILO results UI resembles a slider or progress bar rather than a shared-scale statistical visualization.
- **Faculty Question Results Flood:** The UI renders a massive, repetitive empty state ("No valid ratings") for every published quantitative question that lacks responses, instead of collapsing unrated questions.
- **Evaluation Filter Ambiguity:** The Faculty evaluation dropdown displays only the `deploymentName`, causing identical-looking options when a faculty member teaches the same course deployment in different sections/classes.
- **PH AI Bolted-On:** Program Head AI requires navigating to a dedicated "AI Insights" tab and clicking a "Generate" button, treating AI as a separate destination rather than an inline reading aid.

### AI Integration & Prompting

- **Monolithic PH AI Packet:** The PH AI service rebuilds all six analytics domains and sends one massive bounded packet to the LLM, regardless of which tab the user is viewing. It also lacks caching and in-flight deduplication (unlike the Faculty implementation).
- **Misleading Sentiment Contracts:** Both Faculty and PH AI schemas force the LLM to output `sentiment` (positive/negative/neutral) or generic `strengths`/`areasForReview`. This encourages "management-consultant sludge" and misapplies stock-market sentiment analysis to educational Likert scales.
- **Coupled Evidence Thresholds:** PH AI requires _both_ sufficient quantitative responses and sufficient qualitative items before generating anything. A lack of written feedback blocks Outcomes AI, even if quantitative PLO evidence is robust.

### Seed & Demo Data

- **Trend Starvation:** The seed orchestrator (`prisma/seed.ts`) pins almost all evaluation evidence to a single `ACTIVE` term instance. There are insufficient historical `COMPLETED` terms with comparable instrument versions to render meaningful trend lines or test comparability-break logic.

---

## 2. Decisions to Keep (from Brainstorming & Codebase)

- **Faculty AI Caching Pattern:** The SHA-256 LRU cache with in-flight request deduplication (`generate-faculty-analytics-insight.ts`) is excellent. It will be ported to the Program Head.
- **Server-Side Evidence Rebuilding:** The strict rule that AI evidence must be rebuilt and authorized server-side (never trusting client aggregates) remains inviolable.
- **Recharts Monopoly:** We will use the existing Recharts infrastructure and shared System CLOIE chart primitives. No new charting libraries (e.g., D3, Nivo, Chart.js) will be introduced.
- **Manifestations as Descriptive:** `CILOMappingManifestation` (LEARNING, PRACTICE, OPPORTUNITY) will remain a descriptive classification. We will **not** invent numerical weights (e.g., Learning = 25%) to calculate PLO attainment.
- **Qualitative Privacy Boundaries:** The existing respondent-count thresholds that suppress raw comments and expose only redacted aggregate term frequencies will be strictly preserved.

---

## 3. Ideas to Reject or Modify

- **Reject: Pie/Donut/Radar Charts for PH Analytics.** Radar charts obscure exact values and make comparing CILO/PLO attainment difficult. We will use Lollipop/Dot plots and Horizontal Bars.
- **Reject: AI Sentiment Analysis.** We will completely remove `sentiment`, `positive`, `negative`, and `mixed` from the AI Zod schemas. Educational evidence requires evidence-backed observations, not sentiment badges.
- **Modify: Publication-Time CILO-to-PLO Snapshots.** While adding a `cilo_plo_mappings_snapshot` JSON column to `CourseBoundEvaluation` is the correct long-term fix for historical traceability, it requires a complex schema migration and backfill. **Decision:** Defer the schema migration to a future phase. For this refinement, we will retain the live-mapping join but ensure the UI prominently discloses this limitation (as current tests enforce) and document it as a known capstone boundary.
- **Modify: Monolithic PH AI.** Instead of one giant report, we will split PH AI into view-specific packets (Outcomes, Courses, Stakeholders, Trends, Qualitative).

---

## 4. Target Information Architecture

### Faculty Analytics

1. **Overview:** Participation progress bars + 100% Stacked Likert Distribution + Class Summary Table.
2. **CILO Results:** Shared-scale Horizontal Bar Chart (Mean) + Expandable Likert Distribution.
3. **Question Results:** Horizontal Mean Bar Chart grouped by section. Unrated questions collapsed into a single disclosure ("Show X unrated questions").
4. **Trends:** Line chart with dots. Explicit comparability breaks. Course-first selector.
5. **Written Feedback:** Ranked Horizontal Frequency Bar + Word Cloud (secondary).

### Program Head Analytics

1. **Outcomes:** PLO Lollipop/Dot Plot -> Click to expand CILO Contributor Matrix (Course, Manifestation, Mean, N).
2. **Courses:** Horizontal Ranked Bar (Course-Bound evidence only).
3. **Stakeholders:** Separate Summary Cards per source (Mean, N, Instrument). **No cross-source ranking.**
4. **Trends:** Source-specific Line Chart with comparability breaks.
5. **Qualitative:** Ranked Term Frequency Bar + Word Cloud + Prompt Coverage Table.
6. **AI Insights Tab:** **DELETED.** AI moves inline below relevant charts.

---

## 5. Chart & Visualization Matrix

| View                 | Analytical Question | Metric             | Visualization           | Comparability Rule | Traceability Requirements | Empty State               |
| :------------------- | :------------------ | :----------------- | :---------------------- | :----------------- | :------------------------ | :------------------------ |
| **Faculty Overview** | Response coverage   | Submitted / Target | Progress Bar            | N/A                | Evaluation, Term          | "No evaluations deployed" |
| **Faculty Overview** | Rating shape        | Likert counts      | 100% Stacked Bar        | Same instrument    | Scale, N                  | "No valid ratings"        |
| **Faculty CILO**     | Outcome attainment  | Mean per CILO      | Horizontal Bar          | Same scale         | CILO, N, Scale            | "No mapped CILOs"         |
| **Faculty Question** | Outliers            | Mean per Question  | Horizontal Bar + Expand | Same instrument    | Question, Section, N      | "X questions unrated"     |
| **Faculty Trends**   | Change over time    | Mean per period    | Line + Dots             | Fingerprint match  | Period, Break reason      | "Select one course"       |
| **PH Outcomes**      | PLO status          | Mean per PLO       | Lollipop / Dot Plot     | Current mappings   | PLO, CILO contributors    | "No mapped evidence"      |
| **PH Courses**       | Course differences  | Mean per Course    | Horizontal Bar          | Course-bound only  | Course, Instrument, N     | "No course evaluations"   |
| **PH Stakeholders**  | Source evidence     | Mean per Source    | Summary Cards           | N/A (Never rank)   | Source, Instrument, N     | "No source data"          |
| **PH Trends**        | Construct change    | Mean per period    | Line + Dots             | Fingerprint match  | Source, Period, Break     | "Select evidence source"  |

---

## 6. Traceability Model: CILO → PLO Evidence Chain

The Program Head must be able to trace a PLO result to its concrete course-level evidence.

**The Evidence Path:**
`Evaluation Response` → `Quantitative Question` → `CourseBoundCiloQuestionBinding` → `CILO` → `CILOMapping` (Manifestation) → `PLO Aggregate`

**UI Implementation:**

1. **PLO Lollipop Chart:** Shows overall PLO means.
2. **CILO Contributor Table:** Clicking a PLO expands a table showing:
   - Contributing CILO Code & Description
   - Course Code & Title
   - Manifestation (Learning / Practice / Opportunity)
   - Mean Rating & Valid Rating Count
3. **CILO-PLO Matrix (Optional/Secondary):** A read-only grid showing how CILOs map to PLOs via manifestations for the selected program.

---

## 7. AI Architecture & Contracts

### A. Unified Output Contract (Replaces Sentiment)

Both Faculty and PH will use a unified, evidence-bound schema. Sections return `null` if the deterministic analytics already suffice or evidence is insufficient.

```typescript
type InsightSection = {
  observation: string; // What stands out
  evidence: string[]; // Exact numbers anchoring the claim
  connection?: string; // (PH Outcomes) How CILOs map to PLO
  limitation: string | null; // Evidence boundary (e.g., small N, self-reported)
  reviewQuestion: string | null; // Question for human academic review
} | null;

type AIInsightResponse = {
  // Faculty & PH shared
  overview: InsightSection;
  cilos: InsightSection;
  questions: InsightSection;
  trends: InsightSection;
  qualitative: InsightSection;
  // PH specific (view-dependent)
  outcomes: InsightSection;
  courses: InsightSection;
  stakeholders: InsightSection;
};
```

### B. Program Head View-Specific Packets

The PH AI service will accept an `analyticsView` parameter.

- **Outcomes Packet:** PLO means, CILO contributors, manifestations, rating counts.
- **Stakeholders Packet:** Source buckets, instrument contexts, response counts.
- **Trends Packet:** Comparable runs, fingerprint breaks, period deltas.
- **Qualitative Packet:** Ranked term frequencies, prompt coverage.

### C. Caching & Invalidation

Port the Faculty SHA-256 LRU cache to PH.
**Cache Key:** `SHA256(promptVersion + model + provider + programId + view + canonicalSerializedEvidence)`

- If a CILO mapping changes, the evidence packet changes, the hash changes, and the cache invalidates automatically.
- Bounded process-local Map (max 128 entries). No Redis/Postgres persistence.

### D. Evidence Thresholds

Decouple quantitative and qualitative thresholds.

- **Outcomes AI:** Requires N quantitative ratings. Does _not_ block on missing qualitative feedback.
- **Qualitative AI:** Requires privacy-threshold qualitative items.

---

## 8. Historical-Data Decision (Snapshots)

**Problem:** `CourseBoundEvaluation` snapshots the CILOs and Course Info, but relies on the live `CILOMapping` table to route historical ratings to PLOs.
**Decision:** **Defer Schema Migration.**
Adding `cilo_plo_mappings_snapshot Json` to `CourseBoundEvaluation` is the correct architectural fix, but it carries high migration risk and backfill complexity for this sprint.
**Mitigation:**

1. Retain the live-mapping join in `buildCourseDerivedPloMetrics`.
2. Ensure the UI displays the existing "Publication-time mapping snapshots are not yet available" disclosure.
3. Document this explicitly in the Capstone Technical Document as a known boundary and future engineering task.

---

## 9. Seed-Data Plan

To demonstrate Trends and AI edge cases, the seed orchestrator (`prisma/seed.ts`) must be updated:

1. **Add Historical Terms:** Create `2025-2026 1st Sem` and `2025-2026 2nd Sem` as `COMPLETED` term instances.
2. **Deploy Comparable Instruments:** Seed the same `Course-Bound CILO Evaluation v1` across these historical terms for core courses (e.g., GESTECH, IT201).
3. **Varied Distributions:** Inject response data with realistic Likert distributions (not just 4s and 5s) to create visible trend lines and meaningful AI observations.
4. **Comparability Break Fixture:** Intentionally change the instrument version or scale in one historical term to test the UI's comparability-break rendering.

---

## 10. Implementation Sequence

### Phase 1: Seed Data & Trend Infrastructure

- Update `prisma/seed.ts` with historical completed terms.
- Verify PH and Faculty trend charts render meaningful lines and breaks.
- **Deliverable:** Populated trend charts in demo environment.

### Phase 2: Faculty UX & AI Contract Refinement

- Replace CILO slider with Recharts Horizontal Bar.
- Collapse unrated questions in Question Results.
- Disambiguate Evaluation filter dropdown (append class/term context if names collide).
- Update Faculty AI Zod schema (remove sentiment, add `observation/evidence/limitation`).
- Update Faculty AI system prompt.
- **Deliverable:** Clean Faculty dashboard with evidence-bound AI.

### Phase 3: Program Head AI Architecture

- Split PH AI evidence packet builder into view-specific functions.
- Implement SHA-256 LRU cache + in-flight dedup for PH AI.
- Delete `program-head-ai-insights-view.tsx` (the dedicated tab) and move AI generation inline below relevant charts.
- Update PH AI Zod schema to the unified `InsightSection` contract.
- Decouple evidence thresholds (allow Outcomes AI without qualitative data).
- **Deliverable:** Inline, cached, view-specific PH AI interpretations.

### Phase 4: Program Head UX & Traceability

- Replace PH Outcomes chart with Lollipop/Dot plot.
- Implement CILO Contributor Matrix expansion for PLOs.
- Refactor PH Stakeholders tab to use Summary Cards instead of ranked cross-source bars.
- Refactor PH Courses tab to horizontal bars (course-bound only).
- **Deliverable:** Traceable, comparable PH analytics dashboard.

### Phase 5: Verification & Capstone Documentation

- Update Vitest suites for new AI schemas, cache invalidation, and trend comparability.
- Update Playwright E2E journeys for Faculty and PH analytics.
- Document AI provenance, limitations, and human-oversight boundaries in the Capstone Technical Document.
- **Deliverable:** Fully tested, defensible analytics and AI feature set.

---

## 11. Test & Verification Requirements

- **Analytics Correctness:** Vitest unit tests for `buildCourseDerivedPloMetrics` ensuring live mappings are used correctly and scale validation is enforced.
- **Comparability:** Unit tests for `splitComparableRuns` and fingerprint logic ensuring lines never connect across instrument/scale/outcome changes.
- **Cache Invalidation:** Tests verifying that changing a CILO mapping or receiving a new response changes the SHA-256 evidence hash and triggers a new provider call.
- **Privacy:** Tests ensuring qualitative AI packets never contain raw comments or respondent identifiers, and suppress output below the threshold.
- **AI Schema:** Zod validation tests rejecting malformed provider output and gracefully falling back to the "unavailable" UI state.
- **UX/E2E:** Playwright tests verifying the Faculty evaluation filter disambiguation, the collapse/expand behavior of unrated questions, and the inline rendering of AI insights.

---

## 12. Risks & Unresolved Questions

- **Risk:** The deferred `cilo_plo_mappings_snapshot` means historical PLO analytics remain technically mutable if mappings are edited. The UI disclosure must be prominent and understood by the client/adviser.
- **Risk:** Moving PH AI to inline automatic generation increases Groq API calls. The process-local LRU cache and in-flight deduplication are critical to prevent token waste and rate limiting.
- **Client Decision:** Confirm that the client accepts the removal of the "AI Insights" tab and the "Sentiment" badges in favor of the evidence-bound `InsightSection` contract.
- **Client Decision:** Confirm that the descriptive nature of Manifestations (Learning/Practice/Opportunity) should not be converted into numerical weights for PLO attainment calculations.

---

## 13. Smallest Recommended First Slice

**Slice 1: Seed Historical Terms & Trend Verification**
Before refactoring the complex AI and UI layers, we must establish a baseline of data that actually exercises the trend and comparability logic.

1. Add `2025-2026 1st Sem` and `2025-2026 2nd Sem` as `COMPLETED` terms in `prisma/seed.ts`.
2. Deploy the existing `Course-Bound CILO Evaluation v1` to these terms for core courses.
3. Inject realistic response distributions.
4. Verify that the PH and Faculty Trends tabs render meaningful lines and correctly display comparability breaks.

_This slice proves the data model supports the intended analytics without touching the UI or AI contracts._
