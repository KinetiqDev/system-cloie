# Instruments

Instruments defines how System CLOIE models evaluation instruments: template structure, versioning and freezing, question types, outcome bindings, and baseline/copy provisioning.

## Templates and provisioning

**Instrument template**:
A reusable questionnaire of sections and questions stored as a JSON structure on the template row. Templates are never deployed directly — deployments consume frozen versions.
_Avoid_: Evaluation form, survey

**Instrument version**:
An immutable, numbered edition of a template (`version_number`) that freezes the structure into a `structure_snapshot` at edit time. Deployments (Course-bound evaluations, Central Deployments) reference a version, never the live template.
_Avoid_: Template revision, live snapshot

**Template type**:
`PROGRAM_WIDE` or `COURSE_BOUND`, which gates what a template may carry: only PROGRAM_WIDE templates bind questions to the program's GO catalog, and only COURSE_BOUND templates can be faculty-accessible and bind questions to course CILOs.
_Avoid_: Survey category, evaluation kind

**Institutional baseline**:
An institution-owned template with no program and no faculty owner, offered to Program Heads for copying. A Program Head copies it into a program-owned template via `source_template_id` with a generated unique code (name-derived, suffixed on collision), and the copy owns its GO bindings. Choosing a baseline in the creation flow only pre-fills the template builder: the program-owned copy is created on the first save, so an abandoned selection leaves no record and the baseline is never modified.
_Avoid_: Admin template, starter template

**Blank draft**:
A template authored without a starting point. A Program Head's blank draft becomes a program-owned `PROGRAM_WIDE` template; a faculty member's blank draft is a faculty-owned `COURSE_BOUND` template with no bound course, so CILO bindings and publication wait until the author selects a course.
_Avoid_: Empty template, untitled instrument

**Faculty-accessible template**:
A COURSE_BOUND template marked usable by faculty, who copy or draft it into their own faculty-owned template bound to a course context (course, plus program and major where applicable) resolved from their active faculty affiliations. Copies start as course-bound drafts with a faculty-generated code. A faculty member never edits a shared template in place: saving one creates their copy on the first save, and a blank faculty draft is created the same way.

## Questions and outcome bindings

**Question type**:
`likert` (numeric scale with optional LikertDescriptor labels) or `guided_open_ended` (free text with optional suggested responses). Only Likert questions can carry outcome bindings.
_Avoid_: Item type, response type

**CILO question binding**:
Associates a Likert question with a course CILO — at most one CILO per question, and a CILO may be evidenced by one or more questions. Every active CILO of the bound course must be covered by at least one question before publication; the binding snapshots the CILO description and question prompt, so one CILO with several questions carries several snapshot rows that all pool into that CILO's single mean.
_Avoid_: CILO mapping, outcome link

**GO question binding**:
Associates a Likert question with an active GO. A PROGRAM_WIDE template uses its owning Program catalog; a COURSE_BOUND faculty template uses the bound Program-specific Course's owning Program catalog and rejects General Education Courses. One question may carry several GOs. A Course-bound question with a CILO binding cannot carry GO bindings: CILO-bound ratings already reach GOs through the CILO-to-GO mappings. Drafts may be partial, and publication does not require full Likert coverage: an unbound Likert question publishes as a general evaluation item and produces no direct GO evidence. Publication rejects bindings that no longer match the template structure and bindings whose GO is archived or outside the authoritative Program, then snapshots the GO code, description, and question prompt.
_Avoid_: GO mapping, client-selected Program catalog, outcome link
