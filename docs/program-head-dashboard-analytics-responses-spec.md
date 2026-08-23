# Program Head dashboard, analytics, and responses implementation spec

**Status:** Draft  
**Scope:** Program Head dashboard, analytics, responses, evaluation drilldowns, and individual submitted response review  
**Primary visual reference:** `system-cloie-program-head-hifi-prototype-v2-fixed.html`  
**Primary code reference:** current System CLOIE repository  
**Visual authority:** `design.md`

**Review resolutions (2026-08-24):**

- Eligible assignment = any in-scope `EvaluationAssignment` row. Exclusion ledgers do not affect Program Head metrics (§5.12).
- Manifestations remain descriptive labels; all mapped ratings contribute to PLO means; no numeric weights (§7).
- Needs attention uses three concrete rules; the low-evidence heuristic is dropped (§13.9).
- Filter state couples stakeholder to evidence source; the stakeholder control hides for Course source (§15).
- Upward navigation preserves period, source, stakeholder, and `ploId`; class-level filters reset (§12).
- Visual regression is deferred; Playwright journeys and the DB-integration CI job stay in scope (§52, §62).
- Identified-response access is not separately audit-logged in v1.
- The prototype's Analytics "Export view" action is out of scope.
---

## 1. Purpose

This change refactors the Program Head's Dashboard, Analytics, and response-review experience into one coherent evidence workflow.

The target user journey is:

```text
Dashboard
  -> Analytics
  -> Evaluation evidence
  -> Submitted responses
  -> Individual respondent
  -> Exact question and answer
```

The reverse journey must also work:

```text
Exact answer
  -> Question
  -> CILO or direct PLO binding
  -> Course / PLO / stakeholder aggregate
  -> Analytics
  -> Dashboard
```

The implementation should make every important analytical number traceable. A Program Head should be able to answer:

1. What does this number measure?
2. Which evidence source produced it?
3. Which population was included?
4. How was it calculated?
5. How many assignments, responses, and ratings contributed?
6. Which scale was used?
7. Which evaluations, questions, CILOs, PLOs, or respondents produced it?
8. Where can the Program Head inspect the underlying submitted answers?

The prototype defines the intended front-facing hierarchy and interaction. This specification defines the behavior, calculation contracts, authorization boundaries, service responsibilities, data requirements, tests, and implementation constraints.

---

## 2. Current-state summary

The existing Program Head dashboard currently exposes six KPIs:

- Submitted Responses
- Evaluation Opportunities
- Rating Count
- Mean Rating
- Pending Responses
- Active Deployments

It also renders stakeholder mean comparison and a qualitative word cloud.

The existing Analytics area contains:

- Overview
- Outcomes
- Stakeholders
- Breakdowns
- Trends
- Feedback
- AI

Course-bound review already exists under `cilo-reviews`, including evaluation detail and individual response routes.

The current system therefore has many of the required domain pieces, but the user journey is fragmented. Dashboard and Analytics overlap, current metric labels are too vague, Program-wide PLO evidence needs to be integrated more clearly, and response review does not yet provide the full Program Head-specific identified evidence workflow required here.

This implementation should refactor existing capability rather than build a second analytics system.

---

## 3. Goals

### 3.1 Product goals

The implementation must:

- make Dashboard the operational summary;
- make Analytics the evidence-exploration workspace;
- make Responses the canonical evidence browser;
- allow Program Heads to inspect identified submitted responses;
- preserve faculty restrictions outside this scope;
- distinguish evaluation quantitative means from CILO and PLO means;
- separate stakeholder and evidence-source results;
- make major, year, section, faculty, and course context available where meaningful;
- preserve exact scale identity;
- make qualitative feedback provenance visible;
- provide traceability in both directions;
- use shared deterministic calculations across every surface;
- support responsive, keyboard-accessible, production-grade UI.

### 3.2 Engineering goals

The implementation should:

- reuse the existing Next.js App Router modular monolith;
- reuse Program Head scope authorization;
- use Server Components for authorized reads where practical;
- keep chart client boundaries narrow;
- use Recharts only;
- reuse the existing System CLOIE shell and UI primitives;
- avoid unnecessary schema changes;
- avoid duplicate metric logic;
- add integration and browser testing for the complete evidence journey.

---

## 4. Non-goals

The following are explicitly deferred:

- simple linear regression;
- correlation analysis;
- predictive analytics;
- automated intervention recommendations;
- arbitrary stakeholder weighting;
- one combined Program-wide PLO score across Course, Alumni, Industry, and other sources;
- new attainment thresholds or interpretation bands;
- red/green academic performance classification;
- direct assessment data such as grades, exams, capstone rubrics, or LMS scores;
- faculty access redesign;
- Dean analytics redesign;
- persisted analytics snapshots unless later performance testing proves they are needed;
- historical course CILO-to-PLO mapping snapshots;
- a new chart library;
- a separate analytics backend service.

---

## 5. Terminology and metric contract

Consistent naming is required across services, DTOs, tests, charts, and copy.

### 5.1 Evaluation assignment

One respondent's opportunity to complete one evaluation.

### 5.2 Submitted response

A response with `status = SUBMITTED`.

`IN_PROGRESS` represents a started response.

`Not started` is derived from an eligible assignment that has no response row.

### 5.3 Rating

One valid quantitative answer value.

One response can contain multiple ratings.

### 5.4 Response quantitative mean

Mean of all valid quantitative answers in one submitted response.

### 5.5 Evaluation quantitative mean

Mean of all valid quantitative ratings in one evaluation deployment.

This includes CILO-bound and unbound quantitative questions.

### 5.6 Question mean

Mean of all valid submitted ratings for one quantitative question.

### 5.7 CILO mean

Mean of valid ratings from quantitative questions explicitly bound to that CILO.

### 5.8 Course-derived PLO mean

Mean of eligible course-bound ratings that reach a PLO through:

```text
Question
  -> CILO binding
  -> CILO
  -> CILO-to-PLO mapping
  -> PLO
```

### 5.9 Program-wide PLO mean

Mean of valid ratings from Program-wide quantitative questions directly bound to a PLO through the published deployment PLO snapshot.

### 5.10 Rating count

Number of quantitative answer items included in a metric.

### 5.11 Response count

Number of distinct submitted responses contributing at least one relevant answer.

### 5.12 Assignment count

Number of evaluation opportunity rows in scope: every `EvaluationAssignment` row for the selected Program and academic period. No roster-eligibility or exclusion filtering is applied on Program Head surfaces.

