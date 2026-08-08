## Context

No Curriculum concept exists in System CLOIE. Course placement (year level, semester, term) is advisory metadata on `Course` via `default_year_level`/`default_semester`/`default_term`. This cannot represent historical curriculum evolution — when a Course moves between year levels across curriculum revisions, the old placement is overwritten.

Stakeholders require: stable Course identity, versioned placement within curricula, published immutability, and historical preservation. The PRD and SRS explicitly scope CLOIE as NOT automating curriculum revision decisions — this is a catalog/documentation feature, not a rules engine.

## Goals / Non-Goals

**Goals:**
- `CurriculumVersion` with DRAFT/PUBLISHED/RETIRED lifecycle, owned by Program
- `CurriculumCourse` linking stable Course identity to versioned placement
- Published immutability; revisions via clone→edit→publish
- Historical queries always return data regardless of retirement/inactivity
- Baseline DRAFT generation from existing Course temporal defaults as migration hints

**Non-Goals:**
- Curriculum rules engine (prerequisites, sequencing, credit tracking)
- Per-student curriculum affiliation tracking
- Drag-and-drop curriculum builder
- Automated publishing from inferred data
- CILO/GO versioning by curriculum (deferred to separate change)

## Decisions

### Decision 1: `CurriculumVersion` owned by Program, optional Major

```prisma
model CurriculumVersion {
  id                         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  program_id                 String   @db.Uuid
  major_id                   String?  @db.Uuid
  code                       String
  name                       String?
  status                     CurriculumVersionStatus @default(DRAFT)
  effective_from_school_year_id String? @db.Uuid
  published_at               DateTime?
  published_by               String?  @db.Uuid
  created_at                 DateTime @default(now())
  updated_at                 DateTime @updatedAt
}
```

**Rationale:** `program_id` is required because a Curriculum belongs to one academic program. `major_id` is optional for major-specific curricula. `effective_from_school_year_id` is effectivity metadata — it does not imply every Student in that School Year belongs to this Curriculum. `code` is a human-readable identifier like "BSIT-2030".

**Alternative rejected:** School Year as parent. Curricula span multiple years — forcing annual cloning creates unnecessary duplication.

### Decision 2: `CurriculumCourse` with snapshots

```prisma
model CurriculumCourse {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  curriculum_version_id String    @db.Uuid
  course_id             String    @db.Uuid
  year_level            YearLevel
  semester              AcademicSemester
  term                  AcademicTerm?
  course_code_snapshot  String
  course_title_snapshot String
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
}
```

**Rationale:** `course_code_snapshot` and `course_title_snapshot` freeze the approved course metadata at publish time. This preserves what was approved even if the Course's `code` or `title` later changes. `year_level`/`semester`/`term` are the placement within this Curriculum. `term` is nullable for SUMMER.

**Alternative rejected:** Storing placement on Course directly (current approach). Loses historical versions.

### Decision 3: PUBLISHED immutability via application-layer guard

Published CurriculumVersion and its CurriculumCourse rows are immutable. Edit attempts are rejected at the service layer. Revisions use clone→edit→publish.

```typescript
cloneCurriculumVersion(id): creates new DRAFT with same courses
```

**Rationale:** Database-level immutability (triggers) would complicate legitimate clone-then-edit workflows. Application-layer guard with clear error messages is sufficient and simpler to evolve.

### Decision 4: RETIRED means historical, not hidden

Inactive Course (`is_active = false`) and RETIRED Curriculum remain fully queryable. Historical queries filter on `status` explicitly rather than generic `is_active` filters. Adding `curriculum_course_id` to `CourseAssignment` in the next change enables historical traceability.

**Rationale:** Historical data must remain visible for reporting. `is_active = false` means "do not use for new operations", not "hide from history".

### Decision 5: CILO/GO not versioned by Curriculum (deferred)

CILOs remain owned by Course. GOs remain owned by Program. Curriculum does not version learning outcomes. The mapping `CILO→GO` is stable regardless of which Curriculum Version a Course appears in.

**Rationale:** Stakeholder requirement not confirmed. If needed, model as `curriculum-cilo` and `curriculum-go` join tables in a future change. Existing ADR 0005 (outcome ownership) remains authoritative.

### Decision 6: Summer has `term = null` on CurriculumCourse

Same rule as AcademicTermInstance: `semester = SUMMER` implies `term = null`. Enforced in Zod schema validation.

### Decision 7: New bounded context under `src/features/curriculum/`

```
src/features/curriculum/
├── CONTEXT.md
├── types.ts
├── policies.ts
├── schemas/
│   └── curriculum.ts
├── services/
│   ├── manage-curriculum-versions.ts
│   ├── manage-curriculum-courses.ts
│   └── read-curriculum.ts
├── components/
│   ├── curriculum-version-list.tsx
│   ├── curriculum-course-table.tsx
│   └── curriculum-version-form.tsx
```

Follows the modular monolith pattern used by other features. Services are `"use server"`. Components are Client Components where interactivity requires it (forms, dialogs).

## Risks / Trade-offs

- **[Data]** Baseline DRAFT generation from `default_year_level`/`default_semester`/`default_term` may produce incorrect curricula if defaults are stale. Mitigation: generate as DRAFT only; never auto-publish; validate against official curriculum documents.
- **[Security]** New tables need RLS from creation. Mitigation: review Supabase advisors after migration; apply `SECRETARY`/`PROGRAM_HEAD` write policies with program-scope for PH.
- **[Performance]** `CurriculumCourse` queries joined with `Course` for course metadata. Mitigation: snapshots on `CurriculumCourse` eliminate the need to join `Course` for display — only for validation.
- **[Overlap]** Same Course might appear twice in one CurriculumVersion (e.g., in different semesters). Mitigation: no uniqueness constraint across `(curriculum_version_id, course_id)` — same course can appear multiple times within one curriculum.

## Migration Plan

1. Create `curriculum_versions` and `curriculum_courses` tables with constraints + RLS
2. Generate baseline DRAFT CurriculumVersions from existing Course defaults grouped by Program
3. Do NOT auto-publish — leave as DRAFT for Secretary/PH validation
4. Deploy Curriculum management UI
5. Validate baseline data against official curriculum documents before publishing
