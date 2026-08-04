## ADDED Requirements

### Requirement: Design System Showcase is protected by authenticated environment access
The system SHALL provide a Design System Showcase at `/design-system` within the authenticated application shell. The route SHALL be available only in development or a valid isolated dedicated demo deployment and SHALL fail closed with not-found behavior in primary Production or when demo configuration is invalid. It SHALL rely on existing server-side account-state authentication and SHALL not trust a client-supplied role or public environment flag.

#### Scenario: Authenticated development user opens the showcase
- **WHEN** an authenticated account that passes the existing account-state guard requests `/design-system` in development
- **THEN** the system SHALL render the showcase inside the existing authenticated application shell.

#### Scenario: Demo-authenticated account opens the showcase
- **WHEN** a demo-authenticated account requests `/design-system` on an isolated dedicated demo deployment with valid signed-demo configuration
- **THEN** the system SHALL render the showcase without changing the account's active account role or authorization scope.

#### Scenario: Primary Production requests the showcase
- **WHEN** any visitor requests `/design-system` on primary Production
- **THEN** the system SHALL return not-found behavior and SHALL not render showcase content or disclose demo configuration.

#### Scenario: Unauthenticated or blocked account requests the showcase
- **WHEN** an unauthenticated, inactive, rejected external, incomplete, or otherwise gated account requests `/design-system`
- **THEN** the system SHALL preserve the existing safe authentication or account-status redirect behavior and SHALL not treat the route as public.

### Requirement: Showcase uses production design-system sources and static fixtures
The showcase SHALL render real production tokens, shared UI primitives, shared chart presentation, loading components, and centralized navigation declarations. It SHALL use typed, serializable representative fixtures and SHALL NOT query, mutate, cache, or expose institutional database data, user data, credentials, or session data.

#### Scenario: Showcase is rendered
- **WHEN** the protected showcase page is displayed
- **THEN** its color, typography, spacing, action, control, feedback, overlay, chart, and navigation examples SHALL be composed from production design-system sources rather than duplicated demo-only component implementations.

#### Scenario: User interacts with a showcase example
- **WHEN** a user validates a form, opens an overlay, changes table selection, triggers a toast, or changes the appearance within the showcase
- **THEN** the interaction SHALL use local static fixture state only and SHALL not perform a database mutation or Server Action.

### Requirement: Showcase covers approved component and state reference behavior
The showcase SHALL cover the approved installed and planned shared UI inventory: foundations; actions; controls and validation; cards/KPIs/tables/lists/tabs/badges/progress; feedback/loading/empty/error/offline-reference; dialogs/drawers/popovers/dropdowns/tooltips/confirmations; charts; role-aware navigation; and appearance parity. Each relevant interactive category SHALL expose default, hover, focus, pressed, selected, disabled, loading, error, and success states where those states apply.

#### Scenario: Reviewer changes appearance
- **WHEN** a reviewer selects Light, Dark, or System in the showcase
- **THEN** the same semantic components and information hierarchy SHALL remain visible while their resolved token values change.

#### Scenario: Reviewer validates responsive patterns
- **WHEN** the showcase is viewed at desktop, tablet, and mobile widths
- **THEN** it SHALL demonstrate the approved responsive card/grid, form, table, dialog/drawer, and role-aware navigation substitutions without horizontal overflow outside intentionally contained data tables.

#### Scenario: Reviewer validates accessibility behavior
- **WHEN** a reviewer uses keyboard navigation or assistive technology on showcase controls and overlays
- **THEN** examples SHALL expose accessible names, visible focus, logical state, required overlay focus behavior, status cues beyond color, and reduced-motion-safe feedback.

#### Scenario: Reviewer sees the offline reference
- **WHEN** a reviewer reaches the offline reference section
- **THEN** the section SHALL identify itself as a static visual reference and SHALL not claim that offline data, service-worker caching, or offline mutation behavior is available.
