# Program Learning Outcome Canonical Terminology

**Status:** Accepted

System CLOIE renames the "Graduate Outcome" (GO) concept to "Program Learning Outcome" (PLO) across the application. PLO is the canonical term in code, contracts, documentation, and user-visible copy; the Prisma model `GO` is renamed to `PLO` behind the existing physical table (`@@map("gos")`) and column (`@map("go_id")`) names so no database migration or physical rename is required.

## Context

The outcomes domain models three learning-outcome layers: Institutional Outcomes, program-level outcomes, and Course Intended Learning Outcomes. The program-level layer was named "Graduate Outcome," which conflated the outcome's role (a Program outcome, not a graduation credential) and diverged from the terminology used by the institution's curriculum and accreditation workflows. OpenSpec change `cilo-to-plo-manifestation` established PLO as the canonical term and requires every user-visible surface to use it.

## Decision

- Rename the domain term from "Graduate Outcome" to "Program Learning Outcome" (PLO) everywhere: Prisma model and client accessors, schemas, services, server actions, UI components and copy, analytics and oversight consumers, seed symbols, tests, and domain documentation.
- Keep the physical database names: the Prisma model keeps `@@map("gos")`, the `CILOMapping` foreign key keeps `@map("go_id")`, and the relation field becomes `plo`/`plos`. This avoids a data migration and keeps the change purely a code-and-terminology rename.
- Preserve persisted data values verbatim: stored outcome codes (e.g., `BSIT-GO1`), snapshot target-layer values (`GRADUATE_OUTCOME` in `academic_period_readiness_snapshots`), and instrument/seed titles that are data. These are data, not terminology, and are never surfaced as the concept name.
- Rename type and service-contract symbols that carry the GO/Go token across swept domains (e.g., `goId` → `ploId`, `goMappings` → `ploMappings`, `goCount` → `ploCount`) while keeping behavior identical.
- Leave legal copy under `src/features/legal/content.ts` out of scope: revising legal text is a product decision outside this rename.

## Considered Options

- **Physical database rename (table `gos` → `plos`, column `go_id` → `plo_id`) with a migration.** Rejected. It adds migration risk, touches frozen migration integrity tests, and provides no behavioral value; `@@map`/`@map` already exposes PLO accessor names.
- **Data-value migration of stored codes and snapshot values.** Rejected per the change spec. Codes such as `GO-1` and snapshot `GRADUATE_OUTCOME` values are immutable or historical data; rewriting them would corrupt references (seeded mappings) and legacy snapshot semantics.
- **Rename documentation only, keep code symbols.** Rejected. The spec requires type and contract names to use PLO so acceptance via static analysis and code review is unambiguous.
- **Rename the Analytics and Oversight consumers' DTO field names.** Accepted selectively: symbol names carrying GO/Go tokens are renamed, while behavior and persisted payload values are unchanged.

## Consequences

- `pnpm build` and the test suite remain green; no behavioral change is introduced by the rename.
- Callers of renamed server actions and DTO fields are updated in the same change; Next.js binds server actions by reference at build time, so no persisted client contract is affected.
- No migration is generated for this change; the `prisma migrate diff` against the base schema is empty.
- Legacy snapshots and stored data continue to contain `GRADUATE_OUTCOME` and `GO-` codes; documentation (including the outcomes domain `CONTEXT.md`) states that these are data values, not terminology.