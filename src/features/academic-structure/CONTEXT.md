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
