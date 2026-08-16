# Course Roster Management Workspace

## Purpose

Define the responsive, session-only workspace through which authorized Course roster managers upload names, reconcile identities, and inspect final membership results.

## Requirements

### Requirement: Authorized mutable roster has one responsive management workspace

System CLOIE SHALL show one `Manage roster` entry point only when the current user is an authorized Course roster manager and the Course assignment roster is mutable. It SHALL open a responsive management workspace with equivalent `Add members`, `Review and resolve`, and `Results` steps, assignment context, keyboard operation, touch-safe controls, and contained scrolling at desktop and mobile widths.

#### Scenario: Authorized manager opens workspace

- **GIVEN** an authorized `FACULTY`, `SECRETARY`, `DEAN`, or selected-Program `PROGRAM_HEAD` user opens a mutable Course roster
- **WHEN** the user selects `Manage roster`
- **THEN** System CLOIE SHALL offer name CSV upload, name-column template download, and scoped Student search without email-entry input

#### Scenario: Read-only roster is viewed

- **GIVEN** the assignment is inactive, its Academic Period is inactive, a Course-bound evaluation is published, or the user lacks management authority
- **WHEN** roster detail renders
- **THEN** System CLOIE SHALL not show the management entry and SHALL preserve lifecycle/non-disclosing feedback

#### Scenario: Mobile manager reconciles rows

- **GIVEN** the workspace is rendered below the desktop breakpoint
- **WHEN** the manager reviews ambiguous candidates and confirmation controls
- **THEN** the workspace SHALL keep content scrollable, actions reachable, focus visible, and required interaction independent of hover

### Requirement: Workspace separates input, reconciliation, and results

The workspace SHALL show `Add members`, `Review and resolve`, and `Results`. A valid upload SHALL advance to preview without membership mutation. Final results SHALL appear only after explicit confirmation. Manual add SHALL use scoped Student search and direct identity-based Add.

#### Scenario: CSV upload is valid

- **GIVEN** a manager selects a valid name roster CSV
- **WHEN** preview succeeds
- **THEN** the workspace SHALL show assignment context, grouped counts, every source row, match/disposition states, and required row actions before any membership is created or restored

#### Scenario: Suggested rows exist

- **GIVEN** preview contains suggested matches
- **WHEN** the manager reaches final confirmation
- **THEN** the workspace SHALL show the current suggested count and require acknowledgement before enabling confirmation

#### Scenario: Confirmation partially succeeds

- **GIVEN** some rows are created or restored and other rows return expected or unexpected failures
- **WHEN** confirmation completes or stops
- **THEN** Results SHALL show grouped totals, every attempted, skipped, or unprocessed source row, safe messages, an opaque support reference when applicable, and failed-row download

### Requirement: Workspace state is session-only and discard-safe

The workspace SHALL keep upload, preview, reconciliation choices, search results, and final results only for the current session. It SHALL clear state on completed close/reopen and SHALL request confirmation before discarding a dirty preview. It SHALL not reverse completed membership writes.

#### Scenario: Dirty preview is dismissed

- **GIVEN** uploaded or reconciled rows exist and no confirmation is pending
- **WHEN** the manager closes, escapes, or swipes away the workspace
- **THEN** System CLOIE SHALL request confirmation before discarding the session state

#### Scenario: Confirmation is pending

- **GIVEN** final confirmation is pending
- **WHEN** the manager attempts to close or submit again
- **THEN** System CLOIE SHALL prevent duplicate submission and preserve the action result without exposing technical errors

#### Scenario: Workspace reopens

- **GIVEN** a completed or discarded workspace was closed
- **WHEN** the manager opens `Manage roster` again
- **THEN** the workspace SHALL begin at `Add members` without prior preview or result data
