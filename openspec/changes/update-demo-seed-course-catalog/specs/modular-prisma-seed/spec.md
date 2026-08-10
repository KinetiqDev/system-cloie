# Modular Prisma Seed

## MODIFIED Requirements

### Requirement: Deterministic fixture identity and values
The system SHALL preserve every existing seed fixture record, deterministic UUID, relationship, status, timestamp, text value, rating, ordering value, template structure, and academic context — except the demo course catalog, which the `update-demo-seed-course-catalog` change replaces with the ACD curriculum courses by intent. Seed-only fixtures and constants SHALL remain under `prisma/seed/` and SHALL not move into production feature modules.

#### Scenario: Fixed identity fixture exists
- **WHEN** the seed completes
- **THEN** the User, School Year, academic period, central deployment, and Course-bound fixture records retain their existing deterministic UUID values

#### Scenario: Explicit Course-assignment roster exists
- **WHEN** the seed completes
- **THEN** Course-assignment memberships retain current explicit Student membership fixtures and are not inferred from Student term placement

#### Scenario: Response fixture exists
- **WHEN** the seed completes
- **THEN** representative submitted and in-progress responses retain their existing response status, submission timestamp, quantitative ratings, qualitative text, section keys, and item keys

#### Scenario: Course catalog reflects the ACD curriculum
- **WHEN** the seed completes after the `update-demo-seed-course-catalog` change
- **THEN** the `courses` table holds the 102 ACD curriculum courses with normalized codes and complete placement defaults, and prior fabricated placeholder courses absent from the fixture are deactivated (seed-managed rows only; user-created courses are untouched)
