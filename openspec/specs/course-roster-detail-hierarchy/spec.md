# course-roster-detail-hierarchy Specification

## Purpose
TBD - created by archiving change redesign-course-roster-management-ui. Update Purpose after archive.
## Requirements
### Requirement: Course roster detail presents assignment scope and distinct counts
The Course roster detail SHALL show Course code, Course title, Program, year level, Class section, Academic Period, and roster lifecycle state before roster-management controls. It SHALL separately show active Course-assignment membership count and current evaluation-eligible count using tabular numeric presentation.

#### Scenario: Open roster shows context and counts
- **GIVEN** an authorized user opens a Course roster detail
- **WHEN** detail data loads successfully
- **THEN** the system SHALL display Course-assignment context, lifecycle state, active roster count, and current evaluation-eligible count before the member table

#### Scenario: Counts differ because a member is ineligible
- **GIVEN** a Course-assignment roster has active memberships including a currently ineligible Student
- **WHEN** the Course roster detail renders
- **THEN** the system SHALL display active roster and current evaluation-eligible values as distinct counts

### Requirement: Detail management entry preserves roster review hierarchy
For a mutable authorized Course roster, the detail SHALL present one compact management entry after context and counts and before the roster member table. Search, removed-history filter, member table, pagination, soft removal, and restoration SHALL retain existing behavior and order below this entry.

#### Scenario: Manager reviews members after opening management entry
- **GIVEN** a Course roster manager views an open roster
- **WHEN** the management workspace is closed without a navigation change
- **THEN** the system SHALL retain the roster member table, search state, removed-history filter, and pagination controls on the detail page

#### Scenario: Empty member view remains actionable
- **GIVEN** a Course roster detail has no members matching the current search or removed-history filter
- **WHEN** the detail renders
- **THEN** the system SHALL distinguish no matching Students from load failure and SHALL retain available management entry only when the roster is mutable and authorized

### Requirement: Detail errors remain privacy-safe
The Course roster detail SHALL retain existing safe error presentation and route behavior. It SHALL not expose internal IDs, database errors, or authorization distinctions when detail data is unavailable.

#### Scenario: Unavailable roster detail
- **GIVEN** a requested Course assignment is missing or unavailable to the current user
- **WHEN** the detail route resolves the request
- **THEN** the system SHALL preserve existing non-disclosing not-found behavior

#### Scenario: Safe non-not-found error
- **GIVEN** an authorized roster detail request fails unexpectedly after server handling
- **WHEN** the detail surface renders its error state
- **THEN** the system SHALL show a safe error message and opaque support reference when supplied without technical diagnostic detail

