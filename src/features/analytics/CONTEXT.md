# Analytics

Analytics defines how System CLOIE presents stakeholder-evaluation evidence for monitoring and continuous quality improvement without treating ratings as individual mastery or grades.

## Faculty analytics surface

**Faculty evaluation evidence**:
Aggregate-only Course-bound evaluation evidence for Course Assignments owned by the active Faculty member, regardless of whether that Faculty member, a Dean, or a Secretary published the evaluation. Only submitted responses contribute. Faculty affiliation alone grants no evidence access.
_Avoid_: Deployer-owned evidence, affiliation-wide evidence, another Faculty member's class

**Faculty analytics workspace**:
The URL-filtered `Overview`, `CILO results`, `Question results`, `Trends`, and `Written feedback` views over faculty-owned evaluation evidence. Means pool valid raw ratings within one compatible frozen scale; incompatible scales remain separate. Classifiable CILO means on approved 5-point scales receive deterministic attainment interpretation under proposed institutional policy `CLOIE_OUTCOME_MEAN_V1` with benchmark 3.50 (ADR 0037). Response rate uses historical EvaluationAssignment opportunities, and a scope with no opportunities reports unavailable.
_Avoid_: Evaluation checkbox dashboard, mean of means, unapproved attainment overrides, cross-course trend

**Faculty CILO and question grouping**:
One metric per `(evaluation, CILO)` and per `(evaluation, question)`. A Faculty scope spans several owned evaluations, so the same CILO never pools its ratings across terms; each evaluation keeps its own mean and its own publication-time label. The question view enumerates the frozen structure snapshot, so an unrated question still appears for the unrated disclosure, and a Likert question here describes one `(section, item)` identity. A binding whose CILO row is gone keeps its own group rather than pooling under another CILO. Shared arithmetic, not grouping, is what the Faculty builders reuse from the canonical Analytics aggregators.
_Avoid_: Cross-term CILO pool, one metric per CILO across evaluation evidence, unrated question omission, archived binding fold-in

**Faculty aggregate-only review**:
Faculty receive no individual-response route or DTO. Retired Faculty Course-bound review deep links redirect to the matching aggregate Analytics scope. Browser payloads contain no respondent label, response identifier, roster record, raw rating row, or raw written comment.
_Avoid_: Anonymized response card, individual Faculty response review, raw comment drill-through

**Faculty qualitative confidentiality floor**:
Written-feedback analytics require at least five distinct submitted respondents in the currently filtered scope. Below five, word-cloud tokens, ranked terms, prompt counts, per-prompt structure, themes, sentiment, tone bands, qualitative AI evidence, and every qualitative contribution count (submitted/response/item/evaluation counts read as zero) are withheld. At or above five, only identifier-redacted terms mentioned more than once can reach the Faculty browser or AI packet, and per-prompt structure releases only for prompts whose own distinct-response count meets the same five floor — other prompts are withheld rather than partially disclosed.
_Avoid_: Lifetime evaluation threshold, answer-count threshold, singleton term, threshold countdown, exact small-cohort counts, partially disclosed prompt

**Faculty inline AI overview**:
One automatic request rebuilds and re-authorizes the current Faculty filter scope server-side, then resolves a section-keyed interpretation beneath deterministic charts. Validated output may be reused only from a bounded process-local cache keyed by the authorized Faculty user, provider, model and prompt version, and a SHA-256 fingerprint of the complete bounded aggregate evidence packet. Tab-only navigation and reloads reuse unchanged evidence; any aggregate evidence change produces a new fingerprint and provider request. The cache never contains sessions, authorization decisions, response rows, respondent identifiers, roster data, or raw comments, and it is cleared on process restart or deployment. Disabled, insufficient, timeout, and provider-error states never block verified analytics.
_Avoid_: One request per chart, manual first-generation button, TTL-only freshness, shared cross-Faculty cache, persistent AI history, cached authorization, stale interpretation

| Faculty AI cache dimension | Contract |
| --- | --- |
| Key | SHA-256 over prompt version, authorized Faculty user ID, provider base URL, model, and the complete bounded aggregate evidence packet |
| Scope | One Faculty principal and one exact aggregate evidence state; analytics tabs share an entry when their evidence is identical |
| Lifetime | Bounded to 128 validated entries in one application process; cleared on restart or deployment |
| Tags | None; this is not a persistent Next.js Data Cache entry |
| Invalidation triggers | Any packet change, including submitted-response counts, opportunities, distributions, CILO/question aggregates, trends, qualitative tokens, prompt version, provider, or model |
| Authorization boundary | Session, Faculty role, course ownership, and filters are re-authorized and evidence is rebuilt before every lookup |
| Stale behavior | No stale result is served after evidence changes; the new fingerprint waits for one fresh provider result, with concurrent identical requests sharing that call |

