## ADDED Requirements

### Requirement: Archive requires explicit confirmation

The system SHALL require explicit confirmation before archiving a School Year. The confirmation SHALL name the School Year, state that the action is irreversible, and use destructive visual treatment. Dismissing the confirmation SHALL NOT archive the School Year.

#### Scenario: Secretary confirms archiving a School Year

- **WHEN** a Secretary selects Archive on an inactive School Year and confirms the dialog
- **THEN** the archive server action runs exactly once and the view refreshes

#### Scenario: Secretary dismisses the archive confirmation

- **WHEN** a Secretary selects Archive on an inactive School Year and dismisses the dialog
- **THEN** the School Year remains unarchived and no server action runs

### Requirement: Cancelling an active term requires explicit confirmation

The system SHALL require explicit confirmation before cancelling an ACTIVE academic term. The confirmation SHALL name the term, state that the cancellation is terminal, and use destructive visual treatment. Dismissing the confirmation SHALL NOT cancel the term.

#### Scenario: Secretary confirms cancelling an active term

- **WHEN** a Secretary selects Cancel on an ACTIVE term and confirms the dialog
- **THEN** the term transitions to CANCELLED exactly once through the lifecycle action and the view refreshes

#### Scenario: Secretary dismisses the cancel confirmation

- **WHEN** a Secretary selects Cancel on an ACTIVE term and dismisses the dialog
- **THEN** the term remains ACTIVE and no server action runs
