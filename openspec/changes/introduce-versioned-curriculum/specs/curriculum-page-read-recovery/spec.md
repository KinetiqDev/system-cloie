## ADDED Requirements

### Requirement: Curriculum management page recovers from read failures
The system SHALL surface a safe, actionable error state when curriculum list, version detail, or course-option reads fail, with a retry control that reloads the affected scope. A failed read SHALL NOT leave the page on an indefinite loading state or present stale data as an empty state.

#### Scenario: Curriculum list read fails

- **WHEN** loading the curriculum list for the selected Program fails
- **THEN** the page shows a safe error message with a Retry control instead of the loading placeholder or the empty state

#### Scenario: Retry reloads the curriculum list

- **WHEN** the user selects Retry after a curriculum list failure
- **THEN** the list reloads and replaces the error state on success

#### Scenario: Version detail read fails

- **WHEN** loading the selected version's course detail fails
- **THEN** the page shows a safe error message near the course table with a Retry control, and the selected version remains listed

#### Scenario: Course options read fails

- **WHEN** loading course options for the add-course picker fails
- **THEN** the page shows a safe error message instead of silently offering an empty picker

### Requirement: Curriculum list shows a structural loading state
The initial curriculum list load SHALL render a structural placeholder matching the list geometry rather than text-only feedback.

#### Scenario: Initial list load

- **WHEN** the curriculum list is loading for the first time
- **THEN** the page shows a structural skeleton for the tab strip and version rows