## Program Head analytics surface (shipped contract)

**Program Head evidence scope**:
Program-specific Course-bound evidence and Central evidence within the selected authorized Program. General Education Course-bound evidence is excluded from all analytics, response rates, trends, qualitative feedback, filter choices, and response-review links, even when respondents belong to that Program. General Education evidence belongs to the Coordinator college-wide.
_Avoid_: Student Program as General Education evidence authority, General Education contribution to Program Head aggregates

**Program Head analytics tabs**:
Five canonical tabs — `outcomes`, `courses`, `stakeholders`, `trends`, `qualitative` — encoded in URL state by `program-head-analytics-state.ts`. AI insights render inline per view (`ANALYTICS_INSIGHT_VIEWS` in `ai-insight-contract.ts`) instead of a dedicated tab. Unknown or legacy tab keys redirect to their canonical successors; the overview tab redirects to the dashboard; each tab resolves through view-gated reads that re-authorize via `resolveProgramHeadContext` per request. Filter submission uses App Router navigation: the analytics frame and selected controls remain mounted while only the active evidence region presents its tab-shaped loading geometry. A filter fingerprint (comparable-series + filter set) marks previously returned AI insights stale when filters change. The Program Head responses view (`course`, `program-wide` tabs in `program-head-responses-state.ts`) follows the same submission contract: filter and page changes navigate through a transition workspace that preserves the header, tabs, and filter controls while only the evaluation evidence region reloads.
_Avoid_: Legacy seven-tab vocabulary, overview as a landing tab, client-side tab authorization, document reload on filter application, whole-workspace loading replacement

**AI insight freshness**:
The AI insight is a non-persisted, fingerprint-tagged result of the single re-authorizing Server Action; it is recomputed when the filter fingerprint changes. Validated output may be reused from a bounded process-local cache (128 validated entries, cleared on process restart or deployment) keyed by prompt version, scope identity (selected Program and view, or authorized Faculty user), provider base URL, model, and a SHA-256 of the complete serialized evidence packet; concurrent identical requests share one provider call. The cache never holds sessions, authorization decisions, response rows, respondent identifiers, roster data, or raw comments.
_Avoid_: Persisted AI result, stale insight after filter change

## General Education Coordinator evidence (approved scope, issue #477)

**General Education evidence (first release, approved)**:
Course-bound General Education evidence only — submitted `Response.status == SUBMITTED` for Course-bound evaluations where `CourseAssignment.Course.course_scope == GENERAL_EDUCATION`, aggregated across Programs. Central Deployments are excluded from the first Coordinator analytics release. Program-specific Course-bound evidence is excluded from the Coordinator read path.
_Avoid_: Central Deployment as General Education evidence, Program-specific evidence in Coordinator analytics

**Coordinator analytics scope**:
Cross-Program read path gated by the active college-wide General Education Coordinator role. The scope includes submitted General Education Course-bound evidence within the requested academic scope and excludes Program-specific and Central evidence. Program Head analytics retain only Program-specific Course-bound and Program-scoped Central evidence; a respondent's Program membership never widens that scope.
_Avoid_: Selected-Program assumption for Coordinator analytics, ILO-to-PO attainment rollup

**Coordinator analytics workspace**:
URL-filtered `outcomes`, `courses`, `programs`, `trends`, and `qualitative` views over Coordinator evidence, encoded by `general-education-analytics-state.ts` with `outcomes` as the default. Filters are period (`schoolYearId`, `semester`, `termInstanceId`), `courseId`, class-context `programId` (`CourseAssignment.program_id`), `yearLevel`, and `iloId` (selects and scrolls to one ILO row). Programs replaces the Program Head Stakeholders view because Central evidence is excluded. Each view resolves its own re-authorized read beside the shared frame read; the frame and the filter card stay mounted while only the evidence region shows tab-shaped loading geometry. Means retain server precision and are scale-validated against the frozen instrument snapshot; a scope whose valid ratings span more than one scale reports no single mean and keeps per-scale rows. Rating counts remain distinct from submitted response counts. Response-rate denominator is in-scope `EvaluationAssignment` opportunities; zero opportunities reports unavailable rather than `0%`. Payloads are aggregate-only and request-scoped: no raw comments, response rows, respondent IDs, account emails, roster data, or shared cache entry. Authorization is rechecked per request before querying private evidence.
_Avoid_: Raw qualitative text in browser payload, shared cache across Coordinator requests, blended cross-scale course mean, Stakeholders view for General Education

