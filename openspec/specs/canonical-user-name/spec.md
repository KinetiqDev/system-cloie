# Canonical User Name

## Purpose

Define the single opaque canonical account name used across System CLOIE identity, self-service registration, Secretary management, and downstream user-facing projections.

## Requirements

### Requirement: User accounts have one canonical opaque name

System CLOIE SHALL represent every persisted account with one required canonical `User.name` value. The value SHALL be treated as opaque display text and SHALL NOT be interpreted or persisted as a first name, middle name, last name, surname, or given name. An authorized Course roster workflow MAY create temporary normalized comparison forms for assignment-scoped candidate discovery, but those forms SHALL NOT overwrite the canonical value, become unique identifiers, or be persisted as roster identity data.

#### Scenario: Existing account name is displayed directly

- **GIVEN** a persisted User has the canonical name `Juan Dela Cruz`
- **WHEN** an authorized System CLOIE surface renders that account
- **THEN** the surface SHALL display `Juan Dela Cruz` as one value and SHALL NOT reconstruct it from first-name or last-name fields

#### Scenario: Canonical name is used for roster discovery

- **GIVEN** an authorized Course roster manager uploads a name with harmless casing or whitespace differences
- **WHEN** System CLOIE compares it with scoped account names
- **THEN** it MAY use a temporary normalized comparison value but SHALL preserve the uploaded source text and canonical `User.name` unchanged

#### Scenario: Name resolution completes

- **GIVEN** a manager confirms a resolved account for a Course roster row
- **WHEN** membership is persisted
- **THEN** `CourseAssignmentMembership.student_user_id` SHALL identify the Student and no normalized or uploaded name SHALL become a durable identity key

#### Scenario: Single-word name is valid

- **GIVEN** a Google-derived or Secretary-entered account name is `Madonna`
- **WHEN** the name is validated for persistence
- **THEN** System CLOIE SHALL accept and display the single-word value without requiring a second name component

#### Scenario: Name preserves provider-visible text

- **GIVEN** a usable provider name contains compound words, punctuation, diacritics, or meaningful internal spacing
- **WHEN** System CLOIE stores the canonical name
- **THEN** it SHALL trim only leading and trailing whitespace and SHALL preserve the remaining text

### Requirement: Self-service registration does not accept a client-supplied account name

Student, Faculty, Alumni, and Industry Partner self-service registration SHALL collect only role-specific information after Google OAuth. Account identity SHALL derive from the authenticated account, and a browser-supplied name SHALL have no authority. Student onboarding SHALL collect Program, applicable Major, and active-period placement fields when available, without collecting Student ID.

#### Scenario: Student completes academic registration

- **GIVEN** a Google-authenticated account with a canonical User.name and a valid STUDENT role claim
- **WHEN** the Student submits Program, applicable Major, year level, and section for an active Academic Period
- **THEN** System CLOIE SHALL create or update Student academic records without accepting a client-supplied name or Student ID

#### Scenario: Client attempts to inject a different name

- **GIVEN** an authenticated Student submits valid academic fields and an additional name value that differs from User.name
- **WHEN** registration is processed
- **THEN** System CLOIE SHALL ignore or reject the client name value and SHALL preserve the authenticated account's canonical User.name

#### Scenario: Self-service form is rendered

- **GIVEN** a Student, Faculty, Alumni, or Industry Partner is completing self-service onboarding
- **WHEN** the role-specific form renders
- **THEN** it SHALL not render editable semantic-name inputs or a mutable account-name field and Student onboarding SHALL not render Student ID

### Requirement: User-facing projections use the canonical name contract

Identity, enrollment, academic calendar, Course Catalog and Assignments, course roster, evaluation, response, Dean oversight, dashboard, profile, and audit-facing projections SHALL expose and render the canonical `name` value directly. They SHALL not expose first-name or last-name compatibility aliases.

#### Scenario: Course roster renders a member

- **GIVEN** an authorized roster manager views a Course-assignment roster containing a Student with canonical name `Li Wei`
- **WHEN** the roster member row renders
- **THEN** it SHALL show `Li Wei` as the Student name and SHALL preserve all existing roster eligibility, lifecycle, and authorization behavior

#### Scenario: Evaluation respondent preview renders a person

- **GIVEN** an authorized evaluation publisher previews respondents
- **WHEN** a respondent with canonical name `O'Connor, Mae` is included
- **THEN** the preview SHALL render the canonical value without formatting it as `lastName, firstName`

#### Scenario: Secretary corrects a linked account name

- **GIVEN** an authenticated Secretary edits the canonical name of another linked User
- **WHEN** the authorized edit succeeds
- **THEN** the updated name SHALL appear in subsequent authorized projections without changing the User role, academic records, roster memberships, evaluation assignments, or account state

### Requirement: Secretary Users search and sort by complete name

The Secretary Users list SHALL search the complete canonical `User.name` and email, SHALL sort by complete name rather than first name or last name, and SHALL canonicalize legacy first-name/last-name sort requests to the new complete-name behavior.

#### Scenario: Search matches a compound name

- **GIVEN** the Secretary Users list contains a User named `Maria Dela Cruz`
- **WHEN** a Secretary searches for `Dela Cruz`
- **THEN** the result SHALL include that User without requiring a separate surname field

#### Scenario: Default sorting uses complete name

- **GIVEN** a Secretary opens the Users list without a sort parameter
- **WHEN** the Users list is displayed
- **THEN** it SHALL use canonical `name` ascending with stable deterministic tie-breakers

#### Scenario: Legacy surname sort is requested

- **GIVEN** a bookmarked Secretary Users URL contains `sort=lastName` or `sort=firstName`
- **WHEN** the Users list is displayed
- **THEN** it SHALL use complete-name sorting
