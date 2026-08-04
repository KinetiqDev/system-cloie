## ADDED Requirements

### Requirement: Quantitative charts use the approved semantic chart system
The system SHALL render quantitative analytics with existing Recharts through shared chart presentation primitives and the approved theme-resolved Chart 1 through Chart 5 categorical roles. Charts SHALL NOT introduce another chart library or use raw component-local palettes.

#### Scenario: Chart is viewed in Light and Dark
- **WHEN** a quantitative chart is rendered in Light and Dark appearances
- **THEN** its series, grid, labels, tooltip, legend, marker, and card surfaces SHALL resolve from the corresponding semantic chart and support tokens.

#### Scenario: Chart has more than five categories
- **WHEN** a chart contains more than five distinct categories
- **THEN** repeated categorical colors SHALL be supplemented by deterministic markers, lines, patterns, direct labels, or another non-color distinction and SHALL NOT expand the raw palette.

#### Scenario: Chart has no data or fails to load
- **WHEN** authorized chart data is absent, loading, or unavailable due to an error
- **THEN** the chart region SHALL render a distinct semantic empty, structural loading, or actionable error state rather than an unlabeled blank chart.

### Requirement: Charts provide accessible interpretation
The system SHALL present visible legends and keyboard-reachable or equivalent exact-value access for interactive chart data. Each chart SHALL provide a concise text summary of its key insight and a tabular value alternative or equivalent accessible data representation. Color alone SHALL NOT convey a series or status meaning.

#### Scenario: Screen-reader user encounters a chart
- **WHEN** a screen-reader user reaches a chart region
- **THEN** the region SHALL identify the chart, expose its key insight, and provide an accessible representation of the underlying displayed values.

#### Scenario: User inspects a series value
- **WHEN** a pointer, keyboard, or touch user requests a chart data value
- **THEN** the system SHALL communicate the series/category name and exact value through an accessible tooltip, label, table, or equivalent control.

### Requirement: Chart data remains server-authorized
The system SHALL continue to prepare and authorize analytics data in Server Components or server-only services before passing minimal serializable aggregate data to client-side Recharts or word-cloud rendering. Chart client components and Server Action chart DTOs SHALL NOT receive respondent identifiers, account emails, raw response rows, raw submitted qualitative response text, or unused authorization context.

#### Scenario: Authorized analytics chart is rendered
- **WHEN** an authorized role opens an analytics surface
- **THEN** the server SHALL enforce the existing role and scope rules before the chart receives its prepared aggregate data.

#### Scenario: Qualitative word cloud is rendered
- **WHEN** the existing qualitative word cloud is displayed
- **THEN** its visual colors SHALL resolve from the approved chart tokens and it SHALL receive only server-computed word-frequency tokens, response counts, and summary data rather than raw submitted qualitative response text.

#### Scenario: Faculty selects analytics evaluations
- **WHEN** a Faculty user selects one or more Course-bound evaluations in the interactive analytics surface
- **THEN** the server-authorized analytics result SHALL serialize only chart aggregates, word-frequency tokens, response counts, and display metadata required by the charts, and SHALL exclude `qualitativeTexts`, response rows, respondent identifiers, and account emails.
