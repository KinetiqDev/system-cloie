## ADDED Requirements

### Requirement: Selected Program analytics is server-authorized
The system SHALL serve Program Head analytics only for an explicitly requested Program that belongs to the authenticated user's current active `ProgramHeadAssignment` set. The analytics page and every server-side analytics read SHALL validate the selected Program through `resolveProgramHeadContext(programId)` before querying analytics data.

#### Scenario: Authorized selected Program
- **WHEN** an authenticated `PROGRAM_HEAD` requests `/program-head/programs/{assignedProgramId}/analytics`
- **THEN** the server SHALL render analytics scoped only to that Program.

#### Scenario: Unassigned or malformed Program
- **WHEN** a user requests analytics with a malformed or unassigned `programId`
- **THEN** the server SHALL deny the request with the existing non-disclosing route behavior and SHALL NOT query analytics data for that Program.

#### Scenario: Multi-Program assignment isolation
- **WHEN** a Program Head has active assignments for multiple Programs and requests one selected Program
- **THEN** every analytics query SHALL exclude evidence belonging to the other Programs.

### Requirement: Analytics scope is URL-backed and canonical
The system SHALL represent the analytics tab and supported filters in the URL so refresh, bookmarking, and browser back/forward preserve the requested analytical scope. The system SHALL use `tab` values `overview`, `outcomes`, `stakeholders`, `breakdowns`, `trends`, `feedback`, and `ai`, and SHALL canonicalize missing or invalid tab values to `overview`.

#### Scenario: Tab navigation preserves scope
- **WHEN** a user changes from `overview` to `outcomes` while period and stakeholder filters are active
- **THEN** the URL SHALL preserve valid filters and the server SHALL render the Outcomes view for the same scope.

#### Scenario: Invalid filter is requested
- **WHEN** a URL contains an invalid, impossible, or out-of-Program filter value
- **THEN** the server SHALL redirect to a canonical safe URL or deny the request without reading out-of-scope evidence.

#### Scenario: Filter options are context-aware
- **WHEN** a selected Program has no applicable majors, courses, instruments, or mapped GOs for the current scope
- **THEN** the corresponding control SHALL be omitted or disabled and SHALL NOT offer meaningless options.

### Requirement: Analytics uses submitted responses and assignment opportunities
The system SHALL calculate analytical evidence from `Response` records with `status = SUBMITTED` only. The historical eligible denominator SHALL be the number of in-scope `EvaluationAssignment` opportunities, and response rate SHALL be submitted eligible responses divided by eligible opportunities. A zero eligible denominator SHALL produce an unavailable rate rather than a fabricated `0%` coverage claim.

#### Scenario: Draft responses are excluded
- **WHEN** a scope contains both `IN_PROGRESS` and `SUBMITTED` responses
- **THEN** drafts SHALL be excluded from submitted counts, means, distributions, qualitative tokens, and AI packets.

#### Scenario: Assignment denominator is used
- **WHEN** a scope contains published evaluation assignments and submitted responses
- **THEN** eligible count SHALL equal in-scope assignment opportunities and rating count SHALL remain distinct from response count.

#### Scenario: No eligible opportunities
- **WHEN** a valid scope contains zero eligible evaluation assignments
- **THEN** the response-rate display SHALL show an unavailable or no-op state with an explanatory label.

### Requirement: Deterministic quantitative metrics are exact and scale-aware
The system SHALL expose submitted response count, valid rating count, mean rating, and per-category Likert counts and percentages. Means SHALL retain full precision in server calculations and round only for display. Category values and labels SHALL come from the applicable instrument-version structure snapshot rather than a hardcoded universal scale.

#### Scenario: Mean and rating count are displayed
- **WHEN** submitted responses contain multiple quantitative items
- **THEN** the mean SHALL be the sum of valid rating values divided by valid rating count and the UI SHALL disclose both rating count and submitted response count.

#### Scenario: Instruments use different scales
- **WHEN** the selected scope contains instrument versions with different descriptor sets or rating scales
- **THEN** the system SHALL keep distributions separate by scale identity and SHALL NOT merge incompatible categories.

#### Scenario: Independent means are compared
- **WHEN** the UI compares stakeholder, course, or outcome means
- **THEN** it SHALL use a ranked bar, dot, or grouped-bar presentation and SHALL NOT encode independent means as pie-slice proportions.

### Requirement: Outcome evidence respects canonical mappings
The system SHALL calculate Program GO evidence only from course-bound quantitative items with a CILO question binding and a canonical CILO-to-GO mapping for the selected Program. Central instrument items and institutional-outcome evidence SHALL NOT be inferred or labeled as Program GO attainment. The system SHALL disclose when current mappings, rather than publication-time mapping snapshots, interpret historical evidence.

#### Scenario: Course-bound GO evidence exists
- **WHEN** submitted course-bound items are bound to CILOs that map to selected-Program GOs
- **THEN** the Outcomes view SHALL expose GO code/name, mean, rating count, response count, contributing courses/CILOs, and an exact-value alternative.

