## ADDED Requirements

### Requirement: Role navigation identifies one current nested route consistently
The system SHALL derive one deepest matching navigation destination from the current route using a shared normalized prefix-aware selection rule. Each navigation surface SHALL expose `aria-current="page"` only on that destination. Ancestor groups MAY be visually expanded or contextual but SHALL NOT claim to be the current page when a deeper destination matches.

#### Scenario: User opens a nested role route
- **WHEN** a user opens a nested route such as a course edit page, roster detail, or Dean academic-structure child route
- **THEN** the deepest owning navigation item is visually active and is the only visible navigation link exposing `aria-current="page"`

#### Scenario: User opens an unrelated role-owned route
- **WHEN** a user navigates outside a navigation item's route prefix
- **THEN** that navigation item is not marked active

### Requirement: Role navigation communicates pending navigation locally
The system SHALL provide subtle pending feedback on a selected role navigation link when its destination is not immediately ready, while route-level loading UI remains the primary destination feedback.

#### Scenario: Slow destination is selected
- **WHEN** a user selects a role navigation link whose route transition remains pending
- **THEN** the selected link communicates pending state without disabling unrelated navigation controls or replacing the route body with a global spinner

### Requirement: Responsive navigation remains accessible and coherent
The system SHALL provide a labeled, keyboard-operable role navigation surface at every supported viewport. Responsive role navigation SHALL not create conflicting active-route semantics between desktop, drawer, and bottom-navigation surfaces.

#### Scenario: Keyboard user opens mobile navigation
- **WHEN** a keyboard user opens the mobile navigation drawer
- **THEN** focus remains within the drawer until it is closed, Escape closes it, and focus returns to the trigger

#### Scenario: Filter control is rendered
- **WHEN** a role-owned filter bar renders a select-like control
- **THEN** the control has a visible label or a programmatic accessible name that identifies its filter purpose
