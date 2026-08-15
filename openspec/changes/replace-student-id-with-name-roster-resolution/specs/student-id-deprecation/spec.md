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

### Requirement: Existing Student ID values are discarded through a safe contract migration
System CLOIE SHALL remove all application reads and writes before dropping `student_academic_profiles.student_id_number`. The database migration SHALL be generated from the Prisma schema through the repository workflow, SHALL not edit historical migrations, and SHALL regenerate Supabase TypeScript types after application.

#### Scenario: Compatibility release is deployed
- **GIVEN** the nullable database column still exists
- **WHEN** release gate A is deployed
- **THEN** no production query, mutation, form, DTO, fixture, or active contract SHALL depend on the column

#### Scenario: Contract migration is applied
- **GIVEN** release gate A has been verified
- **WHEN** release gate B is executed
- **THEN** the generated SQL SHALL drop the column, existing values SHALL be discarded, and regenerated Supabase types SHALL omit it

#### Scenario: Historical migration is reviewed
- **GIVEN** the initial schema migration contains the former column
- **WHEN** documentation or migration history is inspected
- **THEN** that historical migration SHALL remain unchanged as deployed history

### Requirement: Active documentation reflects the removed identifier
Identity and Access language, Course roster language, accepted ADR supersessions, main OpenSpec contracts, user journeys, and active runbooks SHALL describe Student academic profiles without Student ID and SHALL distinguish canonical name lookup from durable account identity.

#### Scenario: Future engineer reads active contracts
- **GIVEN** the Student ID contract migration is complete
- **WHEN** active architecture and domain documentation is consulted
- **THEN** it SHALL state that System CLOIE has no authoritative institutional Student ID source and uses `User.id` for durable identity
