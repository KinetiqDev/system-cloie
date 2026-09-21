# Graduate Outcome canonical terminology

**Status:** Accepted

System CLOIE uses **Graduate Outcome (GO)** as the canonical name for the program-level learning-outcome concept in current application code and user-facing copy. ADR 0017 remains historical context for the earlier GO-to-PLO rename and its compatibility boundaries.

## Context

The program-level outcome concept was previously called Program Learning Outcome (PLO) in the application. The institution has decided to restore Graduate Outcome (GO) as the user-facing and application terminology. This is a terminology cutover, not a database or historical-data migration.

## Decision

- Use Graduate Outcome (GO) and plural Graduate Outcomes (GOs) in current application symbols, schemas, services, server actions, UI copy, analytics labels, oversight labels, seed symbols, tests, and current domain documentation.
- Keep the physical database table `gos`, the physical CILO mapping column `go_id`, the physical PLO-named binding and snapshot tables, and generated Supabase names unchanged. Prisma application fields may use GO names while `@@map` and `@map` preserve the deployed schema.
- Preserve persisted outcome codes such as `BSIT-GO1`, readiness snapshot values such as `GRADUATE_OUTCOME`, central and template snapshot columns, and response instrument section/item keys such as `graduate-outcomes`. These are stored data and historical coordinates, not application terminology.
- Make `goId` the canonical analytics query parameter emitted by current links. Continue accepting `ploId` as a read-only legacy alias so existing bookmarks and historical reverse-trace links continue to resolve. Do not rewrite persisted links or stored response data.
- Keep accepting the legacy `PLO Code` CSV header while current generated templates and visible instructions use `GO Code`. Exported correction files use `GO Code` and the parser accepts both headers.
- Keep legal copy under `src/features/legal/content.ts` out of scope. Legal terminology requires a separate product decision.

## Consequences

- The current codebase and interface consistently use GO terminology without changing authorization, aggregation, publication gating, response privacy, or stored data.
- Physical migration SQL is not changed and no database migration is required.
- Callers of renamed application symbols are updated in the same cutover. The legacy `ploId` URL alias is intentionally retained only at the parsing boundary.
- `GRADUATE_OUTCOME`, `GO-*` codes, historical snapshots, and `graduate-outcomes` answer keys remain readable after deployment.

## Related issue sequencing

- Issue #603 is superseded and closed by this decision.
- Issues #625 and #626 remain separate behavior changes; their current titles and follow-up notes use Graduate Outcome (GO) terminology while preserving their existing physical and persisted compatibility identifiers.

Related: [#627](https://github.com/KinetiqDev/system-cloie/issues/627), [#625](https://github.com/KinetiqDev/system-cloie/issues/625), [#626](https://github.com/KinetiqDev/system-cloie/issues/626).
