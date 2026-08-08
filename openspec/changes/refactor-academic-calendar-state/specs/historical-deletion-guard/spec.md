## ADDED Requirements

### Requirement: Course deletion blocked when assignments exist
The database SHALL reject deletion of a `courses` row when any `course_assignments` row references it. This is enforced through `ON DELETE RESTRICT` on the foreign key constraint.

#### Scenario: Delete course with assignments rejected by database
- **WHEN** a DELETE is attempted on a Course that has one or more CourseAssignments
- **THEN** the database rejects the operation with a foreign key constraint violation

#### Scenario: Delete course with no assignments succeeds
- **WHEN** a DELETE is attempted on a Course with zero CourseAssignments and zero bound evaluations
- **THEN** the application-layer guard passes and the database allows the deletion

### Requirement: Application-layer guard preserved
The existing `manage-courses.ts#deleteCourse` guard that rejects deletion when CILOs or course-bound evaluations exist SHALL be preserved unchanged.

#### Scenario: Application blocks deletion with active CILOs
- **WHEN** Secretary attempts to delete a Course that has active CILOs
- **THEN** the application returns an error before reaching the database constraint

### Requirement: CourseAssignment FK migration preserves data integrity
The migration that changes the FK from CASCADE to RESTRICT SHALL verify no orphaned `course_assignments` rows exist before altering the constraint.

#### Scenario: Migration runs with valid data
- **WHEN** the migration runs and all `course_assignments.course_id` values reference existing `courses.id` values
- **THEN** the FK is successfully altered from CASCADE to RESTRICT

#### Scenario: Migration detects orphaned rows
- **WHEN** the migration runs and orphaned `course_assignments` rows exist
- **THEN** the migration fails with a descriptive error before altering the constraint

### Requirement: Other cascade FKs unchanged
The FK changes SHALL be limited to `course_assignments.course_id`. The `AcademicTermInstance` → `CourseAssignment` CASCADE, `AcademicTermInstance` → `StudentEnrollment` CASCADE, and `CourseAssignment` → `CourseAssignmentMembership` CASCADE rules SHALL remain unchanged.

#### Scenario: Term instance deletion still cascades
- **WHEN** an AcademicTermInstance is deleted
- **THEN** linked CourseAssignments are cascade-deleted as before
