## ADDED Requirements

### Requirement: Exhaustive readiness semantics
For a Program-specific Course, readiness SHALL be ready when every active CILO has a manifestation for every active PLO of the owning Program, and incomplete-mapping otherwise.

#### Scenario: Partial mapping is incomplete
- **WHEN** a Course has active CILOs and at least one required pair lacks a manifestation
- **THEN** the Course readiness is incomplete-mapping

#### Scenario: No active PLOs is incomplete
- **WHEN** a Course has active CILOs and its Program has no active PLOs
- **THEN** the Course readiness is incomplete-mapping, not ready

#### Scenario: Complete classification is ready
- **WHEN** every active CILO has a manifestation for every active PLO
- **THEN** the Course readiness is ready

#### Scenario: General Education readiness unchanged
- **WHEN** a General Education Course has at least one valid active Institutional Outcome target per active CILO
- **THEN** the Course readiness is ready under the existing rule

### Requirement: Publication gate uses exhaustive readiness
The server SHALL reject new Course-bound evaluation publication while the Course alignment is incomplete under the exhaustive rule.

#### Scenario: Incomplete alignment blocks publication
- **WHEN** an attempt is made to publish a Course-bound evaluation for a Program-specific Course with an incomplete alignment
- **THEN** the system rejects the publication and offers a repair path to Course alignment

### Requirement: Readiness snapshots preserved
Existing readiness snapshots SHALL NOT be rewritten by mapping or catalog changes. New snapshots SHALL reflect the exhaustive semantics.

#### Scenario: Existing snapshot unchanged
- **WHEN** mappings change after a period snapshot is written
- **THEN** the existing snapshot content is unchanged
