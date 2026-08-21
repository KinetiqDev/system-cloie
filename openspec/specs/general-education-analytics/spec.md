# general-education-analytics Specification

## Purpose
TBD - created by archiving change add-general-education-coordinator. Update Purpose after archive.
## Requirements
### Requirement: Coordinator analytics includes only authorized General Education Course-bound evidence

The system SHALL provide a separate server-authorized analytics read path for
`GEN_ED_COORDINATOR`. The read path SHALL include submitted Course-bound evidence
whose Course has `course_scope = GENERAL_EDUCATION`, across Programs. It SHALL
exclude Program-specific Course-bound evidence, Central Deployments, and evidence
outside the requested academic scope.

#### Scenario: Coordinator requests mixed evidence

- **GIVEN** the requested academic scope contains General Education Course-bound evidence, Program-specific Course-bound evidence, and Central Deployment evidence
- **WHEN** an authorized Coordinator requests analytics
- **THEN** the response contains only the General Education Course-bound evidence

#### Scenario: Unauthorized role requests Coordinator analytics

- **GIVEN** an authenticated account has a role other than `GEN_ED_COORDINATOR`
- **WHEN** the account requests the Coordinator analytics read path
- **THEN** the server denies the request without querying or returning Coordinator analytics data

### Requirement: Coordinator analytics uses submitted responses and historical opportunities

The system SHALL include only `Response.status = SUBMITTED` in Coordinator
analytics. The historical denominator SHALL be the number of in-scope
`EvaluationAssignment` opportunities. A scope with zero opportunities SHALL
report an unavailable response rate rather than `0%`.

#### Scenario: Draft response is present

- **GIVEN** an authorized General Education scope contains both draft and submitted responses
- **WHEN** the server calculates analytics
- **THEN** draft responses are excluded from counts, means, distributions, qualitative tokens, and response-rate numerators

#### Scenario: Scope has no evaluation opportunities

- **GIVEN** an authorized General Education scope contains zero EvaluationAssignment opportunities
- **WHEN** the analytics response is prepared
- **THEN** the response-rate result is unavailable and the response explains that no denominator exists

### Requirement: Coordinator analytics returns deterministic aggregate views

The analytics read path SHALL support academic-period filtering, overview counts
and means, Course breakdowns, comparable trends, and aggregate qualitative
feedback. Means SHALL retain full precision in server calculations and rating
counts SHALL remain distinct from submitted response counts. Rating categories
SHALL come from the applicable instrument structure snapshot.

#### Scenario: Coordinator views quantitative evidence

- **GIVEN** submitted General Education evidence contains valid quantitative items
- **WHEN** the Coordinator opens the overview or Course breakdown
- **THEN** the response includes means, rating counts, submitted response counts, and scale-aware category data

#### Scenario: Coordinator views incomparable trend periods

- **GIVEN** General Education evidence spans periods with different instrument versions, scales, or outcome identities
- **WHEN** the Coordinator opens trends
- **THEN** the response marks the comparability break and does not present one continuous misleading series

#### Scenario: Coordinator views qualitative feedback

- **GIVEN** submitted General Education evidence contains qualitative items
- **WHEN** the Coordinator opens feedback
- **THEN** the response contains server-computed word-frequency tokens, counts, source labels, and no raw comment text

### Requirement: Coordinator analytics payloads are aggregate-only and request-scoped

The browser payload SHALL contain only authorized display labels, quantitative
aggregates, counts, source labels, bounded word-frequency tokens, and links to
independently authorized review routes. It SHALL not contain raw comments,
response rows, respondent identifiers, account emails, roster data, or a shared
cache entry. Each request SHALL authorize the Coordinator before querying
private evidence.

#### Scenario: Analytics DTO is serialized

- **GIVEN** an authorized Coordinator analytics read completes
- **WHEN** the server serializes the response for the browser
- **THEN** the payload contains no raw qualitative text, response identifiers, respondent identifiers, account emails, or roster records

#### Scenario: Two Coordinators request analytics

- **GIVEN** two active Coordinator accounts request analytics with different valid academic-period filters
- **WHEN** both requests execute
- **THEN** each request resolves authorization and reads its own aggregate scope without receiving another request's cached result

### Requirement: Coordinator analytics visualization is accessible and responsive

Coordinator quantitative charts SHALL use existing Recharts through shared chart
primitives and semantic chart tokens. Each chart SHALL provide a title, concise
text insight, visible legend or direct labels, exact-value access, and a table or
equivalent accessible representation. Loading, empty, error, reduced-motion,
keyboard, touch, and mobile states SHALL remain explicit.

#### Scenario: Coordinator views a chart on mobile

- **GIVEN** an authorized Coordinator opens analytics at a mobile viewport
- **WHEN** a quantitative chart renders
- **THEN** the chart remains readable without hover-only interaction and exposes exact values through an accessible alternative

#### Scenario: Analytics view has no evidence

- **GIVEN** an authorized Coordinator selects a valid scope with no submitted General Education evidence
- **WHEN** an analytics view renders
- **THEN** the view shows a labeled empty state and leaves unrelated navigation and filters usable

