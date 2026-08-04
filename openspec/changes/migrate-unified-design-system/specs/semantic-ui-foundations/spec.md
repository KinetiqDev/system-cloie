## ADDED Requirements

### Requirement: Shared UI resolves through approved semantic tokens
The system SHALL resolve foundations and shared UI through the approved Light and Dark semantic roles in `docs/design.md`. Components SHALL use semantic background, foreground, border, input, popover, selection, focus, status, overlay, and chart roles rather than raw theme-specific color values or component-local palettes.

#### Scenario: Shared surface renders in both appearances
- **WHEN** a Card, form control, navigation surface, overlay, table, or feedback component is rendered in Light and Dark
- **THEN** it SHALL use the same component anatomy and semantic role while resolving the approved theme-specific surface, text, border, focus, and elevation values.

#### Scenario: Focused control is rendered
- **WHEN** a keyboard user focuses an interactive shared component
- **THEN** the component SHALL show a visible dedicated focus ring that remains distinguishable from information, primary action, and selection in both appearances.

#### Scenario: Selected or disabled control is rendered
- **WHEN** a shared navigation item, tab, selectable control, or button is selected or disabled
- **THEN** the state SHALL be programmatically exposed where applicable and visually distinguishable without using color as the only cue.

### Requirement: Approved action and status hierarchy is preserved
The system SHALL provide primary, neutral secondary, outline, ghost, destructive, link, icon, and specialized brand-accent actions through the shared Button. Secondary SHALL remain neutral. Brand accent SHALL be separately named and SHALL NOT act as a second default primary. Status feedback SHALL use success, warning, danger, or information semantic roles with readable text and an icon, label, shape, or other non-color cue.

#### Scenario: Routine secondary action is rendered
- **WHEN** a page presents a secondary action
- **THEN** it SHALL use the neutral secondary role in both appearances and SHALL NOT use ACD cyan or legacy gold as a default secondary action.

#### Scenario: Destructive action is confirmed
- **WHEN** a destructive operation requires confirmation
- **THEN** its confirmation action SHALL use the shared destructive treatment and its dialog SHALL identify the action, consequence, and safe cancellation path.

#### Scenario: Feedback is communicated
- **WHEN** the system presents success, warning, error, or information feedback through an alert, badge, or toast
- **THEN** the feedback SHALL use the matching semantic token family, include a readable message, and remain legible in Light and Dark.

### Requirement: Forms, loading, empty, error, and overlay states are accessible
The system SHALL compose forms from shared control and field primitives with visible labels, helper/error text adjacent to the relevant field, accessible invalid/disabled state, and retained `customZodResolver` behavior. Shared loading, empty, error, dialog, drawer, popover, dropdown, tooltip, and confirmation surfaces SHALL use approved semantic roles and accessibility behavior.

#### Scenario: Form validation fails
- **WHEN** a user submits an invalid form field
- **THEN** the field SHALL expose its invalid state programmatically and present a nearby actionable error without relying on placeholder text or color alone.

#### Scenario: Async action is pending
- **WHEN** a shared async button action is pending
- **THEN** the action SHALL prevent duplicate submission, preserve its width, expose a loading state, and remain understandable without animation.

#### Scenario: Overlay opens and closes
- **WHEN** a user opens and closes a dialog, drawer, popover, dropdown, tooltip, or destructive confirmation
- **THEN** the surface SHALL use its semantic overlay treatment, retain its accessible title where required, support keyboard operation, and restore focus according to the underlying Base UI behavior.

#### Scenario: Content is unavailable
- **WHEN** a route or section has no data, is loading, fails, or displays the approved offline reference pattern
- **THEN** it SHALL distinguish those states with structural skeletons or a clear icon, title, explanation, and recovery action where an action is available.

### Requirement: Visual foundations comply with the approved scale
The system SHALL retain Manrope for headings and Inter for body/control text, use the approved token type utilities, retain the approved 4/8 spacing rhythm and radius/elevation scale, use Lucide as the sole icon family, and keep interactive mobile targets at least 44 by 44 CSS pixels.

#### Scenario: Dense data is displayed
- **WHEN** a KPI, percentage, count, or aligned table value is displayed
- **THEN** it SHALL use tabular figures where alignment is meaningful and SHALL remain at or above the approved minimum text size.

#### Scenario: Icon-only control is rendered
- **WHEN** a shared control contains only an icon
- **THEN** it SHALL use a Lucide icon, have an accessible name, preserve an adequate hit area, and use the semantic foreground/focus roles.