These three counts must remain distinct.

---

## 6. Quantitative calculation rules

These rules are implementation contracts.

### 6.1 Response quantitative mean

```text
sum of all valid quantitative answers in the response
/
number of valid quantitative answers in the response
```

Includes:

- CILO-bound quantitative items;
- general unbound quantitative items.

Excludes:

- qualitative answers.

### 6.2 Evaluation quantitative mean

```text
sum of all valid quantitative ratings from submitted responses
/
number of those ratings
```

Do not calculate this as the average of response means.

### 6.3 Question mean

```text
sum of valid ratings for the question
/
rating count for that question
```

### 6.4 CILO mean

```text
sum of ratings from questions bound to this CILO
/
number of those ratings
```

If multiple questions bind to one CILO, aggregate the raw ratings.

Do not calculate a simple mean of question means.

### 6.5 Unbound quantitative questions

Unbound quantitative questions:

- contribute to Response quantitative mean;
- contribute to Evaluation quantitative mean;
- contribute to section means where relevant;
- do not contribute to CILO means;
- do not contribute to course-derived PLO means.

UI label:

```text
General evaluation item
```

### 6.6 Distribution reconciliation

For every Likert metric:

```text
sum(distribution counts) = ratingCount
```

The weighted mean reconstructed from the category counts must equal the metric mean within floating-point tolerance.

Displayed percentages may differ slightly from exactly 100 due only to presentation rounding.

### 6.7 Precision

Services should keep full numeric precision.

Round only at the presentation boundary.

---

## 7. CILO-to-PLO manifestation rules

Existing manifestation values:

- `LEARNING`
- `PRACTICE`
- `OPPORTUNITY`

For this implementation, manifestations are descriptive labels only. Wherever a mapping is displayed (evaluation details, CILO tables, evidence tables, trace UI), the manifestation badge is shown as context.

Every valid rating from a CILO-bound quantitative question contributes to each mapped PLO regardless of manifestation, matching current production aggregation. Manifestations never become numeric weights, and they never filter contributions.

Do not implement:

```text
Learning = 1
Practice = 2
Opportunity = 3
```

or any other implied weighting.

Excluding Opportunity-mapped ratings from PLO means was considered in the 2026-08-24 review and rejected: it would restate published history and complicate aggregation for no v1 benefit. Revisit only if academic policy formally distinguishes manifestations; the upgrade path is a single manifestation predicate in the course-derived PLO aggregator.

---

## 8. Evidence-source separation

Results must remain separated by evidence source.

Primary sources:

- Course evaluations;
- Program-wide student evaluations;
- Alumni evaluations;
- Industry Partner evaluations.

Do not create one global PLO mean or one global stakeholder mean from these sources.

Compact surfaces may display the sources side by side.

Detailed surfaces may compare them.

They must not be silently pooled.

---

## 9. Scale identity

Numeric values alone do not define scale compatibility.

Scale identity includes:

- minimum value;
- maximum value;
- label for each rating value;
- instrument context when needed.

Two `1..5` scales with different labels are not assumed compatible.

If a result spans incompatible scales:

- do not produce one mean;
- show separate scale groups;
- compact UI may show `Multiple scales`;
- detailed UI shows each scale's distribution and counts.

No normalization to 0-100 is part of this change.

---

# 10. Navigation

Selected Program navigation should become:

```text
Dashboard
Courses
Curricula
Course Assignments
Outcomes
Tools

Responses
Analytics
Reports

Profile
```

Responses becomes a first-class Program Head destination.

Navigation definitions must remain centralized in the existing navigation constants.

---

# 11. Canonical routes

Add:

```text
/program-head/programs/[programId]/responses

/program-head/programs/[programId]/responses/course/[evaluationId]

/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]

/program-head/programs/[programId]/responses/program-wide/[deploymentId]

/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]
```

Existing Program Head `cilo-reviews` routes should redirect to equivalent canonical Responses routes when mapping is unambiguous.

Update the existing Program Head route helper module. Do not hand-build URLs in components.

---

# 12. Breadcrumbs

Required examples:

```text
Dashboard
```

```text
Analytics > Outcomes
```

```text
Analytics > Outcomes > PLO 2
```

```text
Responses > Course evaluations
```

```text
Responses > Course evaluations > EDUC 7 · Morning
```

```text
Responses > Course evaluations > EDUC 7 · Morning > Maria Santos
```

```text
Responses > Program-wide evaluations > Alumni Survey
```

Upward navigation preserves academic period, evidence source, stakeholder, and `ploId` where meaningful. Class-level filters (course, faculty, major, year level, section) reset to defaults.

---

# 13. Dashboard

Dashboard answers:

> What is happening in this evaluation cycle, and what needs attention?

It should not duplicate full Analytics.

## 13.1 Header

Display:

- Dashboard title;
- selected Program;
- selected/active academic period;
- `View Responses`;
- `Open Analytics`.

Academic period selection applies to every Dashboard metric.

Default to the active academic period.

## 13.2 KPI card: Response completion

Primary:

```text
78%
312 of 400 eligible evaluation assignments submitted
```

Calculation:

```text
submitted eligible assignments / eligible assignments
```

Eligible follows §5.12: every in-scope assignment row counts, regardless of any exclusion record.
Provide an accessible details popover containing stakeholder breakdown:

```text
Students             265 / 340   77.9%
Alumni                27 / 35    77.1%
Industry Partners     20 / 25    80.0%
```

Do not use registered Program population as denominator.

## 13.3 KPI card: Respondents

Example:

```text
231 respondents
184 complete
31 partial
16 not started
```

Definitions:

**Complete**

Every in-scope eligible assignment for that person is submitted.

**Partial**

At least one eligible assignment is started or submitted, but not all are submitted.

**Not started**

None of the person's eligible assignments has a response.

This is distinct from assignment-level completion.

## 13.4 KPI card: Active evaluations

Example:

```text
12 active evaluations
3 close within 7 days
```

Include relevant Course and Program-wide deployments.

Click opens Responses with relevant status filter.

## 13.5 KPI card: Quantitative results

Do not display one global mean.

Show source-specific summary:

```text
Course evaluations              4.18 / 5
Program-wide students           4.07 / 5
Alumni                          4.23 / 5
Industry Partners               3.96 / 5
```

If a source spans incompatible scales, show `Multiple scales`.

## 13.6 Response progress by stakeholder

Use 100% horizontal stacked bars.

Segments:

- Submitted;
- In progress;
- Not started.

