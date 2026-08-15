# Exploration Decisions

## Confirmed requirements

- Student ID is removed completely and is not replaced by another Student-entered identifier.
- Faculty uploads names; names are temporary lookup inputs and `User.id` is durable identity.
- Initial preview performs no `CourseAssignmentMembership` mutation.
- Every source row remains independently resolvable, including repeated names.
- Unresolved rows are explicitly skipped rather than silently dropped or blocking valid rows.
- Manual add uses scoped Student search and submits `User.id`.
- Course-bound evaluation recipient logic remains membership-based.

## Existing architectural constraints

- ADR 0014: `User.name` is canonical opaque account text.
- ADR 0007: `StudentEnrollment` is placement; `CourseAssignmentMembership` is the explicit Course roster.
- Program Head selected-Program scope is revalidated in sensitive write transactions.
- SQL enforces one active membership per Student/Course/Academic Period/Program and locks published rosters.
- Roster and candidate data remains request/session scoped and uncached.

## Resolved decisions

- Candidate scope aligns with current eligibility but does not exclude by year or section; academic context only ranks equal name evidence.
- Strict normalization is NFKC, case folding, trim, and whitespace collapse.
- Suggestions use unique strong ordered-token/initial/punctuation/suffix/diacritic evidence with reason labels and no confidence score.
- Exact unique matches are ready automatically. Suggested matches use one required count-aware acknowledgement.
- Candidate search requires two normalized characters, returns at most 10, has no pagination/browse, and is debounced with stale request cancellation.
- Candidate email may display in authorized reconciliation; failed export omits candidate email.
- Duplicate selected `User.id` values reject the whole confirmation before writes.
- Confirmation uses batch preflight plus short row transactions and stops remaining rows only for unexpected infrastructure failure.
- Preview and results use component state only; dirty close confirms discard; no refresh recovery or persisted import history.
- CSV accepts one `name`/`Student Name` column with standard quoting and at most 100 source rows.
- Student profile retains valid Program and conditional active Major; active period placement remains separate.
- Student ID removal has two release gates: application contract removal, then generated database column drop/types regeneration.

## Assumptions adopted conservatively

- Invalid name values remain row-level `INVALID_NAME`; structural file failures reject before preview.
- Preview source rows preserve original decoded text while comparison keys remain internal.
- A stale matching-contract version fails confirmation before writes.
- Request-level roster read-only state prevents all writes; expected row-specific changes permit partial success.
- Final results are not returned to editable reconciliation; a later attempt starts from a new upload/search.

## Deferred decisions

- No fuzzy scoring algorithm or third-party matching package is approved. Implementation may use deterministic ranking only within the specified evidence tiers.
- No import-history persistence, cross-device continuation, or refresh recovery is approved.
- Implementation PR slicing follows after artifact review; it is not an architectural requirement.
