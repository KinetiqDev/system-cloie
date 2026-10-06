# Response Review

Response Review defines how System CLOIE surfaces submitted evaluation responses for authorized evidence owners: identified Program Head review for Program-specific courses and Central deployments, identified General Education Coordinator review for General Education courses across Programs, and aggregate-only Faculty analytics. It also owns submitted-answer outcome bindings and aggregate qualitative summarization.

## Review flows

**Identified review**:
Submitted-response detail with respondent identity and academic context, available to the active evidence-owning role. Program Heads review Program-specific Course-bound and Central evidence within their Authorized Program set; General Education Coordinators review General Education Course-bound evidence college-wide. A Student's Program membership does not grant the Program Head access to that Student's General Education responses. Identified DTOs remain separate from Faculty and Dean aggregate DTOs.
_Avoid_: General Education evidence in Program Head review, Program-specific or Central evidence in Coordinator review, identified Faculty or Dean review

**Anonymized Dean review**:
The Dean review flow over submitted responses without respondent identity; it keeps an anonymized respondent label rather than the identified shape. Dean never receives the identified detail DTO.
_Avoid_: Identified Dean review

**Aggregate-only Faculty review**:
Faculty review submitted evidence only through the Faculty Analytics aggregate contract. Faculty receive no anonymized respondent label, response card, individual answer set, or raw qualitative comment; retired Faculty detail routes redirect to the matching aggregate evaluation scope.
_Avoid_: Faculty response detail, anonymized Faculty respondent, raw Faculty comment

**SUBMITTED gate**:
Identified response bodies are served only after status SUBMITTED, with an active evidence-owning role and membership of the response in that role's authorized Course/deployment scope. Program Head review also requires a resolved selected-Program context. IN_PROGRESS bodies are never fetched.
_Avoid_: Draft response review

## Outcome binding

**Submitted-answer binding**:
The outcome binding of one submitted quantitative answer: CILO (with the Course's current typed alignments — CILO-to-PO manifestation mappings in the owning Program for Program-specific Courses, CILO-to-ILO manifestation mappings for General Education Courses — and any frozen direct PO bindings on that Course question), PO (publication-time direct bindings), or GENERAL (no matching binding). The Course scope selects the alignment layer; a General Education answer never shows PO mappings. Bindings govern how ratings are attributed to outcomes.
_Avoid_: Raw question outcome, unbound rating, PO mapping on a General Education answer

**Coordinator review facets**:
The Coordinator responses list filters by search, academic period, evaluation status (any non-draft status), response progress (`zero`, `partial`, `complete`), Course, class-context Program (`CourseAssignment.program_id`), ILO (evaluations whose Course has an active CILO currently mapped to it), Faculty, year level, and section. Course scope, not the respondent's Program, keeps ownership.
_Avoid_: Respondent-Program ownership, Central evidence in Coordinator review

**Publication-time PO binding**:
A frozen PO binding sourced from `CentralDeploymentPoSnapshot` for Program-wide evidence or `CourseBoundPoQuestionBinding` for direct Course-bound evidence. Both preserve PO code, description, and question prompt, using the physical `plo_*` compatibility columns and `snapshot:<code>:<description>` identity when the live PO was deleted.
_Avoid_: Current PO binding, live PO label

## Summarization and context

**Period label**:
The canonical school year — semester — term label used across review contexts, e.g. '2025-2026 — 2nd Semester — 2nd Term' (two-part when the term is null). Semester and term use the friendly display labels, never raw enum values.
_Avoid_: Raw term instance id, raw enum label

**Qualitative summary**:
Aggregate evidence over submitted qualitative answers: non-empty answer count, distinct respondent count, per-prompt counts ordered descending, and count-ordered word tokens (normalized, stopword-filtered) feeding the word clouds. Raw response rows, sentences, and comments never appear in the summary. Identifier redaction, deterministic tone bands, and the bounded AI evidence packet are owned by the Analytics aggregate contract (ADR 0023), not this summary.
_Avoid_: Raw comment dump, per-respondent qualitative listing, provider-judged sentiment
