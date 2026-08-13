## ADDED Requirements

### Requirement: New Course-bound evaluation publication requires target alignment
Before creating a new Course-bound evaluation deployment, the system SHALL validate the locked Course Assignment's Course scope and every active CILO's valid active target mapping. Publication SHALL fail when any active CILO lacks the required typed mapping.

#### Scenario: Program-specific Course is fully aligned
- **GIVEN** every active CILO of the locked Program-specific Course maps to at least one active owning-Program GO
- **WHEN** an authorized Faculty or permitted on-behalf publisher submits publication
- **THEN** publication proceeds through the existing roster, template, and deployment validations

#### Scenario: General Education Course is fully aligned
- **GIVEN** every active CILO of the locked General Education Course maps to at least one active Institutional Outcome
- **WHEN** an authorized publisher submits publication
- **THEN** publication proceeds and the new Course-bound evaluation retains its existing CILO/question snapshot behavior

#### Scenario: Publication is blocked by an unmapped CILO
- **GIVEN** at least one active CILO lacks a valid active target for the Course scope
- **WHEN** publication is submitted
- **THEN** the system rejects publication before deployment creation, explains that alignment is incomplete, and provides a repair path to the Faculty Course alignment route

#### Scenario: Invalid historical mapping does not satisfy publication
- **GIVEN** a CILO has only an archived target or a target from the wrong typed relation
- **WHEN** publication is submitted
- **THEN** the system treats the CILO as unmapped and rejects publication safely

### Requirement: Existing published evaluations remain stable
The publication gate SHALL apply only to new deployments. Already published Course-bound evaluations, their CILO/question snapshots, response assignments, and responses SHALL remain readable and shall not be rewritten when mappings or catalogs change.

#### Scenario: Mapping changes after publication
- **GIVEN** a Course-bound evaluation was published before a later mapping change
- **WHEN** Faculty or Secretary changes the Course alignment
- **THEN** the existing evaluation and its snapshots remain unchanged while future publications use the new alignment

### Requirement: Publication errors preserve existing safeguards
The new alignment check SHALL preserve existing server-side role authorization, Course Assignment locking, template binding validation, roster eligibility, exclusion validation, and generic unexpected-error handling.

#### Scenario: Unauthorized publisher lacks alignment details
- **GIVEN** a user is not authorized to publish the locked Course Assignment
- **WHEN** the user submits publication
- **THEN** the system rejects the request using the existing safe authorization behavior without exposing alignment or roster details
