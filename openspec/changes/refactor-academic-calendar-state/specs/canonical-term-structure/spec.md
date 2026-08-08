## ADDED Requirements

### Requirement: School Year creation creates canonical terms
The system SHALL transactionally create all 5 canonical AcademicTermInstance rows when a School Year is created. The canonical rows are: FIRST/FIRST_TERM, FIRST/SECOND_TERM, SECOND/FIRST_TERM, SECOND/SECOND_TERM, and SUMMER/null. All canonical rows SHALL be created with `status = PLANNED`.

#### Scenario: Create School Year with canonical terms
- **WHEN** Secretary creates a new School Year
- **THEN** the School Year and all 5 AcademicTermInstance rows are created atomically; all terms have status PLANNED

#### Scenario: Transaction rolls back on failure
- **WHEN** any of the 5 term creations fails during School Year creation
- **THEN** the entire transaction rolls back; neither the School Year nor any partial terms persist

#### Scenario: Summer has no term
- **WHEN** a School Year is created
- **THEN** the Summer AcademicTermInstance has `semester = SUMMER` and `term = null`

### Requirement: Arbitrary term creation is removed
The system SHALL NOT allow manual creation of AcademicTermInstance rows outside the canonical set. The `addTermInstance` service function SHALL be removed.

#### Scenario: Attempt to create arbitrary term rejected
- **WHEN** a client attempts to create a non-canonical term instance
- **THEN** no service endpoint is available to process such a request

### Requirement: Structural term deletion is blocked
The system SHALL NOT allow deletion of any of the 5 canonical AcademicTermInstance rows belonging to a School Year. The `deleteTermInstance` service function SHALL reject deletion of canonical terms.

#### Scenario: Delete canonical term rejected
- **WHEN** Secretary attempts to delete a canonical term (one of the 5 structural terms)
- **THEN** the operation is rejected with an error indicating structural terms cannot be deleted

#### Scenario: Delete structural term when term has dependent records
- **WHEN** Secretary attempts to delete a canonical term that has course assignments or enrollments
- **THEN** the operation is rejected for both structural irrelevance and dependent records

### Requirement: Legacy non-canonical terms
Existing AcademicTermInstance rows that are not part of the 5-term canonical set SHALL remain queryable and mutable (date updates only) but cannot be recreated if deleted.

#### Scenario: Update dates on non-canonical legacy term
- **WHEN** Secretary updates dates on a legacy term that predates the canonical structure
- **THEN** the date update succeeds

#### Scenario: Delete non-canonical legacy term with no dependents
- **WHEN** Secretary deletes a non-canonical legacy term with no dependent records
- **THEN** the deletion succeeds; the term cannot be recreated
