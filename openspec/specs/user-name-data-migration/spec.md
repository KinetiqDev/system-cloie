# User Name Data Migration

## Purpose

Define the production-safe database transition from split account-name columns to required canonical `User.name`, including compatibility, generated types, deterministic fixtures, and release verification.

## Requirements

### Requirement: Existing User names are backfilled without invented values

The production migration SHALL preserve each existing User's visible combined name by adding `users.name`, backfilling it from the existing split columns after trimming empty components, and refusing to complete when any resulting name is blank. The migration SHALL not invent placeholders.

#### Scenario: Two non-empty legacy components are migrated

- **GIVEN** a User has `first_name = "Jane"` and `last_name = "Doe"`
- **WHEN** the migration backfills `users.name`
- **THEN** the resulting value SHALL be `Jane Doe`

#### Scenario: Single legacy component is migrated

- **GIVEN** a User has one non-empty legacy name component and the other component is blank
- **WHEN** the migration backfills `users.name`
- **THEN** the resulting value SHALL be the one non-empty trimmed component

#### Scenario: Legacy data cannot produce a name

- **GIVEN** a User's legacy name components are both blank or whitespace-only
- **WHEN** the migration validates the backfill
- **THEN** it SHALL fail or abort before enforcing `NOT NULL` and SHALL not write an invented placeholder

### Requirement: The database contract transitions to required User.name

The Prisma model and deployed PostgreSQL schema SHALL converge on required `User.name` and SHALL remove the obsolete `first_name` and `last_name` columns only after application consumers have migrated. During the rollout compatibility window, a temporary database bridge SHALL allow old split-field writers to continue creating/updating a valid `name` while the new application writes only `name`. The migration sequence SHALL be reviewable and compatible with existing production data.

#### Scenario: Expansion migration is applied

- **GIVEN** the database still contains legacy split name columns and an older deployed application may still write them
- **WHEN** the expansion migration runs
- **THEN** it SHALL add nullable `name`, backfill and validate it, make legacy split columns nullable as needed, install a temporary bridge for old writers, and make `name` required while preserving a recoverable compatibility window

#### Scenario: Old writer uses the compatibility bridge

- **GIVEN** the expansion migration has run and an older application writes split name fields without `name`
- **WHEN** the database insert or update trigger runs
- **THEN** it SHALL derive a non-blank `name` from the split fields and SHALL not reject the old write solely because the new name field was omitted

#### Scenario: New writer bypasses the compatibility bridge

- **GIVEN** the name-based application writes a valid `name` without split fields
- **WHEN** the database trigger runs
- **THEN** it SHALL preserve the explicit `name` and SHALL not overwrite it from stale legacy columns

#### Scenario: Compatibility bridge is removed

- **GIVEN** the name-based application is deployed and verified and no old writer remains
- **WHEN** the contract migration completes
- **THEN** it SHALL remove the temporary bridge and legacy split columns while leaving required `users.name` intact

#### Scenario: Migration fails before commit

- **GIVEN** the migration encounters invalid source data or a database failure before commit
- **WHEN** the migration aborts
- **THEN** the database SHALL remain unchanged and the operator SHALL not rerun destructive SQL blindly

### Requirement: Generated database types reflect the new schema

After the deployed schema and Prisma model converge, the repository SHALL regenerate `src/types/supabase-database.ts` through the supported command and SHALL not hand-edit the generated file.

#### Scenario: Supabase types are regenerated

- **GIVEN** the deployed schema exposes `users.name` and no obsolete split fields
- **WHEN** the type-generation workflow runs
- **THEN** the generated types SHALL represent the required `name` field and SHALL omit `first_name` and `last_name`

#### Scenario: A handwritten generated-type edit is attempted

- **GIVEN** a contributor changes the generated type file directly instead of regenerating it
- **WHEN** the change is reviewed or verified
- **THEN** it SHALL be rejected as incompatible with the repository database workflow

### Requirement: Seed and demo identities remain deterministic after migration

Prisma seed fixtures, development auth, dedicated demo auth, and the outline-defense bootstrap SHALL use one canonical name value and remain repeatable without depending on Google OAuth metadata.

#### Scenario: Prisma seed is run repeatedly

- **GIVEN** the managed seed fixtures contain canonical `name` values
- **WHEN** `pnpm db:seed` runs more than once
- **THEN** it SHALL upsert the same deterministic names and preserve existing role, academic, enrollment, roster, and evaluation fixture invariants

#### Scenario: Outline defense bootstrap is rerun

- **GIVEN** an existing outline-defense demo User has the expected canonical name marker
- **WHEN** the bootstrap script runs again
- **THEN** it SHALL safely reuse the User and preserve the existing safety guard

#### Scenario: Demo identity is used without OAuth

- **GIVEN** a development or dedicated-demo session selects a seeded User
- **WHEN** the session is authenticated
- **THEN** the system SHALL use the seeded canonical name and SHALL not require provider metadata

### Requirement: Migration verification covers data and application behavior

The change SHALL be verified through focused migration/data checks, OAuth callback tests, identity and onboarding tests, downstream projection tests, `pnpm lint`, `pnpm test`, and `pnpm build`. Hosted database integration tests SHALL remain gated and SHALL never run against a shared database.

#### Scenario: Focused identity verification passes

- **GIVEN** the name migration and application transition are complete
- **WHEN** the focused callback, schema, Secretary, projection, seed, and demo test suites run
- **THEN** they SHALL cover first-link replacement, linked-name preservation, missing-name failure, identity conflict, canonical projections, and deterministic fixtures

#### Scenario: Production compilation verification passes

- **GIVEN** all source consumers have migrated from split name fields
- **WHEN** `pnpm lint` and `pnpm build` run
- **THEN** they SHALL complete without stale Prisma field references or generated-type mismatches

#### Scenario: Database integration verification is requested

- **GIVEN** an invariant suite needs a database
- **WHEN** the database suite runs
- **THEN** it SHALL require `RUN_DATABASE_INTEGRATION_TESTS=1` and a disposable database target, preserving the repository's hosted-database safety gate
