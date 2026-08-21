# general-education-coordinator-role Specification

## Purpose
TBD - created by archiving change add-general-education-coordinator. Update Purpose after archive.
## Requirements
### Requirement: Coordinator is a pre-provisioned single account role

The system SHALL support `GEN_ED_COORDINATOR` as one active System CLOIE account
role.
Secretary provisioning SHALL require an eligible institutional email and SHALL
not require `program_id`. Self-service role claim SHALL reject the Coordinator
role. The role SHALL share the existing account-state handling for inactive,
incomplete, and complete accounts.

The system SHALL not provision or authorize a Coordinator account until the
institution has approved whether all Coordinators share one college-wide General
Education scope or have separate portfolios. This change specifies only the
shared-scope option; a portfolio model requires a separate approved capability.

#### Scenario: Secretary provisions a Coordinator

- **GIVEN** a Secretary creates an internal account with an eligible institutional email
- **WHEN** the Secretary selects `GEN_ED_COORDINATOR` and provides the required canonical account name
- **THEN** the system creates a complete pre-provisioned Coordinator account without a Program or additional assignment row

#### Scenario: Shared Coordinator scope is not approved

- **GIVEN** the institution has not approved the shared college-wide Coordinator scope
- **WHEN** an administrator attempts to provision a Coordinator
- **THEN** the system does not enable Coordinator provisioning under this change

#### Scenario: User attempts a self-service Coordinator claim

- **GIVEN** a person enters the role selection portal
- **WHEN** the person selects `GEN_ED_COORDINATOR` as a self-service role
- **THEN** the system rejects the role claim and does not create or change an account role

#### Scenario: Inactive Coordinator requests access

- **GIVEN** an account has active role `GEN_ED_COORDINATOR` and is inactive
- **WHEN** the account requests a Coordinator route
- **THEN** the system preserves the existing inactive-account destination and does not render protected Coordinator content

### Requirement: Coordinator routes are role-owned and fail closed

The system SHALL provide a role-owned `/gen-ed-coordinator` route tree with
dashboard, Course Assignments, analytics, and profile destinations. The route
layout SHALL allow only `GEN_ED_COORDINATOR`. A complete Coordinator SHALL be
routed to `/gen-ed-coordinator/dashboard` after login. Other roles and
unauthenticated requests SHALL fail through the existing non-disclosing route
behavior.

#### Scenario: Complete Coordinator signs in

- **GIVEN** a complete active account has role `GEN_ED_COORDINATOR`
- **WHEN** the account completes login
- **THEN** the system routes the account to `/gen-ed-coordinator/dashboard`

#### Scenario: Another role requests a Coordinator route

- **GIVEN** an authenticated account has a role other than `GEN_ED_COORDINATOR`
- **WHEN** the account requests `/gen-ed-coordinator/course-assignments`
- **THEN** the server denies access without returning Coordinator data

#### Scenario: Unauthenticated request reaches a Coordinator route

- **GIVEN** a request has no valid authorized application session
- **WHEN** the request reaches `/gen-ed-coordinator/dashboard`
- **THEN** the system redirects to the role selection portal without rendering protected data in a loading fallback

### Requirement: Coordinator routes preserve authenticated rendering behavior

The Coordinator route tree SHALL provide the existing authenticated-shell
fallback, route or section loading UI, role-scoped retryable error recovery, and
Server Component initial data behavior. Supported list filters and page state
SHALL be represented in the URL.

#### Scenario: Coordinator list route is loading

- **GIVEN** an authorized Coordinator opens the Course Assignments route while its read is pending
- **WHEN** the route displays its loading state
- **THEN** the system shows structural loading feedback without exposing protected records before authorization completes

#### Scenario: Coordinator route read fails

- **GIVEN** an authorized Coordinator route read fails unexpectedly
- **WHEN** the route error boundary renders
- **THEN** the system shows a retryable role-scoped error while preserving the outer navigation and hiding internal error details

#### Scenario: Coordinator changes a list filter

- **GIVEN** an authorized Coordinator changes a supported Course Assignments filter or page
- **WHEN** the route navigates to the new state
- **THEN** the URL contains the canonical filter or page state and the server renders the authorized result

### Requirement: Coordinator navigation works across supported viewports

The Coordinator navigation SHALL include the Coordinator dashboard, Course
Assignments, analytics, and profile destinations. It SHALL use the existing
active-route, pending-navigation, keyboard, drawer, and touch-target behavior.

#### Scenario: Coordinator opens a nested route

- **GIVEN** an authorized Coordinator opens a nested Coordinator route
- **WHEN** the navigation renders
- **THEN** the deepest matching destination is the only link marked current

#### Scenario: Coordinator opens mobile navigation

- **GIVEN** an authorized Coordinator views the app at a mobile viewport
- **WHEN** the Coordinator opens the navigation drawer with keyboard or touch
- **THEN** the drawer remains accessible, supports Escape, and returns focus to its trigger when closed

