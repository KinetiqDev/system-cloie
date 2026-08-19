## ADDED Requirements

### Requirement: Secretary outcome surfaces removed
The Secretary SHALL have no Learning Outcomes navigation item and no CILO-to-PLO mapping interface.

#### Scenario: Navigation item absent
- **WHEN** a Secretary views the Secretary navigation
- **THEN** no Learning Outcomes entry is present

#### Scenario: Removed routes redirect
- **WHEN** a Secretary visits /secretary/learning-outcomes or /secretary/learning-outcomes/alignment/[courseId]
- **THEN** the system redirects to an appropriate Secretary landing page

### Requirement: Secretary outcome write authorization removed
The server SHALL deny Secretary attempts to create, change, or remove CILO-to-PLO mappings and to encode Institutional Learning Outcomes.

#### Scenario: Crafted mapping mutation denied
- **WHEN** a Secretary sends crafted requests to create a mapping, change a manifestation, or remove a mapping
- **THEN** each request fails with an authorization error

#### Scenario: Crafted ILO encode denied
- **WHEN** a Secretary sends a crafted request to create or change an Institutional Learning Outcome through the outcome-write layer
- **THEN** the request fails with an authorization error
