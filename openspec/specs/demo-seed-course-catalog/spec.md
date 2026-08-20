# demo-seed-course-catalog Specification

## Purpose
TBD - created by archiving change update-demo-seed-course-catalog. Update Purpose after archive.
## Requirements
### Requirement: Course catalog mirrors ACD curriculum CSV
The system SHALL seed the demo `courses` table from the ACD curriculum defined in `docs/acd_programs_demo_seed_recommended_expanded.csv`, replacing all fabricated placeholder courses. Program assignment SHALL come from `program_code`, major assignment from `major_name` (empty = program-level), and course scope from `course_scope`. No fabricated courses from the prior catalog (GEGS101, IT-OD-401, EDUC101, BA101, …) SHALL remain in the fixture.

#### Scenario: All CSV courses exist after seeding
- **WHEN** the seed completes against an approved development database
- **THEN** every one of the 102 CSV courses exists in `courses` with scope, program, major, and placement matching the CSV row

#### Scenario: Fabricated placeholder courses are gone
- **WHEN** the seed completes against a database holding only the previous fixture catalog
- **THEN** no fabricated course code remains active: seed-managed rows absent from the fixture (identified by immutable seed provenance) are deactivated and preserved for history, while user-created rows remain unchanged (GEGS101, IT-OD-401, IT401, IT-CAP-401, EDUC101, EDUC201, EDUC301, ENG201 as BSED, MATH201, SCI201, BEED101, BEED102, BEED201, BEED201B, BEED301, BA101, MKT301, HRDM201, HRDM302, FIN101, FIN303, SW101, SW201, SW202, SW301, SW401, HM101, HM201, HM301, HM302, HM401)

### Requirement: Normalized course codes
Course codes SHALL be stored space-stripped (`IT 101` → `IT101`, `HM-PRAC 2` → `HM-PRAC2`, `NSTP 1` → `NSTP1`) and SHALL be globally unique. The CSV remains the canonical human-readable reference; the fixture SHALL document the normalization rule.

#### Scenario: Normalized codes are unique
- **WHEN** the fixture is loaded
- **THEN** no two courses share a normalized code, satisfying the `courses.code` uniqueness constraint

#### Scenario: Placement defaults are complete
- **WHEN** the fixture is loaded
- **THEN** every course has a year level and semester; non-SUMMER courses have a term (`FIRST`→`FIRST_TERM`, `SECOND`→`SECOND_TERM`), and SUMMER courses have no term

### Requirement: Dependent seed fixtures reference CSV courses
Course assignment, membership, CILO, course-bound evaluation, and response fixtures SHALL reference only courses present in the new catalog. The evaluation runner SHALL keep deployment anchors and course-bound definitions in sync with the assignment fixture.

#### Scenario: Seed completes with remapped fixtures
- **WHEN** the complete seed runs against a fresh approved development database
- **THEN** no runner skips or throws on a missing course code, and all course-bound evaluations, memberships, and responses resolve

#### Scenario: Baseline curriculum DRAFTs include CSV courses
- **WHEN** baseline curriculum DRAFTs are generated for each program after seeding
- **THEN** every CSV course with a complete default placement is included with its placement, course code snapshot, and title snapshot