Each row displays:

- stakeholder;
- completion percentage;
- submitted / assigned raw count.

Tooltip/focus details expose exact segment counts.

Clicking a row opens Analytics > Stakeholders scoped to that stakeholder.

## 13.7 Quick actions

Include:

- View Responses;
- Explore Analytics;
- Manage Course Assignments;
- Manage Learning Outcomes.

## 13.8 PLO summary

Evidence source selector:

```text
Course CILO
Program-wide students
Alumni
Industry
```

Show one source at a time.

For each PLO:

- code;
- compact horizontal bar or dot-bar;
- mean;
- details control.

Details expose:

- rating count;
- response count;
- evaluation count;
- contributing CILO count or directly bound question count.

Click opens Analytics > Outcomes with period, source, and PLO preserved.

Do not show attainment status.

## 13.9 Needs attention

Operational facts only.

Concrete rules (period-scoped, selected Program):

- an ACTIVE deployment whose deadline is within 7 days;
- an ACTIVE deployment with zero submitted responses;
- a PLO with zero ratings for the selected evidence source in the period.

Do not classify academic performance without an approved rule.

## 13.10 Qualitative pulse

Show:

- qualitative respondents;
- qualitative answers;
- contributing evaluations;
- source chips;
- word cloud;
- top-word count slider;
- link to Qualitative Analytics.

Slider range:

```text
10 to 60 words
```

Slider changes only client-side visible token count when the server already returned the bounded token list.

---

# 14. Analytics information architecture

Replace current tabs:

```text
Overview
Outcomes
Stakeholders
Breakdowns
Trends
Feedback
AI
```

with:

```text
Outcomes
Courses
Stakeholders
Trends
Qualitative
AI Insights
```

Compatibility:

```text
overview -> Dashboard
breakdowns -> courses
feedback -> qualitative
```

---

# 15. Analytics filter state

Candidate URL state:

```ts
type ProgramHeadAnalyticsFilterState = {
  tab:
    | "outcomes"
    | "courses"
    | "stakeholders"
    | "trends"
    | "qualitative"
    | "ai";

  termInstanceId?: string;

  evidenceSource?:
    | "COURSE"
    | "PROGRAM_WIDE_STUDENT"
    | "ALUMNI"
    | "INDUSTRY";

  stakeholder?: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";

  majorId?: string;
  yearLevel?: YearLevel;

  courseId?: string;
  facultyId?: string;
  section?: StudentSection;

  ploId?: string;
  evaluationId?: string;
};
```

Rules:

- state lives in search params;
- invalid state is sanitized;
- browser back/forward must work;
- switching tabs preserves compatible filters;
- changing source drops incompatible filters;
- evidence source is the primary axis; the stakeholder control is hidden when source is `COURSE` (course evaluations are answered by students);
- changing evidence source silently drops an incompatible stakeholder value;
- major controls disappear for Programs without majors;
- year-level controls appear only where meaningful.

---

# 16. Analytics: Outcomes tab

Purpose:

> Explain Program Learning Outcome evidence and where it comes from.

## 16.1 PLO comparison chart

Use horizontal bars or dot-bars.

Default order:

```text
Institutional PLO order
```

Optional sort:

- institutional order;
- highest mean;
- lowest mean;
- most evidence;
- least evidence.

Each row includes the exact mean.

## 16.2 Selected PLO summary

Show:

- PLO code;
- description;
- evidence source;
- scale;
- mean;
- rating count;
- response count;
- evaluation count;
- question count;
- contributing CILO count when Course evidence.

## 16.3 Likert distribution

Use a 100% stacked Likert bar.

Every rating category provides:

- rating value;
- label;
- count;
- percentage.

Provide expandable exact-values table.

Example:

| Rating | Label | Count | Share |
|---:|---|---:|---:|
| 1 | ... | 2 | 2% |
| 2 | ... | 5 | 5% |
| 3 | ... | 11 | 11% |
| 4 | ... | 34 | 34% |
| 5 | ... | 48 | 48% |

The mean displayed above must derive from these same counts.

## 16.4 PLO evidence coverage matrix

Rows:

- PLOs.

Columns:

- Course CILO;
- Program-wide students;
- Alumni;
- Industry.

Each cell shows or exposes:

- rating count;
- response count.

Clicking a cell selects that PLO and source.

The matrix communicates evidence volume, not attainment.

## 16.5 Course-derived evidence table

Columns:

| Course assignment | CILO | Mapping | Bound question | Ratings | Responses | Mean | Action |
|---|---|---|---|---:|---:|---:|---|

Course assignment identity includes:

- Course;
- Faculty;
- Year level;
- Section;
- Major where relevant.

Do not merge classes because course code matches.

## 16.6 Program-wide evidence table

Columns:

| Evaluation | Stakeholder | Bound question | Ratings | Responses | Mean | Action |
|---|---|---|---:|---:|---:|---|

Use publication-time `CentralDeploymentPloSnapshot` to trace the exact question.

---

# 17. Analytics: Courses tab

Purpose:

> Compare actual class assignments and inspect course evaluation evidence.

Unit of analysis:

```text
course + faculty + term + year level + section
```

Filters:

- search;
- Course;
- Faculty;
- Major;
- Year level;
- Section.

Table:

| Course assignment | Faculty | Class | Major | Completion | Evaluation quantitative mean | Status |
|---|---|---|---|---:|---:|---|

Selecting a row shows:

- participation;
- Evaluation quantitative mean;
- CILO results;
- question results;
- Likert distributions;
- qualitative summary;
- `View underlying responses`.

Do not create one generic CILO mean for the class summary. Show CILOs individually in detail.

---

# 18. Analytics: Stakeholders tab

Purpose:

> Compare participation and evidence results across respondent groups.

## 18.1 Completion by stakeholder

100% horizontal stacked bars for:

- Students;
- Alumni;
- Industry Partners.

Expose:

- assigned;
- submitted;
- in progress;
- not started;
- completion rate.

## 18.2 Quantitative results by evidence source

Show separate source means.

Exact table:

| Evidence source | Scale | Responses | Ratings | Mean |
|---|---|---:|---:|---:|

Do not pool Course students and Program-wide students automatically.

## 18.3 Major completion

For Programs with majors:

horizontal percentage bars.

## 18.4 Major quantitative mean

Separate dot plot or horizontal bar chart.

Do not use a dual-axis chart.

## 18.5 Major table

| Major | Students | Assigned | Submitted | Completion | Mean |
|---|---:|---:|---:|---:|---:|

