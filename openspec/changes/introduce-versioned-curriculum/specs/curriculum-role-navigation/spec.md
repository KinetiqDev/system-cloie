## ADDED Requirements

### Requirement: Curriculum management routes are discoverable through role navigation

The system SHALL expose Curriculum management as a role-navigation destination for SECRETARY and PROGRAM_HEAD users. The Secretary destination SHALL use `/secretary/curricula`. The Program Head destination SHALL preserve the selected Program context and use `/program-head/programs/[programId]/curricula`.

#### Scenario: Secretary opens Curriculum management

- **WHEN** a SECRETARY views role navigation on desktop or in the mobile navigation drawer
- **THEN** a `Curricula` destination is available and navigates to `/secretary/curricula`

#### Scenario: Program Head opens Curriculum management for selected Program

- **GIVEN** a PROGRAM_HEAD has selected an authorized Program
- **WHEN** the PROGRAM_HEAD views role navigation on desktop or in the mobile navigation drawer
- **THEN** a `Curricula` destination is available and navigates to that Program's canonical curricula route

#### Scenario: Program Head has no selected Program

- **WHEN** a PROGRAM_HEAD views role navigation outside a selected Program context
- **THEN** the `Curricula` destination returns to `/program-head` to select a Program before management work begins

#### Scenario: Curriculum management route is current

- **WHEN** a SECRETARY or PROGRAM_HEAD opens a Curriculum management route
- **THEN** the `Curricula` navigation destination is the only matching destination exposing `aria-current="page"`
