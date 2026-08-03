## ADDED Requirements

### Requirement: Secretary-created Program Head accounts start with one active assignment
A Secretary-created `PROGRAM_HEAD` account SHALL start with exactly one active Program Head assignment as part of the account creation transaction. This initial assignment SHALL not establish a primary Program or restrict later authorized assignment-set administration.

#### Scenario: Secretary creates a Program Head account
- **GIVEN** a Secretary supplies a valid active Academic Program while creating a `PROGRAM_HEAD` account
- **WHEN** the account creation succeeds
- **THEN** the new User has one `PROGRAM_HEAD` account role and one active Program Head assignment for the supplied Program

### Requirement: Secretary edits the complete Program Head assignment set
The Secretary Program Head edit flow SHALL show all active Program Head assignments and accept the complete desired set of managed Programs. It SHALL not project, edit, or confirm only the first assignment. The existing protected account edit flow SHALL show the exact before-and-after Program assignment sets before save.

#### Scenario: Secretary adds a second Program assignment
- **GIVEN** a Program Head has an active BEED assignment
- **WHEN** a Secretary selects BEED and BSED in the protected Program Head edit flow and confirms the review
- **THEN** the Program Head has active assignments for BEED and BSED
- **AND THEN** the confirmation identifies BEED and BSED in the before-and-after assignment sets

#### Scenario: Secretary leaves the assignment set unchanged
- **GIVEN** a Program Head has active BEED and BSED assignments
- **WHEN** a Secretary saves an edit that retains BEED and BSED
- **THEN** both assignment rows remain active
- **AND THEN** the edit does not create duplicate assignment rows

### Requirement: Assignment-set updates preserve Program Head assignment history
The system SHALL apply Secretary assignment-set updates by activating existing selected assignments, reactivating selected historical assignments, creating a row only when no historical row exists, and deactivating unselected active assignments. It SHALL NOT delete and recreate Program Head assignment rows solely to change the selected set.

#### Scenario: Secretary removes one of multiple assignments
- **GIVEN** a Program Head has active BEED and BSED assignments
- **WHEN** a Secretary saves a protected assignment set containing only BSED
- **THEN** BSED remains active
- **AND THEN** the existing BEED assignment row becomes inactive
- **AND THEN** the BEED assignment row remains available as historical data

#### Scenario: Secretary restores a historical assignment
- **GIVEN** a Program Head has an inactive BEED assignment row and an active BSED assignment row
- **WHEN** a Secretary saves a protected assignment set containing BEED and BSED
- **THEN** the existing BEED row becomes active
- **AND THEN** the system does not create a second Program Head assignment row for BEED

### Requirement: Assignment-set administration validates role, actor, Program lifecycle, and freshness
Only a Secretary SHALL change another User's Program Head assignment set through the Secretary edit flow. The save transaction SHALL verify that the target still has the `PROGRAM_HEAD` role, validate newly selected Programs according to current Program lifecycle rules, reject self-editing, and reject a protected confirmation whose assignment set changed after review.

#### Scenario: Non-Secretary attempts to change assignment set
- **GIVEN** a non-Secretary User submits a Program Head assignment-set request
- **WHEN** the request reaches the server
- **THEN** the system denies the request
- **AND THEN** no Program Head assignment row changes

#### Scenario: Assignment set changes during confirmation
- **GIVEN** a Secretary reviewed a Program Head assignment set
- **AND GIVEN** another authorized administrator changes the set before confirmation
- **WHEN** the first Secretary confirms the original review
- **THEN** the system rejects the stale confirmation
- **AND THEN** it preserves the intervening assignment changes

### Requirement: Role revocation still requires no active Program Head assignments
The system SHALL continue to reject revoking a User's `PROGRAM_HEAD` account role while that User has one or more active Program Head assignments. A Secretary SHALL deactivate every active assignment through assignment-set administration before role revocation can succeed.

#### Scenario: Secretary attempts to revoke a Program Head role with multiple assignments
- **GIVEN** a User has the `PROGRAM_HEAD` role and active BEED and BSED assignments
- **WHEN** a Secretary attempts to revoke the `PROGRAM_HEAD` role
- **THEN** the system rejects the role revocation
- **AND THEN** it explains that all active Program Head assignments must be deactivated first