**General Education ILO evidence** (ADR 0035):
Course-bound General Education quantitative evidence connected through a published evaluation's frozen CILO question binding and that CILO's current CILO-to-ILO mappings. Each submitted response item contributes once per `(response, evaluation, question, ILO)`; invalid or out-of-scale ratings are counted as excluded; the row mean pools valid ratings with `spansMultipleScales` disclosure and per-scale distributions, exactly like the Program Head Outcomes PO row. No direct question-to-ILO binding exists, so every contributor is a CILO. Manifestation is descriptive. Valid ratings that reach no ILO are reported as an unlinked count split into general items and CILOs without an ILO mapping. The current-mapping disclosure and the many-to-many disclosure apply, and archived ILOs keep their historical rows. ILO evidence is never labelled attainment.
_Avoid_: ILO attainment, met/achieved ILO, ILO-to-PO rollup, silent drop of unlinked ratings, manifestation-weighted ILO mean

**Coordinator qualitative floor**:
Coordinator written-feedback analytics use the shared deterministic corpus (term prevalence, per-prompt structure, tone bands) and release only identifier-redacted terms mentioned more than once. Raw comments stay in the separately authorized identified review.
_Avoid_: Singleton term in Coordinator browser payload

**Coordinator inline AI insight**:
Each Coordinator view mounts one automatic inline interpretation that rebuilds and re-authorizes the current view evidence server-side through `generateGeneralEducationAnalyticsInsightAction`. The packet carries the view's bounded aggregates plus every applicable disclosure as limitations, and the instruction forbids attainment language, Faculty ranking, and ILO-to-PO inference.
_Avoid_: Client-supplied aggregates, AI attainment verdict, Faculty leaderboard

| Coordinator AI cache dimension | Contract |
| --- | --- |
| Key | SHA-256 over prompt version, authorized Coordinator user ID, provider base URL, model, view, and the complete bounded aggregate evidence packet |
| Scope | One Coordinator principal, one view, one exact aggregate evidence state |
| Lifetime | Bounded to 128 validated entries in one application process; cleared on restart or deployment |
| Tags | None; this is not a persistent Next.js Data Cache entry |
| Invalidation triggers | Any packet change, filter change, prompt version, provider, or model |
| Authorization boundary | Session and Coordinator role are re-authorized and evidence is rebuilt before every lookup |
| Stale behavior | No stale result is served after evidence changes; concurrent identical requests share one provider call |

**Coordinator identified review**:
A separate, authorized response-review flow over General Education Course-bound evidence across Programs. Course breakdowns may link to this flow, but aggregate analytics payloads remain free of respondent identities, raw answers, and comments. The Course scope, not a selected Program or the publisher's role, determines ownership.
_Avoid_: Identity fields in aggregate analytics, Coordinator Central review, publisher-owned evidence

**Deferred**: ILO attainment (targets, thresholds, met/not met), the ILO-to-PO crosswalk, and Central Deployment General Education analytics. ADR 0035 brings ILO evidence into scope without these. ILO catalog ownership is `GEN_ED_COORDINATOR` college-wide (ADR 0018).
_Avoid_: ILO attainment claim, Central General Education analytics

## Evidence language

**Analytics evidence**:
Submitted-response aggregates and qualitative summaries used to inspect perceived or stakeholder-rated attainment within an explicitly selected Program and academic scope. Analytics evidence is not an individual student mastery record, grade, or transcript.
_Avoid_: Student performance, mastery score, grade result

**Evaluation opportunity**:
An in-scope `EvaluationAssignment` created for a respondent and deployment. Evaluation opportunities form the historical denominator for response-rate reporting.
_Avoid_: Current roster eligibility, live pending count, respondent total

**Response rate**:
The proportion of submitted responses among in-scope evaluation opportunities. A scope with no opportunities has no response rate rather than a zero-percent response rate.
_Avoid_: Completion percentage when the denominator is unspecified

**Evidence source**:
The origin and construct context of evaluation evidence: course-bound student evidence or central-deployment evidence for central student respondents, alumni, or industry partners. Evidence sources are not interchangeable merely because they use rating values.
_Avoid_: Stakeholder pool when source and instrument differences matter

**Course-bound student evidence**:
Evaluation evidence produced by a Course-bound evaluation of course learning outcomes for assigned Students. It is distinct from central student-respondent evidence.
_Avoid_: Student evidence when the central/course-bound distinction matters

