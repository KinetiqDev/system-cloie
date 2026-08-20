## ADDED Requirements

### Requirement: My Course Rosters uses a clear operational hierarchy
The system SHALL present My Course Rosters with a concise Faculty-owned scope heading, compact assignment search and history controls, a results toolbar, the selected assignment presentation, and pagination in that order. Noninteractive context SHALL not use link styling, and repeated Course-assignment data SHALL not be presented as nested decorative cards.

#### Scenario: Faculty opens current-period discovery
- **GIVEN** an authorized `FACULTY` user has current-period Course assignments
- **WHEN** My Course Rosters renders
- **THEN** the system SHALL show the page scope, compact search/history controls, result count, view selector, Course assignments, and open-roster actions in a clear scan order

#### Scenario: Search and history controls remain understandable
- **GIVEN** a `FACULTY` user views My Course Rosters
- **WHEN** the user reviews the filter surface
- **THEN** the system SHALL provide visible labels for assignment search and assignment history and SHALL preserve keyboard and coarse-pointer operability

### Requirement: Faculty can choose List or Card presentation
The system SHALL provide an accessible, mutually exclusive List/Card selector. List SHALL be the default when no view is specified, and Card SHALL remain an available alternate. The selected mode SHALL be conveyed programmatically and visually without relying on color alone.

#### Scenario: Default discovery uses List
- **GIVEN** a `FACULTY` user opens My Course Rosters without a view parameter
- **WHEN** the route renders successfully
- **THEN** the system SHALL render List presentation and mark List as selected

#### Scenario: Faculty switches to Card
- **GIVEN** My Course Rosters is in List presentation
- **WHEN** the `FACULTY` user selects Card
- **THEN** the system SHALL navigate to Card presentation, preserve active search and history state, reset pagination to the first page, and expose Card as selected

#### Scenario: Faculty returns to List
- **GIVEN** My Course Rosters is in Card presentation
- **WHEN** the `FACULTY` user selects List
- **THEN** the system SHALL navigate to the canonical List URL, preserve active search and history state, reset pagination to the first page, and expose List as selected

#### Scenario: Invalid view state
- **GIVEN** a request supplies a view value outside List or Card
- **WHEN** the Faculty route validates its query
- **THEN** the system SHALL preserve the existing malformed-query not-found behavior without querying a client data source

### Requirement: View state remains coherent with discovery URL state
The system SHALL keep view, search, history, and pagination state coherent across route rendering. Search, history, pagination, refresh, bookmarks, and canonical redirects SHALL not silently reset a valid selected view except that switching view SHALL reset pagination to the first page.

#### Scenario: Search preserves Card
- **GIVEN** My Course Rosters is in Card presentation
- **WHEN** the `FACULTY` user submits a Course-assignment search
- **THEN** the resulting URL and rendered result SHALL retain Card presentation and start at the first page

#### Scenario: History filter preserves Card
- **GIVEN** My Course Rosters is in Card presentation
- **WHEN** the `FACULTY` user includes inactive and completed assignment history
- **THEN** the resulting URL and rendered result SHALL retain Card presentation and start at the first page

#### Scenario: Pagination preserves presentation
- **GIVEN** filtered Course assignments span multiple pages in either valid presentation
- **WHEN** the `FACULTY` user selects Previous or Next
- **THEN** the system SHALL preserve search, history, and selected presentation while changing only the requested page

#### Scenario: Canonical page redirect preserves Card
- **GIVEN** a Card URL requests a page outside the available range
- **WHEN** the server redirects to the canonical page
- **THEN** the canonical URL SHALL preserve Card presentation and all valid active filters

### Requirement: List presentation supports efficient responsive scanning
List presentation SHALL display Course, Program, class context, Academic Period, lifecycle state, active-roster count, current evaluation-eligible count, and one open-roster action for every Course assignment. Desktop SHALL use aligned column semantics; smaller viewports SHALL use compact stacked rows without causing page-level horizontal overflow.

#### Scenario: Desktop List displays aligned assignment facts
- **GIVEN** My Course Rosters has Course assignments and List is selected at desktop width
- **WHEN** results render
- **THEN** the system SHALL show aligned labelled columns, tabular counts, text-bearing lifecycle state, and one open-roster action per assignment

#### Scenario: Mobile List remains operable
- **GIVEN** My Course Rosters has Course assignments and List is selected below the desktop table breakpoint
- **WHEN** results render
- **THEN** the system SHALL show compact stacked rows with the same essential Course-assignment facts and touch-safe open-roster actions without page-level horizontal scrolling

