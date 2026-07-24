## ADDED Requirements

### Requirement: Domain-oriented Prisma schema preserves complete datamodel
The Prisma schema SHALL be represented by one main `prisma/schema.prisma` entrypoint plus cohesive domain-oriented `.prisma` files under `prisma/models/`. The composed schema MUST contain every current enum and model exactly once and MUST preserve model names, enum names, enum values, field names, field types, nullability, defaults, native UUID types, `@map`, `@@map`, named indexes, composite keys, relation names, and referential actions.

#### Scenario: Prisma loads complete schema directory
- **WHEN** Prisma validation runs against `prisma` as schema directory
- **THEN** validation succeeds and discovers all current enums and models across the main file and domain files

#### Scenario: Domain definitions remain uniquely owned
- **WHEN** the composed Prisma schema is inspected
- **THEN** each current enum and model appears exactly once and no duplicate or omitted definition exists

### Requirement: Generated Prisma Client compatibility remains stable
The system SHALL continue generating one Prisma Client with the current `@prisma/client` import path and current model, enum, and relation accessor names. Schema modularization MUST NOT require application callers, `prisma/seed.ts`, or `src/types/supabase-database.ts` to change.

#### Scenario: Client generation succeeds
- **WHEN** `pnpm exec prisma generate --schema prisma` runs with selected compatible Prisma versions
- **THEN** Prisma Client generation succeeds without a schema composition error

#### Scenario: Existing Prisma callers remain type-compatible
- **WHEN** `pnpm lint`, `pnpm test`, and `pnpm build` run after generation
- **THEN** existing imports and Prisma model accessors compile and tests execute without changes to runtime behavior

### Requirement: Cross-file relations preserve database behavior
The composed schema MUST preserve both sides of every relation, including named relations, composite field/reference order, optionality, `onDelete`, and `onUpdate` behavior. Cross-domain references SHALL resolve through Prisma's shared schema namespace without duplicate relation declarations or inferred replacements.

#### Scenario: Composite relation definitions remain intact
- **WHEN** validation inspects `CourseAssignmentMembership`, `CourseBoundEvaluationExclusion`, and `AlumniProfile`
- **THEN** their composite relations retain exact scalar field order, referenced field order, relation names where present, and referential actions

#### Scenario: Named relations remain intact
- **WHEN** generated Prisma Client metadata is compared before and after modularization
- **THEN** named relations such as `AssignmentAssigner`, `EnrollmentCreator`, `CourseBoundAssignments`, `CentralDeployments`, `InstrumentTemplateCopies`, and membership/exclusion actor relations remain available with unchanged names

### Requirement: Database structure remains migration-safe
The change MUST produce no data migration and no Supabase migration solely from reorganizing schema files. Before/after datamodel and migration-diff verification SHALL detect any unintended change to tables, columns, enum values, mappings, indexes, constraints, defaults, foreign keys, triggers, functions, RLS, revokes, or referential actions.

#### Scenario: From-empty datamodel SQL remains equivalent
- **WHEN** SQL is generated from the pre-change single-file schema and the post-change schema directory
- **THEN** normalized outputs contain no unintended table, column, enum, index, constraint, default, foreign-key, mapping, or referential-action change

#### Scenario: SQL-only invariants remain migration-owned
- **WHEN** the migration set is reviewed after implementation
- **THEN** existing SQL-only `NULLS NOT DISTINCT` indexes, partial unique indexes, CHECK constraints, triggers, RLS, and revokes remain unchanged and no replacement migration is created for file reorganization

#### Scenario: Linked migration helper uses complete schema
- **WHEN** `pnpm supabase:migration:diff -- modularize_prisma_schema_check` is run in a controlled environment
- **THEN** the helper passes the schema directory, generated output is inspected for unintended SQL, and no migration is applied or retained solely for modularization

### Requirement: Prisma tooling uses supported multi-file schema version
The repository SHALL use a compatible Prisma version at or above the first stable multi-file schema release, with `prisma` and `@prisma/client` kept compatible. The repository MUST NOT rely on a preview-only folder feature.

#### Scenario: Installed version supports folder schema
- **WHEN** `pnpm exec prisma validate --schema prisma` runs
- **THEN** it succeeds without requiring `previewFeatures = ["prismaSchemaFolder"]`

#### Scenario: Package and generated client versions agree
- **WHEN** `pnpm exec prisma -v` runs after dependency update
- **THEN** `prisma` and `@prisma/client` report the selected compatible 6.x version and Client generation uses that same version family

### Requirement: Existing database and application scope stays unchanged
The refactor SHALL not change `prisma/seed.ts`, application authorization, account-state handling, Course assignment and roster invariants, outcomes ownership, deployment behavior, response handling, generated Supabase types, migration history, or deployment configuration.

#### Scenario: Seed and generated types remain untouched
- **WHEN** the implementation diff is reviewed
- **THEN** `prisma/seed.ts` and `src/types/supabase-database.ts` have no hand-authored changes

#### Scenario: Existing verification suites remain applicable
- **WHEN** database-focused tests and default unit tests run
- **THEN** the existing database invariant gate remains enforced, and tests do not write to hosted Supabase unless explicitly opted in with `RUN_DATABASE_INTEGRATION_TESTS=1`
