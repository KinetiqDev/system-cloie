## MODIFIED Requirements

### Requirement: User accounts have one canonical opaque name
The system SHALL represent every persisted System CLOIE account with one required canonical `User.name` value. The value SHALL be treated as opaque display text and SHALL NOT be interpreted or persisted as a first name, middle name, last name, surname, or given name. An authorized Course roster workflow MAY create temporary normalized comparison forms for assignment-scoped candidate discovery, but those forms SHALL NOT overwrite the canonical value, become unique identifiers, or be persisted as roster identity.

#### Scenario: Existing account name is displayed directly
- **GIVEN** a persisted User has the canonical name `Juan Dela Cruz`
- **WHEN** an authorized System CLOIE surface renders that account
- **THEN** the surface SHALL display `Juan Dela Cruz` as one value and SHALL NOT reconstruct it from semantic name fields

#### Scenario: Canonical name is used for roster discovery
- **GIVEN** an authorized Course roster manager uploads a name with harmless casing or whitespace differences
- **WHEN** System CLOIE compares it with scoped account names
- **THEN** it MAY use a temporary normalized comparison value but SHALL preserve the uploaded source text and canonical `User.name` unchanged

#### Scenario: Name resolution completes
- **GIVEN** a manager confirms a resolved account for a Course roster row
- **WHEN** membership is persisted
- **THEN** `CourseAssignmentMembership.student_user_id` SHALL identify the Student and no normalized or uploaded name SHALL become a durable identity key

### Requirement: Self-service registration does not accept a client-supplied account name
Student, Faculty, Alumni, and Industry Partner self-service registration SHALL collect only role-specific information after Google OAuth. Their server actions SHALL derive account identity from the authenticated server-side session and SHALL not trust a name supplied through browser form data. Student onboarding SHALL collect Program, applicable Major, and active-period placement fields when available, without collecting Student ID.

#### Scenario: Student completes academic registration
- **GIVEN** a Google-authenticated account with a canonical `User.name` and a valid STUDENT role claim
- **WHEN** the Student submits Program, applicable Major, year level, and section for an active Academic Period
- **THEN** the server SHALL create or update Student academic records without accepting a client-supplied name or Student ID

#### Scenario: Client attempts to inject a different name
- **GIVEN** an authenticated Student submits valid academic fields and an additional name value that differs from `User.name`
- **WHEN** the registration Server Action processes the request
- **THEN** the action SHALL ignore or reject the client name value and SHALL preserve the server-authoritative `User.name`

#### Scenario: Self-service form is rendered
- **GIVEN** a Student, Faculty, Alumni, or Industry Partner is completing self-service onboarding
- **WHEN** the role-specific form renders
- **THEN** it SHALL not render editable semantic-name inputs or a mutable account-name field and Student onboarding SHALL not render Student ID
