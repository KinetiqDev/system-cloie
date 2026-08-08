## ADDED Requirements

### Requirement: Appearance preference resolves before application paint
The system SHALL support Light, Dark, and System appearance preferences through one root semantic token contract where the server-owned appearance rollout is enabled. A missing, malformed, or unavailable persisted preference SHALL resolve to System without preventing application rendering. System SHALL follow the current operating-system color preference, while an explicit Light or Dark preference SHALL take precedence.

#### Scenario: New browser resolves System
- **GIVEN** an authenticated or public visitor with no valid persisted appearance preference
- **WHEN** the document loads in an environment where the server-owned appearance rollout is enabled
- **THEN** the document SHALL resolve the operating-system appearance before the application content is visibly painted and SHALL persist System only after a user explicitly selects or confirms it.

#### Scenario: Explicit preference overrides the operating system
- **GIVEN** a visitor has an explicitly persisted Dark preference and the operating system prefers Light
- **WHEN** the document loads in an environment where the server-owned appearance rollout is enabled
- **THEN** the root document SHALL resolve Dark and all semantic token consumers SHALL render the Dark values without changing page content or hierarchy.

#### Scenario: System follows an operating-system change
- **GIVEN** a visitor has selected System appearance
- **WHEN** the operating-system appearance changes while the application remains open
- **THEN** the root document SHALL update to the newly resolved appearance without navigation or loss of route, form, filter, scroll, or async state.

#### Scenario: Persisted preference is unusable
- **GIVEN** browser storage is unavailable or contains an unsupported appearance value and the server-owned rollout is enabled
- **WHEN** the document loads
- **THEN** the application SHALL remain usable with System resolution and SHALL not throw an appearance-related error or block rendering.

#### Scenario: Primary Production appearance rollout is unavailable
- **GIVEN** primary Production has not set the server-only `CLOIE_APPEARANCE_ENABLED` release setting to `"true"`
- **WHEN** any visitor, including one with a persisted Dark preference or an operating-system Dark preference, loads the application
- **THEN** the document SHALL force Light tokens before paint, SHALL ignore persisted Light/Dark/System values, and SHALL NOT write an appearance preference.

### Requirement: Appearance controls are accessible and consistently available
The system SHALL provide text-labeled Light, Dark, and System controls through a standalone appearance trigger with radio semantics, placed in the authenticated topbar and on public routes, where the server-owned appearance rollout is enabled. Controls SHALL expose the current selection programmatically, be keyboard-operable, and not rely on a sun or moon icon as their only accessible name. Without the rollout, the trigger SHALL render nothing.

#### Scenario: User changes appearance from the topbar trigger
- **GIVEN** a complete or deferred-enrollment authenticated account is viewing a page where the topbar appearance trigger is visible and the server-owned rollout is enabled
- **WHEN** the account activates an appearance option in the trigger dropdown
- **THEN** the selected option SHALL become the current persisted preference and the trigger SHALL communicate the selected state to assistive technology.

#### Scenario: User changes appearance on a public page
- **GIVEN** a visitor is on a public route where the mirrored appearance trigger is visible and the server-owned rollout is enabled
- **WHEN** the visitor selects Light, Dark, or System
- **THEN** the control SHALL persist the selection, resolve the root document before paint, and SHALL update the current document without resetting route or application state.

#### Scenario: Blocked or incomplete account cannot use appearance as a bypass
- **GIVEN** an account with an incomplete self-service role claim, an inactive account, or an unauthenticated visitor requests an authenticated route
- **WHEN** the request does not pass the existing authenticated account-state guard
- **THEN** the system SHALL preserve the existing safe redirect or account-status behavior and SHALL not expose appearance selection as an authorization bypass.

#### Scenario: Appearance control is unavailable before Production rollout
- **GIVEN** primary Production has not set the server-owned `CLOIE_APPEARANCE_ENABLED` release setting to exact `"true"`
- **WHEN** an authenticated account or public visitor loads the application
- **THEN** the topbar and public appearance triggers SHALL render nothing and SHALL NOT write an appearance preference.

### Requirement: Appearance changes preserve semantic and responsive parity
The system SHALL change resolved token values only. Appearance changes SHALL NOT alter SystemRole authorization, active account role, route grouping, responsive navigation mode, responsive breakpoint, content order, component anatomy, or status meaning.

#### Scenario: Theme changes on a role-owned route
- **GIVEN** an active account is viewing a role-owned route and the server-owned rollout is enabled
- **WHEN** the account changes appearance
- **THEN** the account SHALL retain the same authorized route, data scope, active navigation destination, and responsive navigation pattern before and after the change.

#### Scenario: Appearance is changed during a pending local interaction
- **GIVEN** a user has an active form, filter, dialog, table selection, or local asynchronous action
- **WHEN** the user changes appearance
- **THEN** the system SHALL retain that local interaction state unless the existing product flow independently completes, fails, or dismisses it.
