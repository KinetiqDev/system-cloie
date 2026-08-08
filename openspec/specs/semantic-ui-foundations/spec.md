# Semantic UI Foundations

## Purpose

Provides approved theme-resolved design tokens, typography utilities, component variants, status roles, feedback roles, and visualization roles for all shared UI.

## Requirements

### Requirement: Shared UI resolves through approved semantic tokens

The system SHALL resolve foundations and shared UI through the approved Light and Dark semantic roles in `docs/design.md`. Components SHALL use semantic background, foreground, border, input, popover, selection, focus, status, overlay, and chart roles rather than raw theme-specific color values or component-local palettes.

#### Scenario: Shared surface renders in both appearances

- **GIVEN** a Card, form control, navigation surface, overlay, table, or feedback component is composed from shared `src/components/ui/` primitives
- **WHEN** it is rendered in Light and Dark
- **THEN** it SHALL use the same component anatomy and semantic role while resolving the approved theme-specific surface, text, border, focus, and elevation values.

#### Scenario: Focused control is rendered

- **GIVEN** a keyboard user tabs to an interactive shared component
- **WHEN** the component receives focus
- **THEN** it SHALL show a visible dedicated focus ring that remains distinguishable from information, primary action, and selection in both appearances.

#### Scenario: Selected or disabled control is rendered

- **GIVEN** a shared navigation item, tab, selectable control, or button is in a selected or disabled state
- **WHEN** the page is rendered in either Light or Dark
- **THEN** the state SHALL be programmatically exposed where applicable and visually distinguishable without using color as the only cue.

### Requirement: Approved action and status hierarchy is preserved

The system SHALL provide primary, neutral secondary, outline, ghost, destructive, link, icon, and specialized brand-accent actions through the shared Button. Secondary SHALL remain neutral. Brand accent SHALL be separately named and SHALL NOT act as a second default primary. Status feedback SHALL use success, warning, danger, or information semantic roles with readable text and an icon, label, shape, or other non-color cue.

#### Scenario: Routine secondary action is rendered

- **GIVEN** a page presents a secondary action
- **WHEN** the button is rendered in either Light or Dark
- **THEN** it SHALL use the neutral secondary role and SHALL NOT use ACD cyan or legacy gold as a default secondary action.

#### Scenario: Destructive action is confirmed

- **GIVEN** a destructive operation requires confirmation
- **WHEN** the confirmation dialog is rendered
- **THEN** its confirmation action SHALL use the shared destructive treatment and its dialog SHALL identify the action, consequence, and safe cancellation path.

#### Scenario: Feedback is communicated

- **GIVEN** a success, warning, error, or information state must be presented through an alert, badge, or toast
- **WHEN** the feedback is displayed in either Light or Dark
- **THEN** it SHALL use the matching semantic token family, include a readable message, and remain legible.

### Requirement: Forms, loading, empty, error, and overlay states are accessible

The system SHALL compose forms from shared control and field primitives with visible labels, helper/error text adjacent to the relevant field, accessible invalid/disabled state, and retained `customZodResolver` behavior. Shared loading, empty, error, dialog, drawer, popover, dropdown, tooltip, and confirmation surfaces SHALL use approved semantic roles and accessibility behavior.

#### Scenario: Form validation fails

- **GIVEN** a user submits an invalid form field
- **WHEN** validation runs
- **THEN** the field SHALL expose its invalid state programmatically and present a nearby actionable error without relying on placeholder text or color alone.

#### Scenario: Async action is pending

- **GIVEN** a shared async button action has been triggered
- **WHEN** the action is pending
- **THEN** the action SHALL prevent duplicate submission, preserve its width, expose a loading state, and remain understandable without animation.

#### Scenario: Overlay opens and closes

- **GIVEN** a user opens a dialog, drawer, popover, dropdown, tooltip, or destructive confirmation
- **WHEN** the overlay renders and later closes
- **THEN** the surface SHALL use its semantic overlay treatment, retain its accessible title where required, support keyboard operation, and restore focus according to the underlying Base UI behavior.

#### Scenario: Content is unavailable

- **GIVEN** a route or section has no data, is loading, fails, or displays the approved offline reference pattern
- **WHEN** the state is rendered
- **THEN** it SHALL distinguish those states with structural skeletons or a clear icon, title, explanation, and recovery action where an action is available.

### Requirement: Visual foundations comply with the approved scale

The system SHALL retain Manrope for headings and Inter for body/control text, use the approved token type utilities, retain the approved 4/8 spacing rhythm and radius/elevation scale, use Lucide as the sole icon family, and keep interactive mobile targets at least 44 by 44 CSS pixels. No text SHALL render below `0.75rem` without a documented exception. Decorative blur SHALL NOT appear on shared components; backdrop blur is limited to overlays or approved landing chrome.

#### Scenario: Minimum type scale is enforced

- **GIVEN** any shared UI component, navigation label, or table metadata element
- **WHEN** the element is rendered in any viewport
- **THEN** its computed font size SHALL be at least `0.75rem` unless the component belongs to an approved, scoped exception.

#### Scenario: Decorative blur is absent from shared components

- **GIVEN** the shared component inventory after foundation retokenization
- **WHEN** any component in `src/components/ui/` or `src/components/layout/` is rendered
- **THEN** it SHALL NOT use decorative blur; backdrop blur SHALL appear only on overlays or approved landing chrome.

#### Scenario: Dense data is displayed

- **GIVEN** a KPI, percentage, count, or aligned table value
- **WHEN** it is displayed in either Light or Dark
- **THEN** it SHALL use tabular figures where alignment is meaningful and SHALL remain at or above the approved minimum text size of `0.75rem`.

#### Scenario: Icon-only control is rendered

- **GIVEN** a shared control contains only an icon
- **WHEN** the control is rendered
- **THEN** it SHALL use a Lucide icon, have an accessible name, preserve an adequate hit area of at least 44 by 44 CSS pixels, and use the semantic foreground and focus roles.

### Requirement: Production visual migration has complete ownership

The system SHALL maintain an audited inventory of production UI surfaces covered by the unified design-system migration. Every inventory entry SHALL have one completed migration owner before primary Production appearance rollout can be accepted.

#### Scenario: Repository readiness is evaluated

- **GIVEN** the migration slices are complete
- **WHEN** the repository readiness gate audits production UI
- **THEN** every audited route and shared component SHALL have an owning completed slice and SHALL have no unreviewed raw palette, forbidden decorative effect, sub-`0.75rem` text, or component-local Light/Dark palette.

#### Scenario: A new violation is discovered at readiness

- **GIVEN** the readiness audit finds a production surface outside the approved inventory or an unresolved violation
- **WHEN** readiness is evaluated
- **THEN** the gate SHALL fail and the surface SHALL receive an explicit migration owner before rollout; the gate SHALL NOT silently repair unowned production code.