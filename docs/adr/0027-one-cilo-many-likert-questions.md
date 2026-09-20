# One CILO May Be Evidenced by Several Likert Questions

## Status

Accepted

## Date

2026-09-13

## Context

Course-bound template drafting enforced a one-to-one relationship between a course CILO and a Likert question:

- `InstrumentTemplateCiloQuestionBinding` declared `@@unique([template_id, cilo_id])` alongside its question-side `@@unique([template_id, section_key, item_key])`.
- `CourseBoundCiloQuestionBinding` mirrored it with `course_bound_cilo_question_bindings_eval_cilo_key` on `(course_bound_evaluation_id, cilo_id)`.
- `validateDraftBindings` rejected a repeated CILO ("Each CILO can only be assigned once."), and both publish paths additionally required `bindings.length === cilos.length`.
- The builder disabled any CILO already bound elsewhere, with no explanation.

The GO side has no equivalent constraint: `itpqb_template_plo_question_key` keys the full `(template_id, plo_id, section_key, item_key)` tuple, so one GO can already span several questions. The key and columns remain physical compatibility identifiers.

That rule made a legitimate instrument unauthorable. A CILO commonly needs more than one question — one per learning activity, or a multi-part instrument — and a Faculty member had only two options: drop a question, or mis-map it to a different CILO. Both damage evidence: the first loses coverage, the second attributes ratings to an outcome the question does not measure.

The same rule leaked into the read models. `getCourseBoundReviewDetail` and `get-faculty-analytics-data.ts` emitted one metric per binding with a position-derived label (`` `CILO ${index + 1}` ``), so a CILO with two questions would have rendered as two cards with duplicated labels and split means rather than one pooled outcome.

## Decision

The CILO↔question relationship is one-to-many from the CILO side:

- A CILO may be bound to one or more Likert questions in the same COURSE_BOUND template.
- A question still carries at most one CILO. Both binding tables keep their question-side unique key and widen the CILO-side key to `(…, cilo_id, section_key, item_key)`, matching the GO key shape.
- Draft save and both publish paths (faculty-owned and on-behalf) enforce the question-side rule and a coverage gate: every active CILO of the bound course must be bound to at least one Likert question. The count-equality check is removed, because a template with more bindings than CILOs is exactly the intended shape.
- Publishing snapshots one `course_bound_cilo_question_bindings` row per (CILO, question) pair. A CILO's analytics pool every valid rating across all of its questions into one raw mean, never a mean of question means, and label the CILO from its publication-time `cilos_snapshot` entry rather than from binding position.
- The builder keeps a single-CILO select per question and no longer disables a CILO bound elsewhere; each option instead reports how many questions already carry it.
- Binding a CILO auto-fills an untitled question's prompt with the CILO description but never overwrites a prompt the author already wrote.

Unchanged: response attribution. `QuantitativeResponseItem.cilo_question_binding_id` stays per-answer-row and resolves by question key, so each question's rating still binds to its own row. The response → CILO resolution, the CILO→GO/ILO alignment gate, the GO question binding, and the one-response and finalized-submission invariants are untouched.

## Consequences

- The migration is loosening only. Every existing row satisfies the wider key, so no backfill is required and seeded templates, published evaluations, and historical trends stay valid. `prisma/seed/runners/seed-faculty-publication-template.ts` was the one writer keyed on the dropped unique; it now upserts on the question-side key.
- `src/features/instruments/CONTEXT.md` reverses its stated "one question per CILO" invariant, and `src/features/evaluations/CONTEXT.md` gains no change because it never asserted the cardinality.
- Per-CILO evidence becomes denser: a CILO's mean now pools more ratings, and its `questionCount`/`contributingQuestions` grow with the binding count. CILO evidence surfaces list the bound questions instead of naming one.
- A template may now carry more bindings than CILOs, so the publish preview reports the Likert question binding count rather than a CILO count.
- Full many-to-many (a question carrying several CILOs) remains out of scope: it would change response attribution, question metrics, and the publish snapshot shape. A question-side violation still fails with "A Likert question can only be assigned one CILO."

## Related

- [ADR 0011](0011-fallow-code-intelligence-policy.md) — tracing consumers before restructuring reported code.
- [ADR 0025](0025-relax-central-deployment-go-binding-gate.md) — the equivalent coverage-not-count rule on the Program-wide GO side.
- `src/features/instruments/CONTEXT.md` — _CILO question binding_, template types.
- `src/features/outcomes/CONTEXT.md` — CILO ownership and typed alignment.
- GitHub issue [#626](https://github.com/KinetiqDev/system-cloie/issues/626).
