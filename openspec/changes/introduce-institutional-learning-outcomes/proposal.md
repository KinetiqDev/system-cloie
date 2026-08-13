## Why

System CLOIE currently models all CILO-to-outcome alignment through `CILOMapping` rows targeting Program-owned Graduate Outcomes. That model cannot represent the institution's revised rule: General Education CILOs align once to a common college-wide catalog of Institutional Learning Outcomes, while Program-specific CILOs align to the Graduate Outcomes of their owning Academic Program. The change must move mapping work into the Faculty Course workflow while giving the Secretary college-wide administration and the Dean read-only oversight, without allowing the two outcome layers to become semantically interchangeable.

This is a **BREAKING** outcome-model refactor affecting the Prisma schema, Supabase migrations and generated types, authorization, readiness calculation, completed-period snapshots, evaluation publication gates, role navigation, seed data, existing mapping routes, and Faculty/Secretary/Dean UI surfaces.

## What Changes

- Add a new institution-wide `InstitutionalOutcome` catalog, using stable unique codes, statements, display order, active/archive lifecycle, and historical preservation.
- Add a dedicated typed mapping relation for General Education CILO-to-Institutional Outcome links.
- Retain the existing typed CILO-to-GO relation for Program-specific Courses, with validation against the Course's owning Academic Program.
- **BREAKING:** General Education CILOs no longer map to Program-owned Graduate Outcomes. They map to the shared Institutional Outcome catalog instead.
- **BREAKING:** Remove the current Program Head mapping-authoring workflow. Program Heads retain Graduate Outcome ownership and read-only mapping/readiness review; they no longer mutate mapping rows.
- Allow Faculty Members with active teaching capability for a Course to create, revise, and remove the valid typed mappings for that Course.
- Give Secretary users college-wide administration of Institutional Outcomes, Graduate Outcomes, CILOs, and both mapping relations through protected before/after review, freshness recheck, and atomic commit behavior.
- Keep Dean outcome access read-only and extend Dean Learning Outcomes oversight to include Institutional Outcomes and General Education alignment coverage.
- Add target-specific readiness: active General Education CILOs require at least one active Institutional Outcome mapping; active Program-specific CILOs require at least one active Graduate Outcome mapping belonging to the Course's owning Academic Program.
- Exclude archived Institutional Outcomes and Graduate Outcomes from live readiness and new evaluation publication while retaining historical visibility.
- Block new Course-bound evaluation publication when any active CILO lacks a valid active target mapping, with a direct repair path to Faculty Course alignment.
- Replace the Faculty CILO-only workflow with a target-aware, URL-backed Course alignment detail surface inside the Faculty Manage CILOs area.
- Use a searchable accessible multi-select per CILO, showing the valid target catalog for the Course scope; General Education never mixes Institutional Outcomes with Graduate Outcomes.
- Save one complete mapping diff per Course in a reviewed atomic operation, with durable mapping provenance identifying the actor and timestamps.
- **BREAKING:** Delete legacy General Education CILO-to-GO mapping rows in the migration. The migration must report the deletion scope and execute transactionally; this is an irreversible data operation selected for the current deployment, not an automatic semantic crosswalk.
- Preserve already-completed Academic Period readiness snapshots and published evaluation snapshots; future snapshots use typed target details and the new readiness rules.
- Keep ILO-to-GO crosswalks, dual CILO target mappings, attainment rollups, and outcome versioning out of scope for this change.

## Capabilities

### New Capabilities

- `institutional-outcome-catalog`: Secretary-managed college-wide Institutional Outcome records with stable identity, ordering, archive/restore lifecycle, protected writes, and Dean read-only oversight.
- `typed-cilo-outcome-mappings`: Separate General Education CILO-to-Institutional Outcome and Program-specific CILO-to-Graduate Outcome relations with server and database scope enforcement, uniqueness, provenance, and atomic diffs.
- `faculty-course-outcome-alignment`: Faculty Course-level alignment workflow with target-aware URL-backed Course detail, accessible searchable multi-select controls, loading/error/empty states, and reviewed saves.
- `outcome-readiness-by-target`: Live and completed-period readiness using target-specific rules, immutable typed historical snapshots, and archived-target handling.
- `outcome-publication-alignment-gate`: Course-bound evaluation publication validation that rejects incomplete active CILO alignment and provides a repair path.
- `institutional-outcome-oversight`: Dean read-only Learning Outcomes presentation for Institutional Outcomes, General Education coverage, mapping gaps, and shared readiness.

### Modified Capabilities

- None. No current main OpenSpec capability spec defines the outcome mapping behavior; this change supersedes the implementation and ADR behavior described in `docs/adr/0005-outcome-ownership-and-dean-oversight.md`.

## Impact

- **Change classification:** Breaking feature and domain-model refactor.
- **Prisma schema:** Add an Institutional Outcome model, a dedicated General Education mapping model, mapping provenance fields/relations, and any typed readiness snapshot payload contract in existing model files. Retain and revise `GO`, `CILO`, and Program-specific mapping relations.
- **Supabase migrations:** Create new catalog and mapping tables, constraints, indexes, RLS/revokes consistent with server-side authorization, and a transactional legacy General Education mapping deletion. Do not edit historical migrations. The deletion migration must be reviewed before push.
- **Generated types:** Regenerate `src/types/supabase-database.ts` with `pnpm supabase:types`; never hand-edit it.
- **Authorization:** Faculty + Secretary write typed mappings; Secretary administers both outcome catalogs; Program Head manages Program-owned GOs but has read-only mapping review; Dean has read-only oversight.
- **Feature contexts:** Course Catalog and Assignments, Identity and Access, Evaluations, Academic Calendar/Readiness, Outcomes, and Design System. A new Institutional Outcomes glossary/context may be added if the implementation establishes a durable bounded context.
- **Routes/navigation:** Add Secretary Learning Outcomes/Institutional Outcomes catalog navigation; add Faculty URL-backed Course alignment detail; preserve or redirect/remove the Program Head mapping-authoring route according to the final route design; extend Dean College Oversight Learning Outcomes.
- **Privacy/caching:** Outcome catalog and readiness reads remain server-authorized. No new shared session or private-data cache is introduced. Dean oversight reads retain `private, no-store` behavior.
- **Deployment:** Migration order, destructive deletion safeguards, seed replay, Prisma generation, focused tests, `pnpm lint`, and `pnpm build` are required before completion.
- **Architectural documentation:** Amend or supersede ADR 0005 to record the new Institutional Outcome layer, typed mapping paths, role authority, and deferred ILO-to-GO crosswalk.
