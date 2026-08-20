## ADDED Requirements

### Requirement: Exhaustive manifestation mapping for Program-specific Courses
For a Program-specific Course, a committed alignment SHALL contain exactly one manifestation for every pair formed by the Course's active CILOs and the active PLOs of the Course's owning Program.

#### Scenario: Complete alignment commits
- **WHEN** a Faculty member submits an alignment where every active CILO has a LEARNING, PRACTICE, or OPPORTUNITY manifestation for every active PLO of the owning Program
- **THEN** the system commits the alignment atomically

#### Scenario: Missing pair blocks review and commit
- **WHEN** a Faculty member attempts to review or commit an alignment where at least one active CILO lacks a manifestation for an active PLO
- **THEN** the system rejects the action with an explicit completeness message and the Course stays incomplete

### Requirement: Manifestation value validation
The server SHALL accept only LEARNING, PRACTICE, and OPPORTUNITY as manifestation values.

#### Scenario: Invalid values rejected at the server boundary
- **WHEN** a crafted request submits a manifestation of "L", "learning", "NONE", null, or an arbitrary string
- **THEN** the system rejects the request with a validation error

### Requirement: Single mapping per CILO and PLO pair
The system SHALL store at most one mapping for each CILO and PLO pair. A manifestation change SHALL update the existing mapping instead of creating a second one.

#### Scenario: Manifestation change updates the existing mapping
- **WHEN** a Faculty member changes CILO1 + PLO1 from LEARNING to PRACTICE
- **THEN** the system updates the existing mapping row, records the actor and time of the change, and creates no second mapping

#### Scenario: Duplicate pair cannot exist
- **WHEN** two writes attempt to create the same CILO and PLO pair
- **THEN** only one mapping row exists for that pair

### Requirement: Faculty draft saves
A Faculty member SHALL be able to save a partial alignment and resume it later. A draft save persists the cells currently classified; pairs left unanswered SHALL remain unanswered.

#### Scenario: Partial draft save persists and resumes
- **WHEN** a Faculty member classifies 20 of 40 pairs, saves the draft, leaves, and reopens the Course alignment
- **THEN** the 20 classified pairs are restored with their manifestations and the 20 unanswered pairs are shown as unanswered with a remaining count

#### Scenario: Clearing a classified cell removes its mapping
- **WHEN** a Faculty member clears a previously classified cell and saves the draft
- **THEN** the system removes that mapping row

#### Scenario: Draft save never touches archived pairs
- **WHEN** a draft save runs on a Course whose PLO or CILO was archived after the alignment was loaded
- **THEN** existing mapping rows for the archived outcome are preserved

### Requirement: Concurrent-edit protection
Manifestation changes SHALL participate in stale-write detection for both draft saves and commits.

#### Scenario: Stale draft save rejected
- **WHEN** a Faculty member saves a draft using an alignment another writer changed in the meantime
- **THEN** the system rejects the save and requires a reload

#### Scenario: Stale commit rejected
- **WHEN** a Faculty member commits using a review prepared before another writer changed a manifestation
- **THEN** the system rejects the commit and requires reload and re-review

### Requirement: Commit-time scope and authorization validation
A commit SHALL revalidate Course authorization, Course ownership of the submitted CILOs, Program scope of the submitted PLOs, and target activity server-side.

#### Scenario: Cross-program PLO rejected
- **WHEN** a crafted request pairs a BSIT CILO with a BSCS PLO
- **THEN** the system rejects the commit even though the PLO id is valid

#### Scenario: Foreign CILO rejected
- **WHEN** a crafted request includes a CILO that does not belong to the Course
- **THEN** the system rejects the commit

#### Scenario: Inactive target rejected
- **WHEN** a commit includes a PLO that is inactive at commit time
- **THEN** the system rejects the commit

### Requirement: Outcome lifecycle behavior
Only active PLOs SHALL participate in the required manifestation set. Archiving an outcome SHALL NOT rewrite existing historical mapping rows.

#### Scenario: New PLO requires classification
- **WHEN** a Program Head creates a new active PLO in a Program
- **THEN** every Course in that Program with active CILOs becomes incomplete until Faculty classifies the new PLO

#### Scenario: New CILO requires classification
- **WHEN** a Faculty member creates a new active CILO in a Course
- **THEN** the alignment becomes incomplete until the CILO is classified against every active PLO

#### Scenario: Archived PLO excluded from the required set
- **WHEN** a PLO is archived
- **THEN** it is no longer required for new classification and its existing mapping rows are kept

### Requirement: Alignment read model
The alignment read model SHALL return the Course and Program identity, active CILOs, the active PLO catalog, the current manifestation for every existing pair, and incomplete legacy state where migration data lacks a manifestation.

#### Scenario: Legacy mapping shows as incomplete
- **WHEN** a preserved mapping row has no manifestation
- **THEN** the alignment displays that pair as unanswered and requires classification

### Requirement: Review shows manifestation changes
The review step SHALL present a complete before/after alignment including manifestation changes before commit.

#### Scenario: Manifestation-only change reported
- **WHEN** a Faculty member changes CILO1 + PLO1 from LEARNING to PRACTICE and proceeds to review
- **THEN** the review shows the change as Learning (L) to Practice (P)

### Requirement: Incomplete-state visibility
The editor SHALL show the count of classified and remaining pairs while the alignment is incomplete.

#### Scenario: Progress shown
- **WHEN** 32 of 40 pairs are classified
- **THEN** the editor shows 32 of 40 classified with 8 remaining

### Requirement: Alignment empty states
The alignment surface SHALL present explicit empty states instead of an empty matrix.

#### Scenario: Program has no PLOs
- **WHEN** Faculty opens alignment for a Course whose Program has no active PLOs
- **THEN** the system shows that Program Learning Outcomes have not been defined and that a Program Head must create them, and does not present the empty matrix as complete

#### Scenario: Course has no CILOs
- **WHEN** Faculty opens alignment for a Course with no CILOs
- **THEN** the system shows that no CILOs have been defined and directs Faculty to CILO management

### Requirement: Manifestation accessibility
Manifestation controls SHALL be keyboard operable with accessible names naming the CILO, the PLO, and the manifestation. The interface SHALL NOT communicate manifestation through color, position, or one-letter abbreviations alone.

#### Scenario: Control exposes full context
- **WHEN** a screen reader user focuses a manifestation control
- **THEN** the accessible name includes the CILO, the PLO, and the current manifestation label
