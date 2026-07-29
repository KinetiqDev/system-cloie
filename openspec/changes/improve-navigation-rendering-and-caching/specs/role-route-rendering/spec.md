## ADDED Requirements

### Requirement: Authenticated role-owned routes provide a stable loading experience

The system SHALL render a role-neutral authenticated-shell fallback while runtime session and account-state resolution is pending, and SHALL render protected route content only after server-side session, account-state, and role access checks complete.

#### Scenario: Authenticated route begins rendering before shell session data resolves

- **WHEN** an authenticated user navigates to a role-owned route whose session or route data is slow
- **THEN** the system displays a stable authenticated-shell fallback without protected page data until the server authorization boundary resolves

#### Scenario: Unauthenticated request reaches an authenticated route

- **WHEN** a request has no valid authorized application session
- **THEN** the system redirects to the role selection portal without rendering protected role content in a loading fallback

For an isolated dedicated demo deployment only, a valid signed demo session is an authorized application session. Primary Production continues to require a Google-authenticated account session.

#### Scenario: Account state is not permitted to enter a dashboard

- **WHEN** an inactive account, rejected external account, incomplete self-service role claim, or account with another incomplete role requirement requests a role-owned route
- **THEN** the system preserves the existing account-status or onboarding destination and does not render the requested route content

### Requirement: Role routes provide meaningful loading and localized recovery boundaries

The system SHALL provide route or section loading UI for asynchronous high-traffic role routes and SHALL provide role-scoped error recovery that preserves the outer application shell where possible.

#### Scenario: High-traffic list route is loading

- **WHEN** a Secretary, Dean, Program Head, Faculty Member, Student, Alumni, or Industry Partner opens an asynchronous dashboard, list, detail, or form route with a defined fallback
- **THEN** the system shows a lightweight skeleton matching the route's primary geometry until its data is available

#### Scenario: Role route read fails

- **WHEN** an unhandled route read error occurs below a role error boundary
- **THEN** the system displays a retryable role-scoped error state while retaining navigation and without exposing internal error details

### Requirement: Initial role-owned list content is server-rendered

The system SHALL render the initial authorized records for converted role-owned list routes in a Server Component response. Client Components SHALL be limited to interactions that require browser state, event handling, dialogs, charts, or form behavior.

#### Scenario: Course Assignments route first loads

- **WHEN** a Secretary, Dean, or Program Head opens their role-owned Course Assignments route
- **THEN** the first authorized page of Course Assignments is included in the server-rendered route result and is not fetched solely by a mount-time Server Action after hydration

#### Scenario: List filter changes

- **WHEN** a user changes a converted list filter or page control
- **THEN** the system represents the supported filter and page state in the route URL and renders results through the server-authorized route boundary

#### Scenario: Program Head list scope is requested

- **WHEN** a Program Head opens or filters Course Assignments
- **THEN** the system returns only Course Assignments within the Program Head's authorized Academic Program scope while preserving General Education rules