For student evidence, major attribution should come from the respondent's `StudentEnrollment` in the relevant term.

If unavailable, show `Unspecified`.

---

# 19. Analytics: Trends tab

Purpose:

> Show how a selected metric changes over academic periods.

Metric selector:

- source quantitative mean;
- response completion;
- selected PLO mean.

Use a line chart.

Every point represents one academic period.

Provide exact table below:

| Period | Mean / Rate | Responses | Ratings | Instrument | Scale |
|---|---:|---:|---:|---|---|

Preserve existing comparability safeguards.

If adjacent periods are not comparable because instrument version, scale identity, or mapped outcome identity changed:

- break the line;
- show the reason;
- do not show a misleading delta.

---

# 20. Analytics: Qualitative tab

Purpose:

> Show recurring qualitative patterns and their provenance.

Filters:

- academic period;
- source;
- stakeholder;
- major;
- year level;
- evaluation.

For Course evidence also allow:

- Course;
- Faculty;
- Section.

Only show valid controls for the selected context.

## 20.1 Summary

Show:

- qualitative respondent count;
- qualitative answer count;
- contributing evaluation count.

## 20.2 Source distribution

Horizontal bars:

- Course evaluations;
- Program-wide students;
- Alumni;
- Industry.

Metric:

```text
qualitative answer count
```

## 20.3 Prompt distribution

Show exact qualitative prompts and answer count.

Do not merge every qualitative prompt into one undifferentiated corpus without retaining prompt provenance.

## 20.4 Word cloud

Use existing tokenization and identifier-redaction logic.

Word size represents token frequency.

## 20.5 Top terms table

| Term | Mentions | Responses containing term |
|---|---:|---:|

`Mentions` and `Responses containing term` are separate metrics.

## 20.6 Raw evidence

Provide:

```text
View contributing responses
```

Navigate to Responses using equivalent filter context.

Do not make Analytics the primary raw-comment browser.

---

# 21. Analytics: AI Insights

Keep existing aggregate-only AI boundary.

Do not send:

- names;
- emails;
- respondent IDs;
- response IDs;
- raw comments;
- authentication context.

AI receives server-computed aggregate evidence.

Output remains:

- possible strengths;
- areas worth reviewing;
- recurring themes;
- questions for human review;
- evidence considered;
- limitations.

AI does not determine attainment or curriculum actions.

---

# 22. Responses landing page

Purpose:

> Browse the evaluations and submitted evidence behind Analytics.

Primary tabs:

```text
Course evaluations
Program-wide evaluations
```

The first level is an evaluation deployment, not a respondent list.

---

# 23. Responses: Course evaluations

Filters:

- academic period;
- search;
- Course;
- Faculty;
- Major;
- Year level;
- Section;
- Status;
- Completion.

Search covers:

- course code;
- course title;
- evaluation title;
- faculty name.

Table:

| Evaluation | Class | Faculty | Period | Status | Responses | Evaluation quantitative mean |
|---|---|---|---|---|---:|---:|

Include zero-response evaluations.

Use server-side pagination and filtering.

Same course with different Faculty or Section must appear as different rows.

---

# 24. Responses: Program-wide evaluations

Filters:

- academic period;
- search;
- stakeholder;
- major;
- year level;
- status;
- completion;
- evaluation/instrument.

Table:

| Evaluation | Stakeholder | Target | Period | Status | Responses | Evaluation quantitative mean |
|---|---|---|---|---|---:|---:|

Do not show Faculty or Section filters when the domain does not support them.

---

# 25. Course evaluation detail

Header:

- evaluation title;
- Course code;
- Course title;
- Faculty;
- Year level;
- Section;
- Major scope where meaningful;
- academic period;
- activation date;
- deadline;
- status.

Summary:

- submitted / eligible;
- completion percentage;
- Evaluation quantitative mean;
- CILO count / CILO evidence summary;
- qualitative answer count;
- qualitative respondent count.

## 25.1 CILO results

Table:

| CILO | Description | PLO mappings | Ratings | Responses | Mean |
|---|---|---|---:|---:|---:|

PLO mappings display manifestation.

Only CILO-bound questions contribute.

## 25.2 Question results

Table:

| Item | Question | Outcome binding | Mean | Ratings | Distribution |
|---|---|---|---:|---:|---|

Outcome binding:

```text
CILO 1
```

or:

```text
General evaluation item
```

Question distribution and mean must reconcile.

## 25.3 Qualitative summary

Show:

- qualitative answer count;
- respondent count;
- prompt breakdown;
- top terms;
- compact term visualization;
- link to Qualitative Analytics.

## 25.4 Participation

Show:

- eligible;
- submitted;
- in progress;
- not started.

Invariant:

```text
submitted + in progress + not started = eligible
```

## 25.5 Submitted respondents

Program Head gets identified submitted-response access.

Table:

| Respondent | Major | Year | Section | Submitted | Response quantitative mean |
|---|---|---|---|---|---:|

Click opens individual response detail.

Do not expose in-progress answer content.

---

# 26. Program-wide evaluation detail

Use the same overall hierarchy as Course detail.

Header:

- evaluation;
- stakeholder;
- target Program;
- target Major if any;
- target Year if any;
- instrument version;
- academic period;
- activation;
- deadline;
- status.

Summary:

- submitted / assigned;
- completion;
- Evaluation quantitative mean;
- qualitative count.

Sections:

- direct PLO results;
- question results;
- Likert distributions;
- qualitative summary;
- submitted respondents.

Direct PLO evidence uses the publication-time PLO snapshot.

---

# 27. Individual response detail

Program Head can inspect exact submitted answers.

## 27.1 Student identity

Display:

- name;
- Program;
- Major;
- Year level;
- Section;
- Course;
- Faculty;
- evaluation;
- submission time.

Student academic context must come from the `StudentEnrollment` for the evaluation's term.

Do not use current enrollment for an old response.

## 27.2 Alumni context

Display available:

- name;
- Program;
- Major;
- graduation year.

## 27.3 Industry context

Display available:

- name;
- company;
- position.

## 27.4 Quantitative answers

For each answer show:

- section;
- question;
- selected numeric value;
- scale label;
- CILO binding when present;
- PLO mapping when present;
- manifestation when applicable;
- `General evaluation item` when unbound.

Show:

```text
Response quantitative mean
```

with helper text:

```text
Calculated from all valid quantitative answers in this submitted response.
```

## 27.5 Qualitative answers