**Central student-respondent evidence**:
Evidence from a Central Deployment targeting `STUDENT`, such as a program-wide or exit instrument. It is distinct from Course-bound student evidence.
_Avoid_: Course evaluation evidence

**Evidence-source labels**:
The canonical four-bucket evidence-source vocabulary shared by dashboard cards: `COURSE_STUDENT`, `CENTRAL_STUDENT`, `ALUMNI`, and `INDUSTRY_PARTNER`. Sources are never pooled merely because their rating scales match.
_Avoid_: Pooling sources by rating-scale compatibility

**Source-separation disclosure**:
The Stakeholders-view notice that evidence sources use different instruments and respondent populations, so sources are kept separate and never combined into one construct.
_Avoid_: Cross-source mean combination

**Trend comparability fingerprint**:
The period identity that permits adjacent mean-rating points to join only when instrument versions, each response source's instrument-version mix, scale identities, mapped outcomes, and the normalized source composition of rating-bearing responses match. Submitted-response counts still include every submitted response; unrated responses do not define the population behind a plotted mean.
_Avoid_: Unrelated source and instrument sets, all-submitted source mix, cross-population trend, raw-count equality

**Qualitative pulse**:
The dashboard card of aggregate qualitative evidence — respondent, answer, and evaluation counts plus per-source counts — with identifier-redacted word-cloud tokens capped at `QUALITATIVE_TOKEN_CAP = 60`. Raw comments never leave the Responses data.
_Avoid_: Raw comment text on the dashboard

## Outcome evidence

**Program PO evidence**:
Course-bound quantitative evidence connected either through a frozen direct question-to-PO publication binding or through a published evaluation's CILO question binding and that CILO's current PO mapping in the selected Program. Each submitted response item contributes once per `(response, evaluation, question, PO)`, even when both paths name the same PO. Institutional Outcome evidence is not Program PO evidence.
_Avoid_: Universal outcome attainment, duplicate direct-plus-CILO contribution, ILO-to-PO evidence

**Question identity encoding**:
`analytics/aggregators/question-identity` owns every canonical identity key: the `(section, item)` question tuple, the evaluation-scoped binding tuple, and the `(response, evaluation, question, PO)` contribution tuple. Section and item keys are arbitrary nonempty strings, so each is a structurally encoded tuple rather than a separator join — a separator join would merge `(a, b:c)` with `(a:b, c)`, giving one question the other's prompt, binding, and pooled mean. Analytics, Responses, Instruments, Evaluations, and Response Review all key through these helpers, so a question keeps one identity across authoring, publication, answering, and review.
_Avoid_: Separator-joined question keys, per-feature encoder copies, reusing the question tuple where a contribution needs its response and PO components

**Current-mapping interpretation**:
The grouping of historical Course-bound ratings by the selected Program's current CILO-to-PO mappings when publication-time mapping rows were not snapshotted. This interpretation carries an explicit historical limitation and does not rewrite the underlying response.
_Avoid_: Publication-time PO result, immutable historical mapping result

**Current-mapping disclosure**:
The user-facing notice that historical ratings group by the Program's current CILO-to-PO mappings because publication-time mapping snapshots are not yet available, so later mapping edits reinterpret history. The same notice is forwarded into AI limitations.
_Avoid_: Publication-time mapping guarantee

**Many-to-many disclosure**:
Shown when a CILO maps to more than one selected-Program PO. Each rating contributes once per mapped PO, so outcome rows are not additive across POs.
_Avoid_: Summing ratings across PO rows

**Spans multiple scales**:
A flag set when a pooled mean would combine ratings from more than one instrument-version scale identity. Scales stay reported separately rather than merged.
_Avoid_: Single blended mean across scale identities

**Excluded rating count**:
Ratings dropped from a valid aggregate because scale resolution failed or the rating value fell outside the scale.
_Avoid_: Treating excluded ratings as valid aggregate input

**Program Head Outcomes PO row**:
The Outcomes view's course-bound PO row is a Program Head evidence surface, not a bare metric. It carries per-contributor provenance (each CILO and each direct question with its own rating count and mean), the frozen publication manifestation label, contributing Courses and CILOs, the contributing evaluations with their review links, the many-to-many and current-mapping disclosures, and scale-separated distributions. Its `meanRating` pools every valid in-scale rating across the row and sets `spansMultipleScales`, and the view prints the cross-scale comparability notice beside that number. The shared `buildCourseDerivedPoMetrics` metric is the wrong shape for this surface: it has no provenance fields and reports `mean: null` for mixed scales, so adopting it would delete evidence and change a rendered mean. Counting rules are shared in practice and pinned by test, so the two agree on contributions, overlap collapse, invalid ratings, and unmapped rows.
_Avoid_: Bare metric as the Outcomes row, mixed-scale mean as null on the Outcomes row, provenance-free Outcome row

