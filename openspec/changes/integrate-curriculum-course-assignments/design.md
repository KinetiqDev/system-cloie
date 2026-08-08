## Context

Once `CurriculumVersion` and `CurriculumCourse` exist, `CourseAssignment` can optionally reference its originating Curriculum placement. This provides an audit trail without changing the operational nature of CourseAssignment — it remains the record of what actually happened in class.

## Goals / Non-Goals

**Goals:**
- Add `curriculum_course_id` (nullable) to `CourseAssignment`
- PH/Secretary may select Curriculum→CurriculumCourse when creating assignment
- Validate course consistency when link exists
- Backfill unambiguous historical assignments
- Keep roster, evaluation, enrollment logic unchanged
- Snapshot curriculum context in evaluation publication

**Non-Goals:**
- Do not make `curriculum_course_id` required
- Do not infer roster membership from curriculum
- Do not infer evaluation recipients from curriculum
- Do not remove `course_id`, `term_instance_id`, or `year_level` from CourseAssignment
- Do not introduce per-student curriculum affiliation

## Decisions

### Decision 1: `curriculum_course_id` is optional and additive

`CourseAssignment` retains all existing fields (`course_id`, `term_instance_id`, `program_id`, `year_level`, `section`, `faculty_id`). `curriculum_course_id` is an additional audit field. This avoids breaking every existing consumer.

**Rationale:** CourseAssignment is the operational record of "what class actually ran". CurriculumCourse is "what was planned/approved". They can diverge legitimately (e.g., override, irregular student). Making the link required would block legitimate operational flexibility.

### Decision 2: Validation is `course_id` consistency only

When `curriculum_course_id` is present, validate `CourseAssignment.course_id === CurriculumCourse.course_id`. Do not validate year_level/semester/term consistency — CourseAssignment may override placement legitimately per ADR 0003 clarification 6.

**Rationale:** Advisory defaults on Course are already overridable. CurriculumCourse is also advisory for the operational class. The course identity is the only non-overridable constraint.

### Decision 3: Backfill only unambiguous matches

Match existing CourseAssignments to CurriculumCourses on: `course_id` + `program_id` + `year_level` + `semester` + `term`. Only link when exactly one CurriculumCourse matches. Zero or multiple matches → leave null.

**Rationale:** Never invent historical truth. Ambiguous or missing mappings are acceptable — the legacy null `curriculum_course_id` is fully supported.

### Decision 4: Evaluation snapshots capture curriculum context

Add optional `curriculum_version_id` and `curriculum_course_id` to `CourseBoundEvaluation` publish flow. When available on the linked CourseAssignment, capture them in `course_info_snapshot`.

**Rationale:** Published evaluations become historical records. Curriculum context at publication time is valuable for future reports.

### Decision 5: Historical visibility is query-level, not model-level

Do not add `WHERE is_active = true` or `WHERE status != RETIRED` to global query filters. Historical pages (Dean oversight, reports) explicitly include inactive/retired data. Active-context queries (PH dashboard, assignment creation) filter explicitly for active curriculum.

**Rationale:** Retired means historical, not hidden. Adding global soft-delete filters would silently break historical views.

## Risks / Trade-offs

- **[Backfill accuracy]** Could mislink assignments if multiple CurriculumVersions match the same course/program/year/semester/term. Mitigation: strict single-match requirement; zero matches is safe.
- **[UI complexity]** Adding Curriculum selection step to the assignment wizard increases form complexity. Mitigation: make the step optional; skip when no published Curriculum exists for the program.
- **[Schema change]** Adding a nullable FK column is low-risk and backward-compatible.

## Migration Plan

1. Add `curriculum_course_id` column (nullable) to `course_assignments` with FK to `curriculum_courses`
2. Run backfill script for unambiguous historical mappings
3. Deploy updated assignment creation form with optional CurriculumCourse selection
4. Deploy evaluation snapshot changes
5. Verify historical pages still show legacy (null curriculum_course_id) data