Display complete submitted text.

## 27.6 Upward trace links

Examples:

- View evaluation results;
- View Course analytics;
- View CILO analytics;
- View PLO analytics.

---

# 28. Program Head identity access and privacy

This change explicitly gives Program Heads access to identified submitted responses.

Faculty access is not changed.

Required product boundary:

```text
Dashboard / Analytics
Aggregate evidence

Program Head Responses
Authorized identified submitted-response review

Faculty analytics/review
No identified student response access

AI Insights
Aggregate-only evidence
```

Review legal/privacy copy so it does not claim complete anonymity if authorized Program Heads can identify respondents.

This is a documentation and policy alignment task in addition to code.

---

# 29. Authorization

Every Program Head read must validate Program scope on the server.

Existing Program Head context resolution should remain the main authorization boundary.

Identified response flow:

```text
Authenticate
  -> require PROGRAM_HEAD
  -> resolve selected Program authorization
  -> load requested evaluation/response
  -> verify resource belongs to selected Program
  -> require SUBMITTED before returning answer body
  -> return Program Head-specific DTO
```

Required failures:

- Program Head A cannot inspect Program B;
- guessed response IDs do not disclose cross-Program data;
- Faculty cannot access Program Head response routes;
- unauthenticated access fails;
- in-progress response body is not returned;
- filters cannot escape Program scope.

Client-side filtering is never authorization.

---

# 30. Frontend architecture

System CLOIE remains a Next.js App Router modular monolith.

## 30.1 Server Components

Prefer Server Components for:

- Dashboard page;
- Analytics page orchestration;
- Responses lists;
- Evaluation detail;
- Individual response detail;
- authorized data loading;
- filter option loading.

## 30.2 Client Components

Use client components for:

- Recharts;
- chart tooltips;
- interactive filters;
- Analytics tabs when needed;
- mobile filter drawer;
- PLO evidence matrix interactions;
- word-count slider;
- pagination;
- details popovers.

Do not create a browser API layer merely to read data already available to the RSC.

---

# 31. Feature/module boundaries

Keep aggregate logic under:

```text
src/features/analytics/
```

Program Head identified response review should use a distinct boundary, for example:

```text
src/features/response-review/
  components/
  services/
  schemas/
  types.ts
```

If existing review modules are extended instead, Program Head-specific identified DTOs must still remain separate from Faculty/anonymized DTOs.

Never add respondent identity fields to a shared DTO consumed by Faculty.

---

# 32. Route layer changes

Likely routes:

```text
src/app/(app)/program-head/programs/[programId]/dashboard/page.tsx

src/app/(app)/program-head/programs/[programId]/analytics/page.tsx

src/app/(app)/program-head/programs/[programId]/responses/page.tsx

src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/page.tsx

src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page.tsx

src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/page.tsx

src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]/page.tsx
```

Add appropriate:

- `loading.tsx`;
- scoped error state;
- `notFound()` behavior;
- metadata where consistent with nearby routes.

---

# 33. Server Actions

Do not create Server Actions for ordinary reads.

Read path:

```text
RSC
  -> authorized service
  -> Prisma
```

Search/filter interactions navigate through URL state.

Keep Server Actions for actual mutations and current on-demand AI generation.

---

# 34. Shared analytical services

Do not calculate the same metric separately on Dashboard, Analytics, and Responses.

Create shared deterministic aggregation rules.

Conceptual areas:

```text
participation
quantitative metrics
course evaluation metrics
CILO metrics
course-derived PLO metrics
Program-wide PLO metrics
qualitative metrics
trend metrics
```

Example structure:

```text
src/features/analytics/aggregators/
  participation.ts
  quantitative.ts
  cilo.ts
  plo.ts
  qualitative.ts
  trends.ts

src/features/analytics/services/
  get-program-head-dashboard.ts
  get-program-head-outcomes.ts
  get-program-head-courses.ts
  get-program-head-stakeholders.ts
  get-program-head-trends.ts
  get-program-head-qualitative.ts
```

Exact naming can follow repository conventions.

The key rule is semantic reuse.

---

# 35. Canonical participation DTO

Suggested shape:

```ts
type ParticipationSummary = {
  assigned: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
  completionRate: number | null;

  stakeholders: Array<{
    stakeholder: TargetStakeholder;
    assigned: number;
    submitted: number;
    inProgress: number;
    notStarted: number;
    completionRate: number | null;
  }>;

  respondents: {
    total: number;
    complete: number;
    partial: number;
    notStarted: number;
  };
};
```

Dashboard and Stakeholders should consume the same canonical object.

---

# 36. Canonical quantitative metric DTO

Suggested shape:

```ts
type QuantitativeMetric = {
  mean: number | null;
  ratingCount: number;
  responseCount: number;

  scale: ScaleIdentity | null;

  distribution: Array<{
    value: number;
    label: string;
    count: number;
    percentage: number;
  }>;
};
```

When multiple scales exist, return grouped metrics rather than one invalid combined metric.

---

# 37. Course evaluation DTO

Suggested shape:

```ts
type ProgramHeadCourseEvaluationDetail = {
  evaluation: {
    id: string;
    title: string;
    status: DeploymentStatus;
    activationAt: Date | null;
    deadlineAt: Date | null;
  };

  courseAssignment: {
    id: string;

    course: {
      id: string;
      code: string;
      title: string;
    };

    faculty: {
      id: string;
      name: string;
    };

    termInstanceId: string;
    periodLabel: string;
    yearLevel: YearLevel;
    section: StudentSection | null;
  };

  participation: ParticipationSummary;
  quantitative: QuantitativeMetric;
  cilos: CiloMetric[];
  questions: QuestionMetric[];
  qualitative: QualitativeSummary;
};
```

The UI must not infer Faculty, Section, Year, or Period from formatted labels.

---

# 38. CILO DTO

Suggested shape:

```ts
type CiloMetric = {
  ciloId: string;
  description: string;

  quantitative: QuantitativeMetric;

  mappings: Array<{
    ploId: string;
    ploCode: string;
    ploDescription: string;
    manifestation:
      | "LEARNING"
      | "PRACTICE"
      | "OPPORTUNITY";
  }>;

  contributingQuestions: Array<{
    sectionKey: string;
    itemKey: string;
    prompt: string;
  }>;
};
```

---

# 39. Question DTO

Suggested shape:

