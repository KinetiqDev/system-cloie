## ADDED Requirements

### Requirement: COMPLETED transition without end_date
The system SHALL allow an ACTIVE AcademicTermInstance to transition to COMPLETED without requiring `end_date` to be set. The `end_date` field SHALL remain as optional informational metadata.

#### Scenario: Complete period without end_date
- **WHEN** Secretary transitions an ACTIVE period to COMPLETED and `end_date` is null
- **THEN** the transition succeeds; `status` becomes COMPLETED and a readiness snapshot is persisted

#### Scenario: Complete period with end_date
- **WHEN** Secretary transitions an ACTIVE period with `end_date` set to COMPLETED
- **THEN** the transition succeeds normally; `end_date` is preserved as-is

### Requirement: ACTIVE to COMPLETED preserves readiness snapshot
The existing readiness snapshot persistence on COMPLETED SHALL be preserved unchanged.

#### Scenario: Snapshot persisted on completion
- **WHEN** a period transitions ACTIVE→COMPLETED
- **THEN** `persistPeriodReadinessSnapshot` is called within the same Serializable transaction and the snapshot is stored immutably

### Requirement: COMPLETED remains terminal
The existing immutability of COMPLETED and CANCELLED periods SHALL be preserved unchanged.

#### Scenario: Cannot change completed period
- **WHEN** Secretary attempts to transition a COMPLETED period to any other status
- **THEN** the operation is rejected with "Completed and cancelled periods are immutable"
