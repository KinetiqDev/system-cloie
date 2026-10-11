# Course-Mean Attainment Classification on the Program Head Courses Tab

**Status:** Accepted

**Amends:** [ADR 0037](0037-canonical-outcome-attainment-interpretation-policy.md) scope; reverses the categorical-color rule for course-comparison charts in `docs/design.md`.

## Context

ADR 0037 adopted the canonical attainment interpretation policy `CLOIE_OUTCOME_MEAN_V1` (benchmark 3.50) for Program Outcome and CILO means, and explicitly excluded generic course averages. `docs/design.md` consequently required course-comparison charts to keep categorical series colors, with legends naming categories rather than attainment.

Product review of the Program Head Analytics Courses tab ("Mean Rating by Course") found the per-course categorical colors (one series color per course) read as arbitrary and inconsistent with the canonical attainment color coding used across the Outcomes view, dashboard PO summary, and Faculty CILO views. Program Heads read course means through the same CQI lens as outcome means.

## Decision

- Course-bound scale-group means on the Program Head Courses tab are classified server-side with the same deterministic policy `CLOIE_OUTCOME_MEAN_V1` (`classifyOutcomeMean`), reusing the frozen scale identity already resolved per scale group. No thresholds are introduced client-side or in the AI packet.
- Compatible scale-group means take the canonical CQI colors (`--color-success` / `--color-warning` / `--color-danger` via `ATTAINMENT_PRESENTATION`); unclassified means (unsupported scale, no evidence) render muted (`--text-muted`), never a failure color.
- When any ranked bar in the comparison is classified, the chart shows the canonical `AttainmentLegend` and the neutral dashed 3.50 benchmark reference line, matching the Outcomes view presentation.
- Contextual attribution charts (major, year level) and instrument comparisons remain categorical; their rows carry no classification.

## Consequences

- ADR 0037's exclusion list loses its "generic course averages" entry for the Program Head Courses tab; policy status (proposed institutional benchmark) and all non-attainment separation invariants are unchanged.
- `docs/design.md` chart-color guidance is updated: course-mean comparison charts are attainment-colored when server classification validates the frozen scale; all other listed charts keep categorical colors.
- Classification remains a closed, serializable server projection; the browser never computes or infers attainment.

Related: [ADR 0037](0037-canonical-outcome-attainment-interpretation-policy.md), [ADR 0035](0035-general-education-ilo-evidence.md).
