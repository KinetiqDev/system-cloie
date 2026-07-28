## ADDED Requirements

### Requirement: Primary route content is usable before nonessential interactive payloads
The system SHALL defer client-only charts, word clouds, drag-and-drop surfaces, and other heavy interactive payloads when they are not required for the route's initial primary content.

#### Scenario: Faculty dashboard first renders
- **WHEN** a Faculty Member opens the dashboard
- **THEN** the server-rendered heading and KPI content are usable before below-the-fold chart and word-cloud client payloads finish loading

#### Scenario: Deferred visualization is loading
- **WHEN** a deferred chart or word cloud has not loaded
- **THEN** the system reserves comparable layout space with an accessible loading fallback and does not disclose private raw response content

### Requirement: Server prepares visualization data within the authorization boundary
The system SHALL fetch and authorize data for visualizations in Server Components or server-only feature services and SHALL pass only prepared serializable data to Client Components. Prepared visualization props SHALL contain only the minimum aggregate or de-identified values required by the visualization and SHALL NOT contain respondent identifiers, account email, raw response rows, qualitative comments, or unused authorization context.

#### Scenario: Authorized visualization data is prepared
- **WHEN** a role dashboard renders a chart or word cloud
- **THEN** the system applies the route's role and program/course scope before sending prepared visualization data to the client

#### Scenario: Unauthorized visualization route is requested
- **WHEN** a user lacks access to a dashboard or review route
- **THEN** the system denies the route before it sends visualization data or client visualization state
