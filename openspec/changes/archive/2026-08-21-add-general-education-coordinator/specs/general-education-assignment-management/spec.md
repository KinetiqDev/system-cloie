## ADDED Requirements

### Requirement: Coordinator assignment authority is limited to General Education Courses

After the approved breaking transfer and approval of the shared college-wide
Coordinator scope, the server SHALL allow
`GEN_ED_COORDINATOR` to create, update, activate, deactivate, delete, preflight
delete, and bulk-create CourseAssignments only when the Course has
`course_scope = GENERAL_EDUCATION`. The server SHALL deny Coordinator mutation of
Program-specific Courses. Program Head scope and Faculty restrictions SHALL
remain unchanged.

#### Scenario: Coordinator creates a General Education assignment

- **GIVEN** an active Coordinator selects an active General Education Course, target Program, academic period, year level, section, and Faculty Member
- **WHEN** the Coordinator submits the assignment
- **THEN** the server creates the CourseAssignment if the existing assignment invariants pass

#### Scenario: Shared Coordinator scope is not approved

- **GIVEN** the institution has not approved the shared college-wide Coordinator scope
- **WHEN** an administrator or Coordinator attempts a General Education assignment mutation
- **THEN** the server does not enable the Coordinator mutation path under this change

#### Scenario: Coordinator attempts a Program-specific mutation

- **GIVEN** an active Coordinator targets a Program-specific Course
- **WHEN** the Coordinator submits any assignment create, update, activation, deactivation, delete, preflight delete, or bulk-create request
- **THEN** the server rejects the request and does not change the CourseAssignment

#### Scenario: Program Head retains General Education read-only access

- **GIVEN** a Program Head has the selected target Program in the Authorized Program set
- **WHEN** the Program Head views a General Education assignment for that Program
- **THEN** the system shows the assignment without Coordinator mutation controls and the server rejects crafted Program Head mutation requests

### Requirement: Coordinator assignment reads cannot be widened by request parameters

Coordinator CourseAssignment list reads, Course pickers, and published curriculum
option reads SHALL enforce `course.course_scope = GENERAL_EDUCATION` inside the
server service. URL filters MAY narrow the result but SHALL not widen it to
Program-specific Courses. CourseAssignment pages SHALL remain bounded by the
existing maximum of 100 records per page.

#### Scenario: Coordinator opens the assignment list

- **GIVEN** an active Coordinator requests the Course Assignments page without a Course scope filter
- **WHEN** the server loads the page
- **THEN** the result contains only General Education assignments and no more than 100 records

#### Scenario: Coordinator forges a scope filter

- **GIVEN** an active Coordinator requests a list URL with a filter intended to include Program-specific Courses
- **WHEN** the server loads the list
- **THEN** the server ignores the widening attempt and returns only General Education assignments

#### Scenario: Coordinator selects a Course

- **GIVEN** an active Coordinator opens the Course picker for a new assignment
- **WHEN** the server returns selectable Courses
- **THEN** every option has `course_scope = GENERAL_EDUCATION`

### Requirement: Coordinator can assign General Education Courses across Programs

The Coordinator SHALL be able to select any active target Program for a General
Education CourseAssignment. The target Program SHALL remain the operational class
context even though the Course is shared. The Faculty search SHALL include active
Faculty affiliations across Programs and SHALL not filter Faculty by the target
Program.

#### Scenario: One shared Course is assigned to several Programs

- **GIVEN** the same active General Education Course is selected for BSIT, BSED, and BSBA
- **WHEN** the Coordinator creates one valid assignment for each target Program
- **THEN** the system creates separate CourseAssignments with the same Course and the requested Program contexts

#### Scenario: Faculty affiliation differs from target Program

- **GIVEN** a Faculty Member has an active affiliation with BSIT
- **WHEN** a Coordinator assigns that Faculty Member to a General Education Course in BSED
- **THEN** the server permits the assignment if the remaining assignment rules pass

### Requirement: Optional curriculum links preserve assignment authority

When a Coordinator selects a published `CurriculumCourse`, the server SHALL
validate `CourseAssignment.course_id == CurriculumCourse.course_id` and
`CourseAssignment.program_id == CurriculumVersion.program_id`. The link SHALL
remain optional and immutable after creation. `CourseAssignment` SHALL remain the
operational record for Course, Program, academic period, year level, and section.

#### Scenario: Coordinator selects a valid curriculum placement

- **GIVEN** a published CurriculumCourse has the selected Course and belongs to the selected Program
- **WHEN** the Coordinator creates the assignment with that curriculum link
- **THEN** the server stores the optional link and the assignment's operational fields

#### Scenario: Coordinator selects an inconsistent curriculum placement

- **GIVEN** a selected CurriculumCourse has a different Course or belongs to a different Program
- **WHEN** the Coordinator submits the assignment
- **THEN** the server rejects the request without creating the assignment

#### Scenario: Existing assignment has no curriculum link

- **GIVEN** a valid historical CourseAssignment has a null curriculum link
- **WHEN** the Coordinator or a historical read loads the assignment
- **THEN** the system preserves and displays the assignment without requiring a curriculum link

### Requirement: Coordinator assignment UI does not grant unrelated authority

The Coordinator assignment surface SHALL use a concrete `general-education` mode
with General Education Courses only, an active target Program selector,
cross-Program Faculty search, and no meaningful Course Scope selector. The
surface SHALL not grant roster management or evaluation publication authority.

#### Scenario: Coordinator opens the assignment wizard

- **GIVEN** an active Coordinator opens the assignment wizard
- **WHEN** the form renders
- **THEN** the form fixes Course scope to General Education, offers active target Programs, and offers cross-Program Faculty results

#### Scenario: Coordinator opens an assignment row

- **GIVEN** an active Coordinator views a General Education assignment row
- **WHEN** row actions render
- **THEN** roster-management and on-behalf evaluation-publication actions are absent

#### Scenario: Coordinator submits a forged roster request

- **GIVEN** an active Coordinator has a valid General Education CourseAssignment
- **WHEN** the Coordinator sends a crafted roster mutation request
- **THEN** the server rejects the request without changing CourseAssignmentMembership rows
