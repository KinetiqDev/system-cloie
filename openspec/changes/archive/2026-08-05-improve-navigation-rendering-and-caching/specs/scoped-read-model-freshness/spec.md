## ADDED Requirements

### Requirement: Shared read models declare cache scope and invalidation ownership
The system SHALL document and implement an explicit key scope, lifetime, stale behavior, invalidation tag or route set, and owning mutation paths before persistently reusing an institution-shared catalog or academic-period read model.

#### Scenario: Safe shared catalog read is reused
- **WHEN** an authorized role renders a cache-eligible Academic Program, Course, academic-period, or instrument catalog projection
- **THEN** any persistent reuse is keyed only by declared non-user dimensions and is invalidated by the owning domain mutations

#### Scenario: Shared read mutation succeeds
- **WHEN** a mutation changes a cache-eligible catalog or academic-period projection
- **THEN** the system invalidates every declared cache tag or route projection affected by that mutation before a subsequent render relies on it

### Requirement: Private and authorization-dependent data remains request-scoped
The system SHALL NOT persistently shared-cache sessions, authorization decisions, account profiles, enrollment status, faculty affiliations, rosters, evaluation assignments, student identifiers, raw responses, or qualitative comments.

#### Scenario: Private dashboard data is requested by two users
- **WHEN** two users request dashboards or lists with different account or authorization scopes
- **THEN** each request resolves and authorizes private data within its own request scope and cannot receive another user's cached result

#### Scenario: Account state changes
- **WHEN** a user's role, active state, external verification, enrollment, or affiliation changes
- **THEN** the next request evaluates the current account state before granting route access

### Requirement: Existing path invalidation remains correct during incremental cache adoption
The system SHALL retain route invalidation for an affected domain until its named cache invalidation path has complete mutation coverage and automated verification.

#### Scenario: Domain cache migration is incomplete
- **WHEN** a domain read model has not yet proven complete tag invalidation for all relevant writes
- **THEN** the system continues using the existing route invalidation behavior for that domain