#### Scenario: CILO maps to multiple GOs
- **WHEN** one bound CILO maps to more than one selected-Program GO
- **THEN** the rating SHALL contribute once to each mapped GO row and the UI SHALL disclose the many-to-many contribution rule.

#### Scenario: Central question has no canonical GO mapping
- **WHEN** a central deployment contains a question without an explicit canonical GO relation
- **THEN** the question SHALL remain in stakeholder/instrument analytics and SHALL NOT be assigned to a GO by wording or item key.

### Requirement: Stakeholder and contextual breakdowns disclose evidence source
The system SHALL distinguish course-bound student evidence from central `STUDENT`, `ALUMNI`, and `INDUSTRY_PARTNER` evidence. It SHALL expose course, instrument, and only defensible major/year-level dimensions, and SHALL label incomplete transitive attribution as `Unspecified` rather than infer a respondent attribute.

#### Scenario: Stakeholders are compared
- **WHEN** the scope includes course-bound and central evidence
- **THEN** the Stakeholders view SHALL separate the evidence buckets and disclose that instruments and source populations differ.

#### Scenario: Course breakdown is requested
- **WHEN** the selected scope contains course-bound evidence
- **THEN** the Breakdowns view SHALL group evidence by course and provide mean, rating count, response count, and a path to authorized course-bound review evidence where available.

#### Scenario: No applicable secondary dimension exists
- **WHEN** the selected Program has no majors or the evidence has no defensible course/major dimension
- **THEN** the view SHALL show a meaningful empty state or omit the irrelevant control rather than render a misleading selector.

### Requirement: Trends are comparability-aware
The system SHALL provide term/period trend evidence only for comparable series. A change in instrument version, rating scale identity, or outcome identity SHALL create a visible comparability break and SHALL NOT be interpolated as one continuous series.

#### Scenario: Comparable periods are available
- **WHEN** multiple term instances contain comparable evidence for the selected Program
- **THEN** the Trends view SHALL show period labels, mean, submitted response count, rating count, and exact-value tabular data.

#### Scenario: Period comparability changes
- **WHEN** the series crosses an instrument, scale, or outcome identity change
- **THEN** the UI SHALL mark the break and explain why values are not directly comparable.

#### Scenario: No comparable history exists
- **WHEN** the selected scope has fewer than two comparable periods
- **THEN** the Trends view SHALL render an explanatory empty state instead of implying a trend.

### Requirement: Qualitative feedback is aggregate-only
The system SHALL provide qualitative feedback analytics using server-computed word-frequency tokens and counts from submitted evidence. Analytics browser payloads SHALL NOT include raw qualitative response text, response rows, respondent identifiers, or account emails. Raw text SHALL remain available only through independently authorized existing reviewer routes.

#### Scenario: Feedback tokens render
- **WHEN** submitted qualitative evidence exists in an authorized scope
- **THEN** the Feedback view SHALL render word-frequency tokens, source/prompt counts, accessible exact values, and no raw comment text.

#### Scenario: No qualitative evidence exists
- **WHEN** the selected scope contains no non-empty submitted qualitative items
- **THEN** the Feedback view SHALL render a labeled empty state and leave deterministic quantitative views usable.

#### Scenario: Evidence drill-through
- **WHEN** a user selects an available course-bound evidence link
- **THEN** navigation SHALL point to the existing selected-Program reviewer route, which independently re-authorizes before showing any raw response text.

### Requirement: Analytics visualizations are accessible and responsive
The system SHALL use the shared semantic chart primitives and Recharts wrappers, provide text insights and exact-value alternatives, preserve meaning without color alone, and support desktop and mobile layouts without required hover interactions. Loading, empty, error, and reduced-motion states SHALL be explicit.

#### Scenario: Chart has displayed values
- **WHEN** an authorized quantitative chart renders
- **THEN** it SHALL expose a title, concise insight, visible legend or direct labels, keyboard/touch-reachable exact values, and a tabular alternative.

#### Scenario: Chart is loading or fails
- **WHEN** a view's visualization data is loading or unavailable
- **THEN** the UI SHALL reserve structural space and render an accessible loading or actionable error state rather than a blank chart.

#### Scenario: Mobile filters are opened
- **WHEN** a user views analytics at a mobile viewport and opens secondary filters
- **THEN** the controls SHALL use the existing responsive Dialog/Drawer behavior, provide touch-sized controls, and preserve the readable scope summary.

### Requirement: Analytics remains usable when evidence is absent
The system SHALL distinguish no assignments, no submitted responses, no qualitative evidence, no mapped outcomes, no applicable majors, and no comparable history with labeled empty states. A missing optional evidence class SHALL NOT make unrelated views fail.

#### Scenario: Program has no submitted evidence
- **WHEN** an authorized Program has assignments but no submitted responses in the selected scope
- **THEN** KPI and view areas SHALL explain the absence and render available filter/navigation controls without fabricated metrics.

#### Scenario: One view has no applicable data
- **WHEN** a view-specific dataset is empty while another dataset is available
- **THEN** the empty view SHALL show its reason and the rest of the workspace SHALL remain navigable.
