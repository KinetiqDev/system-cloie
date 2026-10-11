# Professional Course Canonical Terminology

**Status:** Accepted

**BREAKING.** The `CourseScope` enum value `PROGRAM_SPECIFIC` is renamed to `PROFESSIONAL`. The stored identifier, the `courseScope` and `type` URL filter values, and the CSV import alias all change in one release.

## Context

System CLOIE classifies every Course as either General Education or specific to one academic program. The second class has been called "program-specific" in code, UI, and documentation since the catalog was introduced. "Professional Course" is the authoritative term for that classification: a Course owned by one Academic Program, such as BSIT IT101, IT201 and IT102, or BSBA BASOC, ECON and FM200. The old name also reads as a data-scope qualifier and collides with two unrelated axes the product already uses: program-scoped instruments (`EvaluationTemplateType.PROGRAM_WIDE`), and the program-wide/major-specific axis inside a single Program Head's course import.

## Decision

- The canonical term for a Course owned by one academic program is **Professional Course**, with the enum value `PROFESSIONAL`.
- The rename is a clean cutover. No alias, deprecated constant, or reader-side fallback accepts the old value anywhere in the application, the database, or the URL grammar.
- Meaning is unchanged. A Professional Course is still owned by exactly one academic program, its course assignments are still created for that owning program, and every authorization, ownership, roster-eligibility, readiness, typed-alignment, and evidence rule that branches on Course scope behaves identically.

## Consequences

- **Deployment ordering.** Prisma generates the application's `CourseScope` constants from the schema. Both new migrations must ship with the application release in one maintenance window: stop the running application, apply the migrations, regenerate the Prisma client and Supabase types, rebuild and deploy the application, then restart it. Mixed old and new application and schema versions can reject enum writes or misclassify reads, so keep the old application stopped until both the migrations and the new release are installed.
- **Captured snapshots.** Readiness snapshot contexts and published-evaluation course-info snapshots store the scope as JSON text inside data that is otherwise immutable. A bounded, atomic migration rewrites the course-classification identifier in place, preserving every snapshot version, capture timestamp, CILO/PO/ILO target detail, and evidence record exactly as written, and restoring any temporarily suspended trigger inside the same transaction. Snapshot contents are not otherwise re-derived, so the rewrite is a representation change only.
- **Database validation.** A separate migration corrects the active CILO-to-PO scope backstop's error message to Professional Courses. Its ownership checks, trigger binding, and function permissions remain unchanged; the original applied migration is not rewritten.
- **URL filters.** A bookmarked or shared `courseScope=PROGRAM_SPECIFIC` link no longer parses and is treated as no scope filter. The list falls back to the role's authorized scope rather than widening it, so the change cannot disclose rows the actor could not already read.

## Not renamed

`EvaluationTemplateType.PROGRAM_WIDE`, `MAJOR_SPECIFIC`, the course-import `course_type` axis (`program-wide`, `major-specific`), and the `PROGRAM_MISMATCH` roster eligibility reason describe different axes and keep their current names. Historical applied migrations, `docs/history/**`, verbatim institutional and capstone text, and captured UX audit evidence retain their original wording by policy.

Related: [ADR 0036](0036-program-outcome-canonical-terminology.md), [ADR 0040](0040-program-outcome-classification-and-shared-ge-common-alignment.md).
