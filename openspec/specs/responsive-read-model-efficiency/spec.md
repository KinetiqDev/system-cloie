# Responsive Read Model Efficiency

## Purpose

Define bounded, batched, parallel, and aggregate server-read behavior for high-traffic role views.

## Requirements

### Requirement: Role-owned list reads are bounded at the database boundary

The system SHALL apply supported pagination, filtering, and sorting to converted high-volume role-owned list reads before serializing records to the client. Secretary Users uses its fixed route page size. Course Assignments SHALL return no more than 100 records per page; omitted page size uses the route default, and an internal Course Assignment request above 100 is clamped to 100 before the query executes.

#### Scenario: Secretary views Users

- **WHEN** a Secretary opens a paginated Users view
- **THEN** the system retrieves only the requested user page and the fields required for that page instead of loading all user records and paginating them in the browser

#### Scenario: Requested page is outside available results

- **WHEN** a user requests a page outside the current filtered result range
- **THEN** the system canonicalizes or reports the page using the route's established pagination behavior without returning an unbounded dataset

#### Scenario: Requested page size exceeds the maximum

- **WHEN** an internal Course Assignment list caller requests more than 100 records in one page
- **THEN** the system limits the Course Assignment database read and returned page to 100 records

### Requirement: Evaluation eligibility reads avoid per-record query amplification

The system SHALL evaluate Student eligibility for a bounded set of course-bound evaluation assignments without issuing one independent database round trip per assignment.

#### Scenario: Student has multiple course-bound evaluations

- **WHEN** a Student loads assigned evaluations containing multiple course-bound assignments
- **THEN** the system uses a bounded batch or equivalent set-based read to determine eligibility and returns only evaluations the Student may access

### Requirement: Independent authorized reads execute in parallel

The system SHALL execute independent authorized reads in parallel and SHALL avoid duplicate scope resolution within one request when an already-validated scope can be passed to a dependent read.

#### Scenario: Faculty dashboard renders independent metrics

- **WHEN** a Faculty Member opens the dashboard
- **THEN** independent affiliation, KPI, and analytics reads execute without unnecessary sequential waits while preserving the same dashboard values

#### Scenario: Dean Server Component reads oversight data

- **WHEN** a Dean opens an oversight page
- **THEN** the Server Component calls the authorized read-model service directly and does not serialize the same result through an internal route handler solely to consume it on the server

### Requirement: Aggregate views do not load detail solely to compute totals

The system SHALL use an aggregate or bounded projection when a role view needs totals rather than full detail objects.

#### Scenario: Dean dashboard renders readiness totals

- **WHEN** the Dean dashboard renders active-period readiness totals
- **THEN** the system obtains a projection sufficient for the displayed totals without loading unrelated detail solely for in-memory aggregation
