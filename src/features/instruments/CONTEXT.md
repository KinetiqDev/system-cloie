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
`PROGRAM_WIDE` or `COURSE_BOUND`, which gates what a template may carry: only PROGRAM_WIDE templates bind questions to the program's PLO catalog, and only COURSE_BOUND templates can be faculty-accessible and bind questions to course CILOs.
_Avoid_: Survey category, evaluation kind

**Institutional baseline**:
An institution-owned template with no program and no faculty owner, offered to Program Heads for copying. A Program Head copies it into a program-owned template via `source_template_id` with a generated unique code (name-derived, suffixed on collision), and the copy owns its PLO bindings.
_Avoid_: Admin template, starter template

**Faculty-accessible template**:
A COURSE_BOUND template marked usable by faculty, who copy or draft it into their own faculty-owned template bound to a course context (course, plus program and major where applicable) resolved from their active faculty affiliations. Copies start as course-bound drafts with a faculty-generated code.

## Questions and outcome bindings

**Question type**:
`likert` (numeric scale with optional LikertDescriptor labels) or `guided_open_ended` (free text with optional suggested responses). Only Likert questions can carry outcome bindings.
_Avoid_: Item type, response type

**CILO question binding**:
Associates a Likert question with a course CILO — at most one CILO per question and one question per CILO. Every active CILO of the bound course must be covered before publication; the binding snapshots the CILO description and question prompt.
_Avoid_: CILO mapping, outcome link

**PLO question binding**:
Associates a Likert question in a PROGRAM_WIDE template with an active PLO from the program's catalog. Drafts may be partial (missing bindings surface as warnings), but full Likert coverage is enforced at publication; the binding snapshots the PLO code, description, and question prompt.
_Avoid_: PLO mapping, outcome link
