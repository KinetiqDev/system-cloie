## ADDED Requirements

### Requirement: Student ID is not collected, stored, or used
System CLOIE SHALL NOT request, accept, persist, display, export, or use a Student-entered institutional ID. No replacement Student-entered identifier SHALL be introduced.

#### Scenario: Student completes onboarding with an active Academic Period
- **GIVEN** a Google-authenticated account with a canonical `User.name` and valid STUDENT role claim
- **WHEN** the Student submits Program, applicable Major, year level, and section
- **THEN** System CLOIE SHALL create or update the Student academic profile and active placement without a Student ID field

#### Scenario: Student completes deferred onboarding
- **GIVEN** no active Academic Period exists
- **WHEN** the Student submits Program and applicable Major
- **THEN** System CLOIE SHALL create the Student academic profile without Student ID, year level, or section and SHALL preserve deferred-enrollment behavior

#### Scenario: Secretary creates or edits a Student
- **GIVEN** an authenticated SECRETARY manages a Student account
- **WHEN** the create or protected edit form is submitted
- **THEN** Student ID SHALL not be rendered, validated, transmitted, or written

#### Scenario: Authorized preview renders Students
- **GIVEN** an authorized roster, enrollment, Student profile, central-deployment, or Course-bound respondent preview is rendered
- **WHEN** Student data is prepared
- **THEN** the DTO and UI SHALL omit Student ID

### Requirement: Student profile sufficiency uses authoritative domain records
After Student ID removal, roster eligibility SHALL treat a Student profile as sufficient only when `StudentAcademicProfile` exists with a valid active Program and an active Program-owned Major when the Program has active Majors. Active account role and active assignment-period placement SHALL remain separate required conditions.

#### Scenario: Former Student ID value is absent
- **GIVEN** a Student has a sufficient profile and valid active placement but no Student ID value
- **WHEN** roster or Course-bound participation eligibility is evaluated
- **THEN** System CLOIE SHALL not return `PROFILE_INCOMPLETE` because of the removed identifier

#### Scenario: Program requires a Major
- **GIVEN** the Student profile Program has active Majors and the profile has no valid active Program-owned Major
- **WHEN** eligibility is evaluated
- **THEN** System CLOIE SHALL report a safe incomplete-profile reason

#### Scenario: Active placement is absent
- **GIVEN** the Student profile is sufficient but no active placement exists for the assignment Academic Period
- **WHEN** roster eligibility is evaluated
- **THEN** System CLOIE SHALL report no active term placement rather than profile incompleteness

### Requirement: Existing Student ID values are discarded
System CLOIE SHALL no longer retain Student ID fields or their existing values.

#### Scenario: Student ID removal begins
- **GIVEN** Student ID values were previously collected
- **WHEN** Student ID removal is active
- **THEN** no active System CLOIE behavior or contract SHALL depend on them

#### Scenario: Student ID removal completes
- **GIVEN** no active System CLOIE behavior or contract depends on Student ID
- **WHEN** the Student ID removal completes
- **THEN** System CLOIE SHALL no longer retain Student ID fields or their existing values

#### Scenario: Service recovery preserves Student ID removal
- **GIVEN** Student ID has been removed
- **WHEN** affected service behavior is restored
- **THEN** System CLOIE SHALL not restore discarded Student ID fields or values

### Requirement: Active documentation reflects the removed identifier
Identity and Access language, Course roster language, accepted ADR supersessions, main OpenSpec contracts, user journeys, and active runbooks SHALL describe Student academic profiles without Student ID and SHALL distinguish canonical name lookup from durable account identity.

#### Scenario: Future engineer reads active contracts
- **GIVEN** Student ID removal is complete
- **WHEN** active architecture and domain documentation is consulted
- **THEN** it SHALL state that System CLOIE has no authoritative institutional Student ID source and uses `User.id` for durable identity