#### Scenario: Counts differ in List
- **GIVEN** a Course assignment has active memberships that are not currently evaluation-eligible
- **WHEN** List presentation renders that assignment
- **THEN** active-roster and current evaluation-eligible counts SHALL remain distinct and labelled

### Requirement: Card presentation is responsive and information-led
Card presentation SHALL use responsive Course-assignment cards without nested KPI cards. Each card SHALL show Course code and title, Program, class context, Academic Period, lifecycle state, distinct roster counts, and one open-roster action.

#### Scenario: Desktop Card grid adapts to available width
- **GIVEN** My Course Rosters has Course assignments and Card is selected
- **WHEN** viewport width grows from mobile through tablet to desktop
- **THEN** the system SHALL adapt from one to multiple columns while preserving readable content order and stable card actions

#### Scenario: Card exposes complete assignment scope
- **GIVEN** Card presentation renders a Course assignment
- **WHEN** the `FACULTY` user reviews the card
- **THEN** the system SHALL show Course, Program, class context, Academic Period, lifecycle state, active-roster count, current evaluation-eligible count, and one open-roster action

#### Scenario: Repeated Faculty identity is omitted
- **GIVEN** My Course Rosters contains only Course assignments owned by the active `FACULTY` user
- **WHEN** either List or Card presentation renders
- **THEN** the system SHALL not repeat the current Faculty name and email on every assignment item

### Requirement: Discovery states remain accessible and privacy-safe
The redesigned discovery SHALL preserve meaningful loading, empty, and error states. Empty results SHALL distinguish no matching Course assignments from no authorized current assignments. Errors SHALL remain safe and SHALL not expose authorization distinctions, internal identifiers, database details, or technical diagnostics.

#### Scenario: Filtered result is empty
- **GIVEN** a `FACULTY` user has authorized Course assignments but none match active search or history filters
- **WHEN** discovery renders the empty result
- **THEN** the system SHALL explain that no Course rosters match and SHALL provide a clear path to reset filters

#### Scenario: Faculty has no current Course assignments
- **GIVEN** an authorized `FACULTY` user has no current Course assignments and no filters are active
- **WHEN** discovery renders
- **THEN** the system SHALL explain that no Course rosters are currently assigned without implying a load failure and SHALL offer history inclusion when history is not already included

#### Scenario: Discovery read fails safely
- **GIVEN** the authorized discovery read fails unexpectedly after server handling
- **WHEN** My Course Rosters renders an error
- **THEN** the system SHALL show safe error copy, an opaque support reference when supplied, and a retry path without technical diagnostic detail

#### Scenario: Inactive Faculty account supplies presentation state
- **GIVEN** an inactive `FACULTY` account requests My Course Rosters with a valid List or Card parameter
- **WHEN** the request passes through account-state and discovery authorization handling
- **THEN** the system SHALL preserve existing inactive-account access behavior and SHALL not render authorized Course assignments

#### Scenario: Route transition loads
- **GIVEN** a `FACULTY` user changes filters, page, or presentation
- **WHEN** the next server-rendered result is pending
- **THEN** the system SHALL show a meaningful stable loading structure without exposing stale authorization data as a new result

### Requirement: Rendering and authorization boundaries remain server-owned
The redesign SHALL keep Course-assignment discovery, Faculty ownership checks, count preparation, pagination, and result rendering server-owned. The view selector MAY own only scalar presentation URL state and transition feedback. The system SHALL NOT add shared roster caching, browser roster fetching, Partial Prerendering, Cache Components, or client-side authorization.

#### Scenario: View selection does not change authorization scope
- **GIVEN** any valid List or Card URL
- **WHEN** the route resolves Course assignments
- **THEN** the server SHALL apply the existing `FACULTY` ownership scope before rendering either presentation

#### Scenario: Non-Faculty supplies presentation state
- **GIVEN** an account without authorized Faculty discovery access supplies a valid view parameter
- **WHEN** the request is handled
- **THEN** the view parameter SHALL grant no Course-assignment visibility or authorization capability

#### Scenario: Discovery request is fresh
- **GIVEN** Course-assignment or roster membership data changes through an authorized existing operation
- **WHEN** the `FACULTY` user next navigates to or refreshes My Course Rosters
- **THEN** the server SHALL perform the existing request-scoped read and render current data without a shared stale roster cache
