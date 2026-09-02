# Response Review

Response Review defines how System CLOIE surfaces submitted evaluation responses for review: an identified Program Head flow and an anonymized flow for Faculty and Dean, the outcome binding of each submitted quantitative answer, and aggregate qualitative summarization.

## Review flows

**Identified review**:
The Program Head review flow serving submitted-response detail with respondent identity and academic context (student, alumni, or industry context). Identity fields live only in Program Head DTOs, which sit in a distinct feature boundary so respondent identity can never join a shared Faculty-facing DTO.
_Avoid_: Faculty review with identity, de-anonymized Faculty flow

**Anonymized review**:
The Faculty and Dean review flow over the same submitted responses without respondent identity; it keeps an anonymized respondent label rather than the identified shape. Faculty and Dean never receive the identified detail DTO.
_Avoid_: Identified Faculty review

**SUBMITTED gate**:
Identified response bodies are served only after status SUBMITTED, with PROGRAM_HEAD role, a resolved selected-Program context, and membership of the response in that Program (course-bound or program-wide). IN_PROGRESS bodies are never fetched.
_Avoid_: Draft response review

## Outcome binding

**Submitted-answer binding**:
The outcome binding of one submitted quantitative answer: CILO (with the Program's current CILO-to-PLO manifestation mappings), PLO (publication-time program-wide bindings), or GENERAL (no matching binding). Bindings govern how ratings are attributed to outcomes.
_Avoid_: Raw question outcome, unbound rating

**Program-wide PLO binding**:
A publication-time PLO binding sourced from CentralDeploymentPloSnapshot rows, keyed by `plo_id` for live PLOs and by `snapshot:<code>:<description>` so retired PLOs stay reachable through their grouping key.
_Avoid_: Current PLO binding, live PLO reference

## Summarization and context

**Period label**:
The canonical school year — semester — term label used across review contexts, e.g. '2025-2026 — 2nd Semester — 2nd Term' (two-part when the term is null). Semester and term use the friendly display labels, never raw enum values.
_Avoid_: Raw term instance id, raw enum label

**Qualitative summary**:
Aggregate evidence over submitted qualitative answers: non-empty answer count, distinct respondent count, per-prompt counts ordered descending, and identifier-redacted top terms feeding word clouds. Raw response rows and comments never appear in the summary.
_Avoid_: Raw comment dump, per-respondent qualitative listing
