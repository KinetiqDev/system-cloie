# Architecture Seam Policy

## Purpose

Define the initially enforced Fallow import seams and the approval threshold for broader architecture restrictions.

## Requirements

### Requirement: Shared and UI primitive seams remain one-way

The Fallow architecture policy SHALL prevent files under `src/components/ui/**` from importing route, feature, hook, shared-presentation, script, or Prisma modules. It SHALL prevent shared infrastructure under `src/lib/**`, excluding `src/lib/actions/**`, from importing route, feature, hook, or shared-presentation modules while allowing generated/application types under `src/types/**`.

#### Scenario: UI primitive imports a feature module

- **WHEN** a changed UI primitive imports a module from `src/features/**`
- **THEN** the pull-request code-intelligence audit reports an error-severity boundary violation

#### Scenario: Shared infrastructure imports generated Supabase types

- **WHEN** a shared Supabase adapter imports a type from `src/types/supabase-database.ts`
- **THEN** the architecture policy permits the import without a boundary violation

#### Scenario: Shared infrastructure imports a route module

- **WHEN** a changed shared infrastructure module imports a file from `src/app/**`
- **THEN** the pull-request code-intelligence audit reports an error-severity boundary violation

### Requirement: Existing composition seams remain observable before restriction

The policy SHALL classify route composition, Server Actions, feature modules, shared presentation, hooks, tests, scripts, and Prisma paths without prohibiting their existing import relationships during the initial rollout.

#### Scenario: Server Action calls a feature service

- **WHEN** a Server Action imports a schema or service from the affected feature module
- **THEN** the architecture policy classifies the action and feature paths without reporting a boundary violation

#### Scenario: Feature module uses a documented cross-domain dependency

- **WHEN** a feature module imports a module from a related domain context
- **THEN** the initial architecture policy reports the relationship only through inventory output and does not block the change solely for that dependency

### Requirement: Broader seam enforcement requires a separate approved design

The repository SHALL NOT add a generic Fallow architecture preset or a new restrictive cross-domain rule unless a dedicated change defines the affected module interface, intended seam, migration, and preserved domain authorization invariants.

#### Scenario: Maintainer proposes a feature-to-feature import ban

- **WHEN** a maintainer wants to prohibit an existing or future feature-to-feature dependency
- **THEN** the change is proposed and reviewed as a focused architecture change before the Fallow rule becomes blocking