```ts
type QuestionMetric = {
  sectionKey: string;
  itemKey: string;
  prompt: string;

  binding:
    | {
        type: "CILO";
        ciloId: string;
        ciloLabel: string;
      }
    | {
        type: "GENERAL";
      };

  quantitative: QuantitativeMetric;
};
```

Use explicit `GENERAL` rather than requiring UI components to interpret `null`.

---

# 40. Individual response DTO

Use a Program Head-specific DTO.

```ts
type ProgramHeadSubmittedResponseDetail = {
  responseId: string;
  submittedAt: Date;

  respondent: {
    id: string;
    name: string;
    stakeholder: TargetStakeholder;

    studentContext?: {
      programId: string;
      programLabel: string;
      majorId: string | null;
      majorLabel: string | null;
      yearLevel: YearLevel;
      section: StudentSection | null;
    };

    alumniContext?: {
      programLabel: string | null;
      majorLabel: string | null;
      graduationYear: number | null;
    };

    industryContext?: {
      companyName: string | null;
      position: string | null;
    };
  };

  evaluation: {
    id: string;
    type: "COURSE_BOUND" | "PROGRAM_WIDE";
    title: string;
    context: Record<string, unknown>;
  };

  quantitativeMean: number | null;

  sections: Array<{
    key: string;
    title: string;
    items: Array<
      QuantitativeSubmittedAnswer |
      QualitativeSubmittedAnswer
    >;
  }>;
};
```

---

# 41. Traceability metadata

Major metrics should expose enough metadata for "How calculated" UI.

Suggested shape:

```ts
type MetricEvidenceSummary = {
  ratingCount?: number;
  responseCount?: number;
  assignmentCount?: number;
  evaluationCount?: number;
  questionCount?: number;
  scaleLabel?: string;
  explanation: string;
  evidenceHref?: string;
};
```

This is presentation metadata.

Do not create a database Trace table for v1.

---

# 42. Database impact

Default expectation: no large schema redesign.

Existing model already provides the main relationships needed:

- `Response`;
- quantitative answer items;
- qualitative answer items;
- evaluation assignment;
- Course-bound evaluation;
- Course assignment;
- Student enrollment;
- CILO question binding;
- CILO;
- CILO-to-PLO mapping;
- Program-wide deployment;
- Program-wide PLO snapshot.

The implementation agent must verify current schema and migrations before deciding that no migration is needed.

---

# 43. Database investigation

Before adding indexes:

1. implement representative final queries;
2. seed realistic analytical data;
3. run `EXPLAIN ANALYZE`;
4. identify actual expensive scans;
5. add only targeted indexes.

Likely query paths to inspect:

- responses by assignment/status;
- quantitative items by response;
- qualitative items by response;
- Student enrollment by student/term/Program/Major;
- Course assignments by Program/term/course/faculty/section;
- Program-wide deployments by Program/term/stakeholder;
- PLO snapshots by deployment/section/item/PLO.

Avoid speculative index migrations.

---

# 44. Historical mapping limitation

Course historical PLO evidence may still interpret older CILO-bound answers through the current CILO-to-PLO mapping.

Do not add historical course mapping snapshots in this implementation.

Instead:

- document the limitation;
- disclose it in detailed Course-derived PLO Analytics;
- do not describe current mapping as publication-time mapping.

Program-wide PLO snapshots already give stronger publication-time traceability.

---

# 45. Query and performance requirements

List pages:

- server-side filtering;
- server-side pagination;
- bounded search;
- narrow Prisma projections.

Analytics:

- avoid repeated full-corpus scans;
- group once where practical;
- use Sets for distinct response counts;
- avoid N+1 enrollment queries;
- fetch respondent term-context in batches;
- preserve exact numeric values until display;
- bound qualitative token work.

Do not load thousands of response records into the browser and filter locally.

---

# 46. Caching and freshness

Initial priority: correctness.

Active-period Dashboard, Analytics, and Responses should not disagree because one surface has stale cached results.

Default to fresh server reads until performance data shows a need for caching.

If caching is later introduced, define invalidation for:

- response submission;
- evaluation publication;
- evaluation close;
- late inclusion;
- exclusion;
- other assignment-state changes.

Closed historical periods may later be better cache candidates.

---

# 47. Design-system implementation requirements

Production implementation must follow `design.md`.

Required:

- existing `AppShell`;
- `max-w-[1600px]` operational layout;
- semantic tokens only;
- existing shadcn/Base UI primitives;
- Lucide icons;
- Recharts only;
- tabular numerals for metrics;
- neutral cards;
- direct chart labels;
- legends;
- exact values;
- low-contrast grids;
- responsive tables;
- visible focus;
- reduced motion;
- no decorative chart animation;
- no new per-page navigation;
- no raw color palette inside components.

Dashboard density: medium.

Analytics density: medium-high.

---

# 48. Responsive behavior

## Desktop

- expanded Program Head navigation;
- four-column KPI row;
- multi-column chart layout;
- tables where useful;
- persistent visible exact counts.

## Tablet

- two-column cards;
- stacked analytical sections where needed;
- reduced chart density;
- preserve same evidence hierarchy.

## Mobile

- existing admin hamburger/drawer;
- single-column Dashboard;
- filters in Drawer where appropriate;
- tables become horizontally contained or record cards;
- minimum touch-target sizing;
- no essential hover-only information;
- breadcrumbs may collapse but must preserve hierarchy.

Theme does not change information hierarchy.

---

# 49. Accessibility

Requirements:

- every chart has precise text/table equivalent;
- Likert distribution has exact category table;
- PLO bars include code and numeric mean;
- participation charts expose exact counts;
- trends have exact period table;
- evidence matrix is keyboard-operable;
- interactive rows are keyboard-operable;
- tooltips are supplemental;
- proper table headers and `aria-sort`;
- visible focus ring;
- status includes text, not color only;
- charts do not use red/green as the only meaning;
- motion honors `prefers-reduced-motion`;
- errors and empty states are announced appropriately.

---

# 50. Empty and no-data states

Differentiate:

```text
No evaluations exist for this period.
```

```text
Evaluations exist, but no responses have been submitted.
```

```text
Submitted responses exist, but this PLO has no mapped quantitative evidence.
```

```text
This Course evaluation contains no CILO-bound quantitative questions.
```

```text
This Program does not use majors.
```

```text
No qualitative answers were submitted.
```

```text
This result spans multiple incompatible scales.
```

No generic `No data` when a more useful reason is available.

---

# 51. Loading and error states

Use existing route loading patterns.

Dashboard loading should preserve structural card/chart layout.

