# Academic Structure

Academic Structure defines academic programs and majors offered by the college.

## Language

**Authorized Program set**:
The Programs a role-scoped actor may act within — Program Heads via active `program_head_assignments`, Faculty via active `faculty_program_affiliations`; DEANs are unscoped (null = all programs). It bounds managing, browsing, and evaluating.
_Avoid_: Scoped programs, program scope

**Major lifecycle**:
Majors are program-scoped with names unique per program; Secretary/Dean stewards create/edit/activate/deactivate/delete them. Deletion is blocked while any course or student profile references the Major — deactivate instead.
_Avoid_: Major deletion, remove major

**Program deletion**:
Permanent removal of an inactive academic program with no dependent records. Every record linked to a program is a dependent record and blocks deletion. It is distinct from deactivation, which preserves program and related history.
_Avoid_: Archive, retire, deactivate

**Program deactivation**:
Reversible change that makes a program unavailable where an active program is required while preserving its records and history.
_Avoid_: Delete, archive, retire

**Program lifecycle steward**:
A Secretary or Dean authorized to create, edit, activate, deactivate, and permanently delete programs. Program Heads do not hold program lifecycle authority.
_Avoid_: Program owner, Program Head administrator

## Program Head catalog surface

**Unified Program Head course catalog**:
The Program Head catalog table resolves all its courses through one program-scoped read (`resolve-program-head-courses.ts` — a single `findMany`, no separate General Education query, no read-only flag) and presents status filtering, Year Level/Semester/Term columns, and summary cards. Course-type (Program-specific/General Education) and Gen-Ed badges are deliberately absent from this surface.
_Avoid_: Dual catalog queries, course-type badge on the Program Head surface

## Demo catalog seed provenance

**ACD demo catalog seed**:
The demo-seeded catalog derives from `docs/acd_programs_demo_seed_recommended_expanded.csv` (102 ACD courses, title-normalized) and is upserted by `ACD_DEMO_CATALOG_SEED_SOURCE` provenance; courses removed from the seed set are converged to inactive rather than deleted.
_Avoid_: Hand-edited demo catalog, hard-deleting seed-managed courses
