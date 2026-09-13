# Relax the Central Deployment PLO Binding Gate

## Status

Accepted

## Date

2026-09-13

## Context

Publishing a Central deployment required every Likert question in the PROGRAM_WIDE template to carry at least one PLO question binding. `validatePublishPloBindings` in `src/features/evaluations/services/publish-central-deployment.ts` collected every Likert question through `listTemplateLikertQuestions` and failed when any of them had no binding row ("Every Likert question must be assigned to at least one PLO before publishing."). A template with Likert questions and zero binding rows failed identically.

That rule demanded question coverage, while the evidence contract needs outcome coverage. One general item ("Overall satisfaction with the program") blocked an entire deployment, and both available workarounds damaged evidence: inventing a PLO mapping for a question that does not measure that outcome, or deleting the question. The course-bound path already requires only that every active CILO is bound and permits extra unbound Likert questions.

Every downstream consumer already treats an unbound central Likert item as a general evaluation item: question metrics report binding type GENERAL, the deployment-level mean keeps its ratings, and PLO metrics skip it because they are projected from `CentralDeploymentPloSnapshot` rows.

## Decision

Central deployment publication enforces binding validity, not binding coverage:

- A Likert question with no PLO question binding does not block publication. It publishes as a general evaluation item, writes no `CentralDeploymentPloSnapshot` row, and contributes no Program PLO evidence.
- Bindings that no longer match the template structure, and bindings whose PLO is archived or outside the publishing program, still block publication.
- Publication snapshots the bound pairs only, exactly as before: PLO code, PLO description, and question prompt.
- The publish step names the unbound Likert questions, the bound count, and the covered PLO count for the selected template, so a partial mapping is a visible decision instead of a silent one. The binding gate stays server-side and remains authoritative.
- No PROGRAM_WIDE outcome-coverage rule replaces the removed question-coverage rule. A program-wide instrument may publish with no PLO bindings at all, for example a satisfaction instrument that measures no outcome.
- The published deployment record carries no "intentionally unmapped" marker. The absence of a snapshot row for a Likert question is the record, and read models derive the general items from it.

## Considered Options

- **Outcome coverage (every active PLO bound at least once), mirroring the CILO rule.** Rejected. It rebuilds the reported dead end in a new dimension: a short instrument cannot cover a long PLO catalog, a newly added PLO retroactively blocks templates that published before, and it forces mappings for outcomes the instrument does not measure.
- **An explicit per-question "general item" marking, persisted at publish time.** Rejected. No reader needs the intent. `CentralDeploymentPloSnapshot` has no intent column, all of its text columns are NOT NULL, and a marker row would be projected as a PLO by the analytics snapshot readers.
- **Warning only, with no signal on the publish step.** Rejected in favor of the checklist. The Program Head's partial mapping stays explicit, and the decision stays with the Program Head rather than with a silent server rule.

## Consequences

- `src/features/instruments/CONTEXT.md` (PLO question binding) and `src/features/evaluations/CONTEXT.md` (Central deployment) state the new rule.
- The publish gate tests that pinned the hard rule are replaced by publish-with-unbound cases; the archived-PLO and snapshot cases stay.
- Analytics and response review are unchanged: an unbound Likert item stays GENERAL in question metrics, stays in the deployment-level mean, and contributes nothing to PLO evidence.
- The Course-bound CILO rule, the typed alignment gate, and response collection are untouched.

## Related

- [Issue #625](https://github.com/KinetiqDev/system-cloie/issues/625) — relax the per-question PLO binding gate for Program-wide publication.
- [Issue #626](https://github.com/KinetiqDev/system-cloie/issues/626) — one CILO bound to multiple Likert questions (separate decision).
- [ADR 0017](0017-program-learning-outcome-canonical-terminology.md) — Program Learning Outcome canonical terminology.
