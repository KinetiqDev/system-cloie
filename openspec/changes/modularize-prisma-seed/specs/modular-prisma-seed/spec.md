## ADDED Requirements

### Requirement: Stable seed entry point
The system SHALL retain `prisma/seed.ts` as Prisma's configured seed entry point and SHALL load environment configuration before importing the Prisma client. It SHALL not automatically execute seed orchestration when `process.env.VITEST` is set. Outside Vitest, it SHALL retain existing error logging, nonzero process exit, and Prisma disconnect in `finally`.

#### Scenario: Prisma seed command starts orchestration
- **WHEN** `pnpm db:seed` runs outside Vitest with valid approved development-database configuration
- **THEN** Prisma invokes `tsx prisma/seed.ts` and the seed completes through the same entry point

#### Scenario: Vitest imports a seed module
- **WHEN** a Vitest test imports an extracted fixture, helper, or runner
- **THEN** no seed orchestration starts and no automatic Prisma disconnect occurs

#### Scenario: Seed runner fails
- **WHEN** an extracted runner rejects outside Vitest
- **THEN** the entry point logs the existing seed failure message, exits with status 1, and disconnects Prisma in `finally`

### Requirement: Deterministic fixture identity and values
The system SHALL preserve every existing seed fixture record, deterministic UUID, relationship, status, timestamp, text value, rating, ordering value, template structure, and academic context. Seed-only fixtures and constants SHALL remain under `prisma/seed/` and SHALL not move into production feature modules.

#### Scenario: Fixed identity fixture exists
- **WHEN** the seed completes
- **THEN** the User, School Year, academic period, central deployment, and Course-bound fixture records retain their existing deterministic UUID values

#### Scenario: Explicit Course-assignment roster exists
- **WHEN** the seed completes
- **THEN** Course-assignment memberships retain current explicit Student membership fixtures and are not inferred from Student term placement

#### Scenario: Response fixture exists
- **WHEN** the seed completes
- **THEN** representative submitted and in-progress responses retain their existing response status, submission timestamp, quantitative ratings, qualitative text, section keys, and item keys

### Requirement: Ordered foreign-key-safe seed execution
The system SHALL run seed phases serially in current dependency order: foundation; academic calendar; users; Course assignments and explicit rosters; outcomes; readiness snapshot; instruments; deployments; responses. Each runner SHALL receive or return only context required for its existing downstream dependency.

#### Scenario: Course-bound deployment receives prerequisites
- **WHEN** deployment seeding starts
- **THEN** the active academic period, Course assignment map, CILO map, and template version records already exist

#### Scenario: Readiness snapshot captures current intended point
- **WHEN** outcomes seeding completes
- **THEN** the completed-period readiness snapshot is persisted before instrument template and deployment seeding starts

#### Scenario: Response seeding starts
- **WHEN** response seeding starts
- **THEN** required evaluation assignments already exist for every seeded response lookup

### Requirement: Repeated-run fixture safety
The system SHALL preserve current upsert, find-or-create, duplicate-skip, and managed academic-calendar reset behavior. Running the complete seed repeatedly against an approved development database SHALL succeed and converge on the same logical fixture dataset without duplicate or drift errors.

#### Scenario: Second seed run recreates managed academic periods
- **WHEN** the complete seed runs a second time
- **THEN** it deletes only current managed academic-period dependent fixtures in existing child-first order, restores the immutable readiness trigger in `finally`, and recreates lifecycle term fixtures with current IDs and statuses

#### Scenario: Existing natural-key fixtures are seeded again
- **WHEN** the complete seed runs after existing Programs, Courses, Users, templates, and central deployments exist
- **THEN** existing selectors update or preserve records according to current seed behavior without creating duplicates

#### Scenario: Existing evaluation response data is seeded again
- **WHEN** the complete seed runs after current evaluation assignments, responses, and response items exist
- **THEN** find-or-create and duplicate-skip behavior succeeds without duplicate response or item errors

### Requirement: Importable seed contracts
The system SHALL expose extracted seed runner context types and pure Course-assignment key/guard logic from seed-only modules without importing the process entry point. Existing Vitest coverage SHALL validate the actual extracted key/guard logic rather than a copied implementation.

#### Scenario: Missing Course assignment context fails descriptively
- **WHEN** evaluation seeding requests a Course assignment key absent from its assignment map
- **THEN** the shared guard throws `Missing course assignment for <courseCode>` with the current course code

#### Scenario: Present Course assignment context resolves
- **WHEN** evaluation seeding requests an existing Course assignment key
- **THEN** the shared guard returns the mapped assignment ID using the existing composite key format

#### Scenario: Test imports shared seed guard
- **WHEN** the focused Vitest test exercises the Course-assignment guard
- **THEN** it imports the extracted seed-only helper and does not duplicate guard implementation or connect to Prisma
