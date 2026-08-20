# program-head-plo-management Specification

## Purpose
TBD - created by archiving change cilo-to-plo-manifestation. Update Purpose after archive.
## Requirements
### Requirement: Program Head PLO administration within Program scope
A Program Head SHALL create, edit, archive, restore, and reorder PLOs within their assigned Program scope and SHALL NOT administer PLOs outside that scope.

#### Scenario: Create PLO in assigned Program
- **WHEN** a Program Head creates a PLO in an assigned Program
- **THEN** the PLO is created and appears in the Program's PLO list

#### Scenario: Out-of-scope PLO write rejected
- **WHEN** a crafted request attempts to create or edit a PLO in a Program not assigned to the Program Head
- **THEN** the system rejects the request

### Requirement: Read-only CILO-to-PLO mapping review
The Program Head SHALL view CILO-to-PLO manifestations for assigned Program Courses without editing controls.

#### Scenario: Review shows manifestations read-only
- **WHEN** a Program Head opens the mapping review for a Program
- **THEN** the review shows each Course's CILOs, every PLO, and the manifestation per pair, with no mutation controls

#### Scenario: Program Head mapping mutation denied
- **WHEN** a crafted server request from a Program Head attempts to create, change, or remove a CILO-to-PLO mapping
- **THEN** the system denies the request with an authorization failure