## Outcome attainment interpretation (ADR 0037)

**Canonical outcome attainment interpretation policy (`CLOIE_OUTCOME_MEAN_V1`)**:
Proposed institutional policy governing the deterministic classification and Continuous Quality Improvement (CQI) categorization of full-precision CILO and PO means on approved 5-point rating scales. Informed by OBE/CQI assessment practices; not an external mandate from CHED, ABET, or PAASCU. Institutional approval is unrecorded and the policy retains proposed status.
- Primary attainment benchmark: `mean >= 3.50`.
- Bands:
  - `4.50–5.00`: Fully Attained (Meets Benchmark)
  - `3.50–below 4.50`: Attained (Meets Benchmark)
  - `2.50–below 3.50`: Partially Attained (Needs Attention)
  - `1.50–below 2.50`: Slightly Attained (Below Benchmark)
  - `1.00–below 1.50`: Not Attained (Below Benchmark)
- Classification operates on full-precision floating-point means; rounding occurs only for display. Boundary values belong to the upper band (e.g. 3.50 is Attained).
- Three frozen 5-point descriptor sets are supported: direct achievement (`Not Achieved`..`Fully Achieved`), agreement (`Strongly Disagree`..`Strongly Agree`), and performance evaluation (`Poor`..`Excellent`).
- Agreement and performance scales carry `isIndirect: true` to indicate stakeholder perception rather than demonstrated competency.
- Missing evidence (`no-evidence`), unsupported scales (`unsupported-scale`), and mixed-scale pools (`mixed-scales`) remain distinct and never produce attainment labels; they are strictly distinguished from non-attainment (`Not Attained`).
- Generic course means, overall stakeholder means, and Institutional Learning Outcomes (ILOs) are never classified as outcome attainment (ADR 0035).
_Avoid_: Claiming external mandate, classifying unapproved scales, treating missing evidence as non-attainment, rounding before classifying, labelling ILOs as attained

## AI-assisted interpretation

**AI-assisted interpretation**:
A supplementary, bounded interpretation of authorized Analytics evidence that does not replace deterministic metrics or the Program Head's human CQI judgment. In development and testing, the provider receives a bounded aggregate packet of server-computed means, distributions, counts, source labels, trend summaries, limitations, applied filter facets, and deterministic qualitative structure (identifier-redacted term prevalence, per-prompt structure, tone band counts) — response rows, raw comment text, sentences, and excerpts never cross the boundary; rows are capped and the serialized packet is budgeted. The provider may report the deterministic tone distribution as figures under its stated rule; its own sentiment, tone, satisfaction, and quality verdicts stay banned. Raw qualitative text is never returned to the analytics browser surface or persisted as an AI result. Production enablement remains a separate governance decision.
_Avoid_: AI decision, automatic CQI plan, AI grading, chatbot

**AI evidence packet**:
The bounded aggregate projection sent to the OpenAI-compatible provider — capped rows, clamped strings, rounded aggregates, and character-budgeted serialization. Qualitative evidence crosses only as deterministic structure: identifier-redacted term prevalence (term, mentions, distinct responses), per-prompt structure kept separate by evidence source and instrument version (item/response counts, top terms, tone bands, instrument label), a deterministic sentiment distribution (band counts and the scored total), and applied filter facets (evidence source, stakeholder, period label). Each prompt row also carries the stable instrument identity, so browser rows reconcile by identity and a label two distinct instruments share is qualified rather than published twice. It contains no raw comments, sentences, excerpts, response identifiers, or respondent identifiers.
_Avoid_: Raw response content in provider requests

**Qualitative term prevalence**:
The identifier-redacted term, its total mentions, and the count of distinct responses containing it, ordered by mentions descending, then distinct responses descending, then locale order.
_Avoid_: Raw comment quotation, respondent-linked term

**Qualitative tone shape**:
The deterministic winkNLP bundled-lexicon score banded at ±0.2 into positive, neutral, or negative, emitted as band counts and the scored total only, with the rule disclosed in the product and in every AI limitation. The lexicon misses sarcasm and some negation patterns and averages mixed praise and criticism into one score.
_Avoid_: Provider-judged sentiment, tone verdict without the stated rule

**Qualitative evidence tier**:
Deterministic qualitative structure ships to the provider; verbatim de-identified excerpts remain unshipped per ADR 0016/0023 with no schema migration.
_Avoid_: Verbatim excerpt in the provider packet, provider-reproduced respondent text
