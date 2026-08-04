## ADDED Requirements

### Requirement: Quantitative charts use the approved semantic chart system
The system SHALL render quantitative analytics with existing Recharts through shared chart presentation primitives and the approved theme-resolved Chart 1 through Chart 5 categorical roles. Charts SHALL NOT introduce another chart library or use raw component-local palettes.

#### Scenario: Chart is viewed in Light and Dark
- **GIVEN** a quantitative chart is rendered on a route where the server-owned appearance rollout is available
- **WHEN** the chart displays in Light and Dark appearances
- **THEN** its series, grid, labels, tooltip, legend, marker, and card surfaces SHALL resolve from the corresponding semantic chart and support tokens.

#### Scenario: Chart has more than five categories
- **GIVEN** a chart contains more than five distinct categories
- **WHEN** the chart is rendered
- **THEN** repeated categorical colors SHALL be supplemented by deterministic markers, lines, patterns, direct labels, or another non-color distinction and SHALL NOT expand the raw palette beyond the approved five-role palette.

#### Scenario: Chart has no data or fails to load
- **GIVEN** authorized chart data is absent, loading, or unavailable due to an error
- **WHEN** the chart region renders
- **THEN** it SHALL render a distinct semantic empty, structural loading, or actionable error state rather than an unlabeled blank chart.

### Requirement: Charts provide accessible interpretation
The system SHALL present visible legends and keyboard-reachable or equivalent exact-value access for interactive chart data. Each chart SHALL provide a concise text summary of its key insight and a tabular value alternative or equivalent accessible data representation. Color alone SHALL NOT convey a series or status meaning.

#### Scenario: Screen-reader user encounters a chart
- **GIVEN** a screen-reader user navigates a page that contains a quantitative chart
- **WHEN** the chart region is encountered
- **THEN** the region SHALL identify the chart, expose its key insight, and provide an accessible representation of the underlying displayed values.

#### Scenario: User inspects a series value
- **GIVEN** a pointer, keyboard, or touch user interacts with a chart
- **WHEN** the user requests a data value
- **THEN** the system SHALL communicate the series or category name and exact value through an accessible tooltip, label, table, or equivalent control.

### Requirement: Chart data remains server-authorized and privacy-narrowed
The system SHALL continue to prepare and authorize analytics data in Server Components or server-only services before passing minimal serializable aggregate data to client-side Recharts or word-cloud rendering. The concurrent `improve-navigation-rendering-and-caching` change SHALL complete server-side payload narrowing as a prerequisite before this change renders any chart visualization. Chart client components and Server Action chart DTOs SHALL NOT receive respondent identifiers, account emails, raw response rows, raw submitted qualitative response text, or unused authorization context. Payloads SHALL contain only display metadata, quantitative aggregates, word-frequency tokens, response counts, and allowed chart labels.

#### Scenario: Authorized analytics chart is rendered
- **GIVEN** an authorized role opens an analytics surface
- **WHEN** the chart receives its prepared aggregate data
- **THEN** the server SHALL have enforced the existing role and scope rules before the data reaches the client component.

#### Scenario: Qualitative word cloud is rendered
- **GIVEN** the concurrent rendering change has completed the Faculty analytics DTO privacy narrowing
- **WHEN** the word cloud is displayed
- **THEN** its visual colors SHALL resolve from the approved chart tokens and it SHALL receive only server-computed word-frequency tokens, response counts, and summary data rather than raw submitted qualitative response text.

#### Scenario: Faculty selects analytics evaluations
- **GIVEN** a Faculty user selects one or more Course-bound evaluations in the interactive analytics surface and the concurrent rendering change has completed the DTO narrowing
- **WHEN** the server-authorized analytics result is serialized
- **THEN** it SHALL contain only chart aggregates, word-frequency tokens, response counts, and display metadata required by the charts, and SHALL exclude raw submitted qualitative response text, response rows, respondent identifiers, and account emails. The field formerly known as `qualitativeTexts` SHALL NOT appear in the client-facing payload.
