# Program Outcome canonical terminology

**Status:** Accepted

System CLOIE uses **Program Outcome (PO)** as the canonical name for the program-level learning-outcome concept in current application code and user-facing copy. ADR 0030 (Graduate Outcome) and ADR 0017 (Program Learning Outcome) remain historical context for the two earlier terminologies and their compatibility boundaries.

## Context

The program-level outcome concept was previously called Graduate Outcome (GO) in the application, itself a restoration of Program Learning Outcome (PLO). The institution has decided that Program Outcome (PO) is the correct name for this layer: the concept is owned by an Academic Program, not by a graduating cohort or by a curriculum document. This is a terminology cutover, not a database or historical-data migration.

## Decision

- Use Program Outcome (PO) and plural Program Outcomes (POs) in current application symbols, schemas, services, server actions, UI copy, analytics labels, oversight labels, seed symbols, tests, and current domain documentation.
- Keep the physical table `gos` and the physical PLO-named binding and snapshot tables unchanged. The Prisma model is `PO` with `@@map("gos")`, the `CILOMapping` foreign key is `po_id`, and binding/snapshot fields map to `plo_id`, `plo_code_snapshot`, and `plo_description_snapshot`.
- Rename the one physical column that carried GO-era wording: `cilo_mappings.go_id` becomes `po_id` via an in-place `ALTER TABLE ... RENAME COLUMN` (migration `20261006160000_rename_cilo_mappings_go_id_to_po_id.sql`), which preserves every stored mapping row, the unique index, the foreign key, and the scope-check trigger. A drop/add would fail on a non-empty table and silently discard stored Program Outcome mappings.
- Preserve persisted outcome codes such as `BSIT-GO1`, readiness snapshot values such as `GRADUATE_OUTCOME`, central and template snapshot columns, and response instrument section/item keys such as `graduate-outcomes`. These are stored data and historical coordinates, not application terminology.
- Make `poId` the canonical analytics query parameter emitted by current links. Continue accepting `goId` (GO-era links) and `ploId` (PLO-era links) as read-only legacy aliases so existing bookmarks and historical reverse-trace links continue to resolve. Do not rewrite persisted links or stored response data.
- Current generated templates and visible instructions use `PO Code`. The parser and rows-to-fix export continue accepting the legacy `GO Code` and `PLO Code` headers for older spreadsheets.
- Keep legal copy under `src/features/legal/content.ts` out of scope. Legal terminology requires a separate product decision.

## Considered Options

- **Renaming the physical table `gos` → `pos` and the binding tables' `plo_id` → `po_id`.** Rejected. Those physical names carry no GO-era wording, they are already referenced by existing snapshots and constraints, and renaming them adds migration risk against production data for no terminology benefit.
- **Rewriting stored codes, snapshot values, and instrument keys.** Rejected. These are immutable historical coordinates; rewriting them would corrupt references to seeded mappings and legacy snapshot semantics.
- **Renaming documentation only, keeping code symbols.** Rejected. Static analysis and code review must see PO names in code so the acceptance is unambiguous.
- **Dropping the `goId`/`ploId` URL aliases.** Rejected. Links emitted under both prior terminologies exist in bookmarks and stored history; dropping them would silently break reverse-trace navigation.

## Consequences

- The current codebase and interface consistently use PO terminology without changing authorization, aggregation, publication gating, response privacy, or stored data.
- One migration is required: the in-place `cilo_mappings.go_id` → `po_id` column rename. It preserves all stored rows, the unique index, the foreign key, and the scope-check trigger, and it is idempotent with respect to databases that already carry `po_id`.
- A Prisma `@map` that disagrees with a deployed column fails at runtime (Prisma `P2022`), not at schema-parse time. `src/__tests__/config/prisma-schema-structure.test.ts` pins every Program Outcome field's physical column, and `scripts/verify-po-schema-parity.mts` asserts the same contract against a live database.
- Callers of renamed application symbols are updated in the same cutover. The legacy `goId` and `ploId` URL aliases are intentionally retained only at the parsing boundary.
- `GRADUATE_OUTCOME`, `GO-*` codes, historical snapshots, and `graduate-outcomes` answer keys remain readable after deployment.

Related: [ADR 0030](0030-graduate-outcome-canonical-terminology.md), [ADR 0017](0017-program-learning-outcome-canonical-terminology.md).
