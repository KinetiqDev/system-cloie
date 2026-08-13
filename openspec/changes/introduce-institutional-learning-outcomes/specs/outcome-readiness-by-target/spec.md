## ADDED Requirements

### Requirement: Active readiness uses the Course target type
For every unique active `(Course, Academic Program)` context, readiness SHALL classify the context as `missing-cilos` when no active CILOs exist, `incomplete-mapping` when any active CILO lacks a valid active target, and `ready` only when every active CILO has at least one valid active target.

- General Education CILOs require an active Institutional Outcome mapping.
- Program-specific CILOs require an active Graduate Outcome mapping owned by the Course's owning Academic Program.

#### Scenario: General Education shared mapping covers multiple contexts
- **GIVEN** one General Education Course has active assignments in BSIT and BSED
- **WHEN** every active CILO has at least one active Institutional Outcome mapping
- **THEN** both Course/Program readiness contexts classify as `ready` without separate per-Program mapping rows

#### Scenario: General Education mapping is missing
- **GIVEN** an active General Education CILO has no active Institutional Outcome mapping
- **WHEN** live readiness is calculated
- **THEN** every active Course Assignment context for that Course is `incomplete-mapping`

#### Scenario: Program-specific mapping targets the wrong layer
- **GIVEN** a Program-specific CILO has no active owning-Program GO mapping
- **WHEN** live readiness is calculated
- **THEN** its context is `incomplete-mapping`, regardless of any invalid or historical relation elsewhere

#### Scenario: Archived target does not provide live coverage
- **GIVEN** a CILO is mapped only to archived ILOs or archived GOs
- **WHEN** active readiness is calculated
- **THEN** the CILO is incomplete and the archived target remains visible only as historical/admin information

### Requirement: Readiness payload identifies typed gaps
Live readiness and new readiness snapshots SHALL identify target type, affected CILOs, mapped or missing typed target IDs, target catalog state, and stable program totals. General Education gaps SHALL not be presented as missing Graduate Outcomes.

#### Scenario: Dean reviews an Institutional Outcome gap
- **GIVEN** a General Education context has an unmapped active CILO
- **WHEN** Dean Learning Outcomes is loaded
- **THEN** the gap identifies the General Education Course/CILO and Institutional Outcome target type without labeling it as a missing Program GO

### Requirement: Completed-period readiness is immutable and versioned
When an Academic Period completes, the system SHALL persist an immutable typed readiness snapshot. Existing snapshots SHALL retain their legacy schema interpretation; new snapshots SHALL identify their schema version and typed target data. Later mapping/catalog changes SHALL NOT rewrite completed-period readiness.

#### Scenario: Completed snapshot remains stable after live mapping changes
- **GIVEN** a completed period has a typed readiness snapshot
- **WHEN** an Institutional Outcome is archived or a mapping is changed later
- **THEN** the completed-period read returns the original snapshot state and target IDs

#### Scenario: Legacy snapshot is read
- **GIVEN** a completed period has a pre-refactor readiness snapshot
- **WHEN** the period is opened after deployment
- **THEN** the system preserves its legacy interpretation and does not relabel old GO semantics as Institutional Outcome coverage

#### Scenario: Snapshot persistence fails
- **GIVEN** an Academic Period cannot persist its completion snapshot
- **WHEN** completion is attempted
- **THEN** the lifecycle operation fails safely and does not claim that historical readiness was recorded