Analytics loading should preserve filter/header hierarchy.

Errors must state:

- what failed;
- what is affected;
- safe recovery.

Never log raw response contents to explain an error.

---

# 52. Testing strategy

This implementation requires more than component rendering tests.

Required layers:

1. deterministic analytical fixture;
2. pure calculation tests;
3. DB-backed integration tests;
4. route tests;
5. authorization tests;
6. cross-surface parity tests;
7. component interaction tests;
8. Playwright user journeys;
9. accessibility checks;
10. production build.

---

# 53. Deterministic analytics fixture

Create one reusable reference dataset containing:

- at least two Programs;
- one Program with Majors;
- one without Majors;
- multiple Program Heads;
- multiple Faculty;
- same Course taught by different Faculty;
- multiple Sections;
- students in multiple Majors;
- Course evaluations;
- Program-wide student evaluation;
- Alumni evaluation;
- Industry evaluation;
- submitted responses;
- in-progress responses;
- unstarted assignments;
- zero-response evaluation;
- bound quantitative questions;
- unbound quantitative questions;
- qualitative questions;
- one CILO mapped to several PLOs;
- several CILOs mapped to one PLO;
- Learning mapping;
- Practice mapping;
- Opportunity mapping;
- direct Program-wide PLO bindings;
- incompatible scale example;
- multiple academic periods.

Expected values must be independently calculated and hard-coded in tests.

---

# 54. Pure calculation tests

Test:

- Response quantitative mean;
- Evaluation quantitative mean;
- Question mean;
- CILO mean;
- unbound question inclusion in evaluation mean;
- unbound question exclusion from CILO;
- Course-derived PLO mean;
- Program-wide PLO mean;
- manifestation behavior;
- many-to-many PLO mappings;
- duplicate contribution prevention;
- rating count;
- response count;
- assignment count;
- respondent Complete/Partial/Not-started status;
- stakeholder participation;
- evidence-source separation;
- scale separation;
- Major attribution;
- qualitative source count;
- prompt count;
- word frequencies;
- trend comparability.

---

# 55. Mathematical reconciliation tests

Required invariants:

```text
sum(distribution counts) = ratingCount
```

```text
weighted mean from distribution = displayed metric mean
```

within numerical tolerance.

Participation:

```text
submitted + inProgress + notStarted = assigned
```

Where source groups are mutually exclusive:

```text
sum(source counts) = aggregate count
```

---

# 56. Cross-surface parity tests

Examples:

```text
Dashboard submitted count
=
Stakeholders submitted count
```

```text
Responses evaluation submitted count
=
number of submitted respondent rows
```

```text
Course Analytics Evaluation quantitative mean
=
Responses evaluation quantitative mean
```

```text
PLO rating count
=
number of exact eligible mapped ratings
```

```text
Qualitative total
=
sum of source qualitative totals
```

Any cross-surface disagreement is a failing test.

---

# 57. Authorization tests

Program Head A can:

- view Program A Dashboard;
- view Program A Analytics;
- view Program A Responses;
- see named submitted respondents;
- inspect exact submitted answers.

Program Head A cannot:

- view Program B evaluation;
- view Program B response by guessed ID;
- escape scope through search params.

Faculty cannot:

- access new Program Head identified-response routes.

Program Head cannot:

- inspect `IN_PROGRESS` response body.

---

# 58. Component interaction tests

Cover:

- completion details popover;
- keyboard-readable stakeholder progress;
- PLO source switch;
- Likert exact-value disclosure;
- `General evaluation item` labeling;
- Major filter omission for no-Major Programs;
- URL filter serialization;
- matrix selection;
- word count slider;
- same Course different Faculty rows;
- breadcrumb behavior;
- zero-response state;
- multiple-scales state.

Do not write tests that only prove a component mounted.

---

# 59. Route tests

Cover:

- Dashboard;
- all Analytics tabs;
- Responses landing;
- Course evaluation detail;
- Course response detail;
- Program-wide detail;
- Program-wide response detail;
- legacy CILO-review redirects;
- invalid query canonicalization;
- unauthorized Program;
- missing Evaluation;
- missing Response;
- zero-response Evaluation;
- no-evidence PLO.

---

# 60. DB-backed integration tests

Critical joins should run against disposable PostgreSQL.

Important chains:

```text
Response
  -> EvaluationAssignment
  -> CourseBoundEvaluation
  -> CourseAssignment
  -> Program
```

```text
Response
  -> respondent
  -> StudentEnrollment
  -> Major
```

```text
QuantitativeResponseItem
  -> CILO question binding
  -> CILO
  -> CILO mapping
  -> PLO
```

```text
QuantitativeResponseItem
  -> Program-wide deployment
  -> PLO snapshot
```

Mocked Prisma tests alone are not sufficient for these relationships.

---

# 61. Playwright E2E

Add browser-level journeys.

## Journey A: top-down

```text
Program Head login
  -> Dashboard
  -> stakeholder participation
  -> Analytics
  -> Course
  -> Evaluation
  -> named respondent
  -> exact quantitative answer
  -> exact qualitative answer
```

## Journey B: bottom-up

```text
Individual response
  -> CILO
  -> PLO
  -> Outcomes Analytics
  -> Dashboard
```

## Other required E2E

- same Course, different Faculty;
- same Course, different Section;
- Program-wide Alumni evidence;
- Program with Majors;
- zero-response Evaluation;
- cross-Program denial;
- mobile navigation;
- filter persistence;
- direct PLO Program-wide drilldown.

Do not automate Google OAuth UI.

Use isolated demo/test authentication.

---

# 62. Visual regression (deferred)

Deferred in the 2026-08-24 review; revisit if chart-related regressions appear. Original capture list:

- Dashboard desktop;
- Dashboard mobile;
- Outcomes;
- Courses;
- Stakeholders;
- Trends;
- Qualitative;
- Responses list;
- Course detail;
- Program-wide detail;
- individual response.

Disable chart animation or use reduced-motion behavior to keep screenshots deterministic.


# 63. CI target

Recommended jobs:

```text
quality-checks
  install
  lint
  Vitest
  build
```

```text
database-integration
  disposable DB
  apply migrations
  seed fixture
  integration tests
```

```text
browser-e2e
  build/start app
  seed deterministic fixture
  Playwright
  upload trace/screenshots on failure
```

Keep fast failures separate from slower browser tests.

---

# 64. Logging

Safe metadata only:

- operation;
- actor ID;
- Program ID;
- Evaluation ID;
- Response ID where appropriate;
- error category;
- database error code.

