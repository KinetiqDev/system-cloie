# Canonical Outcome Attainment Interpretation Policy

**Status:** Accepted (Proposed Institutional Policy `CLOIE_OUTCOME_MEAN_V1`)

System CLOIE implements a consistent, deterministic mean-score interpretation and attainment classification system across learning outcome analytics for Program Outcomes (POs) and Course Intended Learning Outcomes (CILOs).

## Context

Prior analytics specifications and documentation explicitly deferred or prohibited outcome attainment claims (such as red/green performance labels or universal thresholding) because:
1. ACD had not yet formally approved numerical cutoffs or thresholds for OBE attainment.
2. Instruments use differing rating scales and respondent populations whose semantics must not be conflated (direct student CILO evaluation vs indirect alumni/employer perception).
3. Generic aggregation risked masking missing evidence or unsupported custom scales as non-attainment.

To support Continuous Quality Improvement (CQI), accreditation reviews, and academic monitoring for Program Heads and Faculty Members, the institution requires a defensible, deterministic interpretation policy informed by OBE assessment practices.

## Decision

- Adopt the versioned policy identifier **`CLOIE_OUTCOME_MEAN_V1`** with primary benchmark `mean >= 3.50`.
- Record policy status as **`proposed`** because formal institutional board approval is not yet recorded. It is informed by OBE/CQI assessment practices, not an external mandate from CHED, ABET, or PAASCU.
- Establish canonical interpretation and CQI bands for compatible five-point rating scales:

| Raw mean | Interpretation | CQI classification |
|---|---|---|
| 4.50–5.00 | Fully Attained | Meets Benchmark |
| 3.50–below 4.50 | Attained | Meets Benchmark |
| 2.50–below 3.50 | Partially Attained | Needs Attention |
| 1.50–below 2.50 | Slightly Attained | Below Benchmark |
| 1.00–below 1.50 | Not Attained | Below Benchmark |

- **Full-precision classification:** Classification operates on full-precision floating-point means; rounding occurs only at the presentation boundary. A mean of 4.495 displays as 4.50 but classifies as Attained (Meets Benchmark). Boundary values belong to the upper band (e.g. 3.50 is Attained / Meets Benchmark).
- **Scale identity and descriptor semantics:** Numerical range `1..5` alone does not authorize classification. Only frozen structure snapshots matching one of three approved five-point descriptor sets are supported:
  1. `direct-attainment`: Not Achieved, Slightly Achieved, Moderately Achieved, Mostly Achieved, Fully Achieved.
  2. `agreement`: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree.
  3. `performance`: Poor, Fair, Satisfactory, Very Satisfactory, Excellent.
- **Indirect survey caveat:** Agreement and performance scales are classified as indirect stakeholder evidence (`isIndirect = true`), reflecting stakeholder perception rather than direct demonstrated competency.
- **Explicit non-attainment separation:** Missing evidence (`no-evidence`), unsupported scales (`unsupported-scale`), and mixed-scale pools (`mixed-scales`) remain distinct statuses and never produce an attainment label. They are strictly distinguished from non-attainment (`Not Attained`).
- **Scope of classification:**
  - Applied to Program Outcomes (POs) on the Program Head Dashboard and Outcomes view.
  - Applied to CILOs on the Faculty CILO results view.
  - Not applied to Institutional Learning Outcomes (ILOs) (ADR 0035; ILO evidence remains unlabelled).
  - Not applied to generic course averages, overall stakeholder means, or unbound evaluation questions.
- **Bounded AI contract:** Deterministic attainment classifications are calculated server-side prior to invoking AI. The LLM is prohibited from calculating attainment, inventing thresholds, or overriding deterministic classifications.

## Consequences

- Program Heads and Faculty Members receive actionable, deterministic CQI signals with benchmark reference lines and delta disclosures.
- Academic leadership understands that 3.50 is a proposed institutional benchmark rather than an external accreditation cutoff.
- All outcome terminology canonicalizes to Program Outcomes (POs).
- Aggregate-only confidentiality, response privacy, and source-separation invariants remain strictly preserved.

Related: [ADR 0036](0036-program-outcome-canonical-terminology.md), [ADR 0035](0035-general-education-ilo-evidence.md), [ADR 0016](0016-server-side-bounded-ai-interpretation-boundary.md).
