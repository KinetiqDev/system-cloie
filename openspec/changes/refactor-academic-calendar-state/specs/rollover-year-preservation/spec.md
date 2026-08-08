## ADDED Requirements

### Requirement: Same School Year rollover preserves Year Level
When running term rollover between two AcademicTermInstances that belong to the same School Year, the system SHALL copy each student's year level unchanged rather than promoting it.

#### Scenario: First Term to Second Term within same School Year
- **WHEN** rollover runs from First Semester/First Term to First Semester/Second Term of the same School Year
- **THEN** a 2nd Year student is enrolled as 2nd Year (not promoted to 3rd Year)

#### Scenario: First Semester to Second Semester within same School Year
- **WHEN** rollover runs from First Semester/Second Term to Second Semester/First Term of the same School Year
- **THEN** year levels are preserved for all students

#### Scenario: Second Semester to Summer within same School Year
- **WHEN** rollover runs from Second Semester/Second Term to Summer of the same School Year
- **THEN** year levels are preserved for all students

### Requirement: Cross School Year rollover promotes Year Level
When running term rollover between AcademicTermInstances in different School Years, the system SHALL promote each student's year level: 1st→2nd, 2nd→3rd, 3rd→4th, 4th→graduating (exception).

#### Scenario: Summer to next School Year First Term
- **WHEN** rollover runs from Summer of School Year 2029-2030 to First Semester/First Term of School Year 2030-2031
- **THEN** a 2nd Year student is promoted to 3rd Year; a 4th Year student generates a GRADUATING exception

#### Scenario: Previous School Year to next School Year
- **WHEN** rollover runs from any term of School Year A to any term of School Year B
- **THEN** all non-graduating students are promoted by one year level

### Requirement: Promotion exceptions unchanged
Existing exception types (GRADUATING, MISSING_DATA) SHALL continue to work identically regardless of promotion or preservation logic.

#### Scenario: Fourth Year student graduating
- **WHEN** rollover processes a 4th Year student during cross-school-year promotion
- **THEN** a GRADUATING exception is recorded and no enrollment is created

#### Scenario: Missing program data
- **WHEN** rollover encounters a student enrollment with no program_id
- **THEN** a MISSING_DATA exception is recorded regardless of whether promotion or preservation applies
