## Why

The current CILO-to-GO mapping model is binary: a CILO either maps to a Program outcome or it does not. The college needs a typed relationship where every CILO is classified against every Program Learning Outcome as Learning, Practice, or Opportunity, and where Faculty can save partial work and resume later. The change also renames Graduate Outcome to Program Learning Outcome and removes the Secretary from the outcome-management workflow.

## What Changes

- **BREAKING** Mapping semantics: for Program-specific Courses, every active CILO must carry exactly one manifestation for every active PLO of the Course's owning Program. The existing "at least one valid target per CILO" rule is replaced by this exhaustive rule everywhere readiness is computed.
- **BREAKING** `CILOMapping` gains a manifestation enum (`LEARNING`, `PRACTICE`, `OPPORTUNITY`). Legacy rows migrate with a transitional nullable manifestation and count as incomplete until classified.
- Faculty can save a draft with unanswered cells and resume later. Unanswered pairs are absent rows, never a special value. Draft saves bypass the completeness check; review and commit still require every required pair.
- Faculty commit becomes create + update only, with a completeness gate, manifestation-aware before/after review, and manifestation-aware freshness tokens.
- **BREAKING** Terminology: Graduate Outcome (GO) becomes Program Learning Outcome (PLO) in all visible copy, glossary entries, domain symbols, and new code. Physical table names may stay behind Prisma mappings.
- Program Head keeps PLO management and gains the same read-only mapping review with manifestation values; review copy no longer says the Secretary corrects mappings.
- **BREAKING** Secretary outcome removal: `/secretary/learning-outcomes` and `/secretary/learning-outcomes/alignment/[courseId]` are removed or redirected, the Secretary nav entry is removed, and server-side authorization for Secretary mapping writes and ILO encoding is removed.
- Analytics behavior is unchanged. Only mechanical compile fixes from the rename are applied.

## Capabilities

### New Capabilities
- `cilo-plo-manifestation-mapping`: the exhaustive CILO-to-PLO manifestation model, mapping identity, draft saves, commit validation, scope and lifecycle rules, freshness, and validation boundaries.
- `course-alignment-readiness`: the exhaustive readiness semantics that replace the at-least-one rule, including the publication gate and readiness snapshots.
- `plo-outcome-terminology`: canonical Program Learning Outcome terminology replacing Graduate Outcome in product copy, glossary, and user-visible surfaces.
- `program-head-plo-management`: Program Head PLO administration and read-only CILO-to-PLO mapping review.
- `secretary-outcome-access-removal`: removal of the Secretary outcome interface, navigation, routes, and service-layer authorization.

### Modified Capabilities

None. No existing spec in `openspec/specs/` covers the outcomes domain at requirement level.

## Impact

- Prisma model: `prisma/models/outcomes.prisma` (`GO` renamed to `PLO` behind `@@map("gos")`, `go_id` to `plo_id` behind `@map`, new enum, new manifestation and `updated_at` fields on `CILOMapping`).
- SQL migration: new enum type, nullable manifestation column, `updated_at` column. Unique pair constraint and program-scope triggers preserved.
- Generated Supabase types: regenerated via `pnpm supabase:types`, never hand-edited.
- Services: `manage-course-alignment.ts`, `manage-outcome-writes.ts`, `manage-cilo-mappings.ts`, `classify-course-alignment.ts`, `manage-program-head-outcomes.ts`, `manage-institutional-outcomes.ts`.
- Server Actions: `course-alignment-actions.ts`, `program-head-outcome-actions.ts`, institutional outcome actions removed.
- Routes: Faculty alignment, Program Head outcomes and mapping review, Secretary learning-outcomes routes removed.
- Authorization: Secretary mapping and ILO write paths removed server-side.
- Domain context: `src/features/outcomes/CONTEXT.md` rewritten for PLO terminology, exhaustive readiness, and role responsibilities.
- Analytics: mechanical type and terminology fixes only; behavior unchanged.
- No caching or privacy boundary changes.