Never log:

- raw quantitative answer payloads when unnecessary;
- qualitative text;
- respondent email;
- credentials;
- auth tokens.

---

# 65. Likely repository areas touched

At minimum investigate:

```text
src/app/(app)/program-head/programs/[programId]/

src/features/analytics/
src/features/evaluations/
src/features/course-assignments/
src/features/outcomes/
src/features/auth/
existing review modules
new response-review module if needed

src/components/ui/
src/components/layout/

src/lib/constants/navigation.ts
src/lib/constants/program-head-routes.ts

prisma/models/responses.prisma
prisma/models/evaluations-deployments.prisma
prisma/models/course-assignments.prisma
prisma/models/outcomes.prisma
prisma/models/instruments.prisma

prisma/seed/
src/__tests__/
.github/workflows/
legal/privacy content
```

The coding agent must inspect actual imports and consumers before editing.

---

# 66. Suggested implementation sequence

## Phase 1: contracts and tests

- deterministic fixture;
- metric terminology;
- shared DTOs;
- pure aggregators;
- mathematical tests;
- Program scope tests.

## Phase 2: Responses

- canonical routes;
- Program Head-specific identified reads;
- Course evaluations list;
- Program-wide list;
- Evaluation detail;
- individual response;
- legacy redirects.

## Phase 3: Dashboard

- new KPI model;
- participation by stakeholder;
- source-specific quantitative summary;
- PLO source summary;
- needs attention;
- qualitative pulse.

## Phase 4: Analytics

- new tab model;
- Outcomes;
- Courses;
- Stakeholders;
- Trends;
- Qualitative;
- AI filter alignment.

## Phase 5: traceability

- breadcrumbs;
- How-calculated UI;
- evidence matrix;
- deep links;
- reverse links from responses.

## Phase 6: hardening

- DB integration tests;
- Playwright;
- visual regression;
- accessibility;
- performance review;
- legal/privacy alignment;
- CI gates.

---

# 67. Acceptance criteria

## Information architecture

- [ ] Responses is a first-class Program Head nav item.
- [ ] Analytics tabs are Outcomes, Courses, Stakeholders, Trends, Qualitative, AI Insights.
- [ ] Analytics Overview duplication is removed.
- [ ] Breakdowns is replaced by Courses.
- [ ] Feedback is replaced by Qualitative.
- [ ] Nested pages use breadcrumbs.

## Dashboard

- [ ] Completion uses eligible evaluation assignments.
- [ ] Completion exposes stakeholder breakdown.
- [ ] Respondent status is separately reported.
- [ ] Active evaluations are period-scoped.
- [ ] Quantitative results remain source-specific.
- [ ] stakeholder progress shows counts and percentage.
- [ ] PLO summary requires selected evidence source.
- [ ] qualitative summary includes provenance.
- [ ] Dashboard links into matching Analytics/Responses state.

## Quantitative correctness

- [ ] Evaluation quantitative mean uses all valid quantitative items.
- [ ] unbound quantitative items are included in Evaluation mean.
- [ ] unbound items are excluded from CILO/PLO.
- [ ] CILO means use only bound questions.
- [ ] Course PLO uses eligible CILO-derived evidence.
- [ ] Program-wide PLO uses published direct PLO bindings.
- [ ] incompatible scales are not merged.
- [ ] distributions and means reconcile.
- [ ] no mean-of-means shortcut when raw ratings exist.

## Responses

- [ ] zero-response Evaluations appear.
- [ ] same Course different Faculty remains separate.
- [ ] same Course different Section remains separate.
- [ ] Program Head sees named submitted respondents.
- [ ] student context uses term-specific enrollment.
- [ ] every submitted answer is visible.
- [ ] in-progress answer content is inaccessible.
- [ ] Course and Program-wide review both work.

## Analytics

- [ ] PLO results are traceable.
- [ ] PLO evidence coverage matrix works.
- [ ] Courses uses CourseAssignment identity.
- [ ] Stakeholders keeps source separation.
- [ ] Major analytics is contextually correct.
- [ ] Trends preserve comparability breaks.
- [ ] Qualitative exposes source and prompt provenance.
- [ ] raw qualitative evidence is reached through Responses.
- [ ] AI stays aggregate-only.

## Security

- [ ] every read revalidates Program Head Program scope.
- [ ] cross-Program URL guessing fails.
- [ ] Faculty cannot use identified response routes.
- [ ] raw answer content is not logged.
- [ ] privacy/legal copy reflects Program Head access.

## UX and accessibility

- [ ] production UI follows reference prototype hierarchy.
- [ ] existing shell and semantic tokens are reused.
- [ ] Recharts only.
- [ ] every chart has precise text/table equivalent.
- [ ] academic meaning does not rely on color.
- [ ] keyboard use works.
- [ ] mobile works.
- [ ] reduced motion works.
- [ ] meaningful empty states explain why data is absent.

## Testing

- [ ] deterministic fixture exists.
- [ ] aggregation tests pass.
- [ ] reconciliation tests pass.
- [ ] parity tests pass.
- [ ] DB integration tests pass.
- [ ] authorization tests pass.
- [ ] route tests pass.
- [ ] Playwright top-down journey passes.
- [ ] Playwright bottom-up journey passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.

---

# 68. Definition of done

Use one seeded respondent as the reference evidence trail.

Example:

```text
Maria Santos submits Q1 = 5
```

The implementation must demonstrate:

```text
Individual response
  shows Q1 = 5

Question analytics
  includes that exact rating

If Q1 is CILO-bound:
  CILO aggregate includes it

If the CILO maps to a PLO through eligible manifestation:
  Course PLO evidence includes it

Course evaluation detail
  has the correct Evaluation quantitative mean

Course Analytics
  reports the same Evaluation mean

Responses list
  reports the same submission count

Outcomes Analytics
  reports the correct PLO rating count

Dashboard
  summarizes the same evidence
```

The same trace should be verified for:

- an unbound general quantitative item;
- a Program-wide student response;
- an Alumni response;
- an Industry response;
- a student in a Program Major;
- a zero-response Evaluation.

If a displayed number cannot be traced to its contributing records in the deterministic fixture, that metric is not complete.

---

# 69. Implementation principle

The implementation should optimize for one property above everything else:

> Dashboard, Analytics, and Responses must tell the same evidence story.

Charts are summaries. Tables provide precision. Responses provide proof.

No surface should invent its own interpretation or calculation of the same underlying evidence.
