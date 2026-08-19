# CILO to PLO manifestation implementation specification

## 1. Scope

This change implements the complete workflow for Program Learning Outcomes, Course Intended Learning Outcomes, and manifestation-based CILO-to-PLO mapping.

The implementation covers:

- database and Prisma schema changes
- migration strategy
- domain terminology
- service-layer contracts
- server-side authorization
- Program Head PLO management
- Faculty CILO management
- Faculty CILO-to-PLO manifestation mapping
- Program Head read-only mapping review
- Secretary outcome-interface removal
- responsive UI and UX
- review, confirmation, draft saves, freshness, and concurrent-edit handling
- validation and tests

Analytics behavior is explicitly out of scope.

No attainment calculation, PLO aggregation, AI analytics, historical manifestation analysis, regression analysis, or other analytics logic shall be changed as part of this work.

## 2. Canonical terminology

The canonical program-level outcome term is now:

**Program Learning Outcome (PLO)**

The term replaces:

**Graduate Outcome (GO)**

New product copy, documentation, glossary entries, UI labels, service contracts, type names, validation messages, tests, and newly written code shall use `PLO` or `Program Learning Outcome`.

The outcomes glossary shall define:

**Program Learning Outcome (PLO)**  
A program-level learning outcome belonging to one Academic Program. Program Heads administer PLOs within their assigned Program scope.

**Course Intended Learning Outcome (CILO)**  
A course-level learning outcome belonging to a Course. Faculty members may author CILOs only for Courses they are currently authorized to teach.

**CILO-to-PLO mapping**  
The relationship between one CILO and one PLO in the Course's owning Academic Program. Every such relationship carries exactly one manifestation.

**Manifestation**  
The way a CILO contributes to a PLO:

- `LEARNING`, displayed as `L`
- `PRACTICE`, displayed as `P`
- `OPPORTUNITY`, displayed as `O`

Do not assign numeric values or weights to these categories.

### Internal rename strategy

The implementation should stop introducing new `GO` terminology.

Where practical, rename domain types, functions, DTOs, validation schemas, component props, tests, and service APIs to PLO terminology.

A physical database table rename is not required merely to achieve the terminology change. Legacy physical names such as `gos` or `go_id` may remain temporarily behind Prisma `@@map` or `@map` mappings if renaming them would create unnecessary migration risk.

The canonical application-level language, however, shall be PLO.

## 3. Ownership and role workflow

### Program Head

The Program Head owns Program Learning Outcomes.

A Program Head may:

- view PLOs belonging to an assigned Program
- create a PLO
- edit a PLO
- archive or restore a PLO according to existing lifecycle rules
- reorder PLOs if the existing outcome workflow supports ordering
- view CILO-to-PLO manifestation mappings for the assigned Program

A Program Head shall not edit Faculty CILO-to-PLO mappings in this change.

### Faculty

Faculty owns the operational CILO and mapping workflow for assigned Courses.

A Faculty member may:

- view Courses they are authorized to teach
- create CILOs for those Courses
- edit or archive CILOs according to existing rules
- open the Course alignment workspace
- assign a manifestation for every CILO-to-PLO pair
- change an existing manifestation
- save a partial alignment as a draft and resume it later
- review the complete alignment before saving
- commit the reviewed alignment

Authorization shall continue to be based on actual Course assignment, not merely possession of the Faculty role.

### Secretary

The Secretary shall have no CILO-to-PLO mapping interface.

The Secretary shall not:

- create CILO-to-PLO mappings
- change manifestations
- remove CILO-to-PLO mappings
- administer Institutional Learning Outcomes through the current Secretary interface

The existing Secretary Learning Outcomes surface and Secretary Course Mapping Administration surface shall be removed from navigation and normal routing.

Server-side authorization shall also remove these permissions. Hiding controls in the UI is insufficient.

Other Secretary responsibilities, such as user, curriculum, course, program, school-year, or course-assignment administration, remain unchanged.

## 4. Core mapping invariant

This is the major change from the previous mapping model.

For a Program-specific Course:

> Every active CILO must have exactly one manifestation for every active PLO belonging to the Course's owning Program.

Example:

```text
Program PLOs:
PLO1
PLO2
PLO3
PLO4

Course CILO1:
PLO1 = Learning
PLO2 = Opportunity
PLO3 = Practice
PLO4 = Opportunity
```

An unanswered CILO/PLO pair is represented by the absence of a mapping row. There is no special "not mapped" value.

Faculty may save a draft with unanswered cells and resume later. A draft save persists the cells currently classified and leaves unclassified pairs absent.

The system shall reject final review and commit until every required CILO-to-PLO pair has a manifestation.

Therefore:

```text
active CILOs × active PLOs = required manifestation assignments
```

If a Course has five active CILOs and its Program has eight active PLOs, a complete alignment contains forty CILO-to-PLO manifestation assignments.

## 5. Mapping identity

The identity of a mapping remains the CILO and PLO pair.

Conceptually:

```text
CILO + PLO = one mapping
```

Manifestation is an attribute of that mapping.

Valid:

```text
CILO1 + PLO1 + LEARNING
CILO1 + PLO2 + PRACTICE
CILO1 + PLO3 + OPPORTUNITY
```

Invalid:

```text
CILO1 + PLO1 + LEARNING
CILO1 + PLO1 + PRACTICE
```

Changing:

```text
CILO1 + PLO1 + LEARNING
```

to:

```text
CILO1 + PLO1 + PRACTICE
```

shall update the existing mapping instead of creating a second mapping.

## 6. Schema target

The program-specific mapping relation shall gain a manifestation enum.

Conceptually:

```prisma
enum CILOMappingManifestation {
  LEARNING
  PRACTICE
  OPPORTUNITY
}

model CILOMapping {
  id              String
  cilo_id         String
  plo_id          String
  manifestation   CILOMappingManifestation

  created_by      String?
  updated_by      String?
  created_at      DateTime
  updated_at      DateTime?

  @@unique([cilo_id, plo_id])
}
```

Exact Prisma naming should follow the terminology migration decision.

If the underlying database continues using the legacy `go_id` column temporarily, Prisma may expose it as `plo_id` with a field mapping rather than forcing a physical column rename in the same change.

The existing code already protects the mapping pair with a unique CILO/GO constraint and database-level Program-scope guards. Those protections must survive the PLO terminology migration and manifestation change.

### Manifestation storage

Use readable enum values:

```text
LEARNING
PRACTICE
OPPORTUNITY
```

Do not store only:

```text
L
P
O
```

The short letters are presentation labels.

### Required manifestation

The final schema invariant should make `manifestation` non-null.

No newly created mapping may exist without a manifestation.

## 7. Existing-data migration

Existing mapping rows currently have no manifestation value.

Do not assign an arbitrary default such as `LEARNING`.

There are two valid implementation paths.

If existing mapping data is disposable and the environment can safely be reset or reseeded, migrate directly to a required manifestation field and recreate seeded mappings with explicit manifestations.

If existing mapping data must be preserved, use a transitional nullable migration:

```text
manifestation = null
```

for legacy rows only.

The application must treat those rows as requiring Faculty completion. Once all preserved mappings have valid values, a later migration may enforce database-level `NOT NULL`.

The migration shall not invent academic meaning.

## 8. Exhaustive mapping cannot rely only on a database constraint

The unique constraint can guarantee:

```text
at most one row for CILO1 + PLO1
```

It cannot by itself guarantee that every active CILO has a row for every active PLO.

Completeness must therefore be enforced primarily by the domain/service layer.

Before committing a Course alignment, the service shall calculate:

```text
required pairs =
all active Course CILOs
×
all active PLOs in owning Program
```

and compare them with the submitted manifestation assignments.

Commit shall fail if:

- a required pair is missing
- a pair appears more than once
- a manifestation is missing
- a manifestation is invalid
- an extra mapping targets another Program
- the CILO does not belong to the Course
- the PLO is inactive or otherwise unavailable for a new mapping

Draft saves are exempt from the completeness requirement and may persist a partial state. The failure list above applies to review and commit only.

## 9. Course-alignment read model

The existing alignment model is based on arrays of target IDs. The current implementation effectively represents mapping as selected versus unselected, which is insufficient for manifestation data.

Replace that concept with explicit mapping assignments.

Example:

```ts
type CILOPLOManifestation =
  | "LEARNING"
  | "PRACTICE"
  | "OPPORTUNITY";

type CourseAlignmentMapping = {
  ploId: string;
  manifestation: CILOPLOManifestation;
};

type CourseAlignmentCilo = {
  id: string;
  description: string;
  mappings: CourseAlignmentMapping[];
};
```

The read service must return:

- Course identity
- Program identity
- active CILOs
- active PLO catalog
- current manifestation for every existing pair
- enough identity information to build the freshness token
- legacy/incomplete state when migration data lacks a manifestation

## 10. Course-alignment write model

The Course alignment workspace remains the main write boundary for manifestation assignments.

A review commit submits the complete mapping state for the Course. A draft save may submit a partial state; see Draft save below.

Example:

```ts
{
  courseId,
  desired: [
    {
      ciloId,
      mappings: [
        {
          ploId,
          manifestation: "LEARNING"
        },
        {
          ploId,
          manifestation: "PRACTICE"
        }
      ]
    }
  ],
  freshnessToken
}
```

Because every CILO must classify every PLO, a committed state shall contain one entry for every required pair.

The server must never trust the client-provided list of PLOs as the authoritative required set. It shall reread active PLOs and CILOs when preparing and committing the write.

### Draft save

The workspace supports a lighter write for saving progress.

A draft save submits the cells currently classified, which may be a partial state. The server diffs the submitted cells against existing rows over the active CILO and active PLO sets and applies:

- new rows for newly classified pairs
- updates for pairs whose manifestation changed
- deletions for pairs the Faculty member cleared

A draft save performs no completeness check and bypasses the review and confirmation ceremony. It runs in the same transaction with the same freshness protection as a commit, so every draft save advances the freshness token.

Deletions apply only within the active CILO and active PLO sets. Rows referencing archived CILOs or archived PLOs are never touched by a draft save or a commit.

The commit path reuses the same diff engine with the completeness gate and review confirmation added.

## 11. Manifestation updates

The current generic mapping write model supports create and remove but has no manifestation-update operation.

The new implementation shall treat a manifestation-only edit as an update.

Example:

```text
Before
CILO1 + PLO2 = OPPORTUNITY

After
CILO1 + PLO2 = PRACTICE
```

This should update the existing row and preserve its identity.

Do not implement manifestation changes by deleting and recreating the relationship unless investigation finds a compelling database reason.

`updated_by` and `updated_at` should reflect the actor and time of a manifestation change.

## 12. Review and confirmation

Preserve the existing staged review and atomic commit workflow.

The existing workflow already prepares a complete before/after alignment and uses freshness protection. Manifestation must become part of those snapshots.

The review should show readable manifestation changes.

Example:

```text
CILO 1
Configure and troubleshoot networks

PLO 1
Technical competence
Learning (L) -> Practice (P)

PLO 2
Professional communication
Opportunity (O) -> Learning (L)
```

For first-time assignment:

```text
PLO 3
Ethical responsibility
Set to Opportunity (O)
```

The confirmation UI should emphasize the complete Course alignment rather than treating each cell as an independent immediate write.

## 13. Freshness and concurrent editing

Manifestation values must participate in:

- before state
- after state
- review signature
- freshness token
- stale-write comparison

This prevents a concurrent manifestation-only edit from being invisible.

Every draft save is a write and advances the freshness token. A stale draft save fails the same stale-write comparison as a commit.

Example:

```text
Faculty review:
CILO1 / PLO1 = Learning

Current database changes to:
CILO1 / PLO1 = Practice
```

A later commit using the stale review must fail and require the user to reload and review again.

## 14. Faculty workflow

### Step 1. View assigned Courses

Faculty opens the CILO area and sees Courses they are currently authorized to teach.

### Step 2. Manage CILOs

Within an assigned Course, Faculty can create and manage Course Intended Learning Outcomes.

Example:

```text
CILO 1
Configure and troubleshoot network infrastructure.

CILO 2
Apply network security principles.
```

### Step 3. Open PLO alignment

Faculty chooses the Course alignment action.

The page loads:

- active Course CILOs
- Program Learning Outcomes belonging to the Course's Program
- existing manifestations

### Step 4. Assign every manifestation

Each CILO/PLO pair requires one of:

```text
L  Learning
P  Practice
O  Opportunity
```

There is no final "Not mapped" option.

### Step 5. Save progress at any time

Faculty may save the alignment before every cell is classified. The save persists the cells currently classified; unclassified pairs stay unanswered.

The alignment can be reopened later from the Course list and continued.

### Step 6. Validate completeness

The interface immediately shows incomplete cells.

Example:

```text
3 manifestation assignments remaining
```

Review cannot proceed until all required pairs have a value.

### Step 7. Review

Faculty reviews the complete before/after alignment.

### Step 8. Confirm and save

Server revalidates authorization, Course scope, PLO scope, completeness, freshness, and manifestations.

All changes commit atomically.

## 15. Faculty desktop UX

Desktop should use a matrix because the domain itself is a matrix.

Example:

```text
                    PLO 1       PLO 2       PLO 3       PLO 4
CILO 1                L           P           O           L
CILO 2                P           O           L           O
CILO 3                O           L           P           P
```

Each cell is an interactive manifestation control.

A practical control may expose:

```text
Learning (L)
Practice (P)
Opportunity (O)
```

Do not rely on color alone.

Do not rely on the letters alone.

The full manifestation term must be available through the control label, menu, tooltip, or accessible name.

The page should include a persistent legend:

```text
L  Learning
P  Practice
O  Opportunity
```

PLO column headers should expose enough information to identify the outcome without forcing users to memorize codes.

For long PLO descriptions, the interface may use compact codes in the matrix and expose the full description through a header detail, tooltip, popover, or expandable region.

## 16. Faculty mobile UX

Do not force the desktop matrix into a narrow viewport.

On small screens, switch to CILO-oriented cards.

Example:

```text
CILO 1
Configure and troubleshoot network infrastructure

PLO 1
Technical competence
[ Learning (L) ]

PLO 2
Communication
[ Practice (P) ]

PLO 3
Ethical responsibility
[ Opportunity (O) ]
```

Every active PLO remains present.

The mobile interface must make it easy to determine:

- which CILO is being edited
- which PLO is being classified
- current manifestation
- remaining unanswered classifications

## 17. Faculty incomplete-state UX

Because mappings are exhaustive, incomplete state becomes important.

The editor should expose progress such as:

```text
32 of 40 relationships classified
8 remaining
```

Unanswered cells should be visually distinct but not represented as a fourth academic manifestation.

Save stays available at any time and persists the cells currently classified. Only Review is gated: the Review action shall remain unavailable, or fail with an explicit validation message, until all required cells are classified.

Example message:

```text
Choose Learning, Practice, or Opportunity for all PLOs before reviewing this alignment.
```

## 18. Program Head PLO management UX

Program Head's Outcomes interface becomes the PLO management interface.

Replace visible wording such as:

```text
Graduate Outcomes
GO
```

with:

```text
Program Learning Outcomes
PLO
```

The Program Head can create, edit, archive, restore, and inspect PLOs within the selected Program according to existing lifecycle behavior.

Example page language:

```text
Program Learning Outcomes
Define the outcomes students are expected to achieve across the BSIT program.
```

## 19. Program Head mapping review UX

Program Head receives read-only visibility into Faculty mappings.

The existing Program Head mapping review already presents CILO mappings across Program Courses, but currently describes them using Graduate Outcome terminology and says the Secretary can correct mappings. That copy must change.

Program Head review should show:

- Course
- CILOs
- every PLO
- manifestation assigned to each pair
- full manifestation label where practical
- incomplete legacy mappings if any remain during migration

The Program Head shall not receive editing controls.

A matrix is appropriate on desktop:

```text
CS101

                    PLO 1       PLO 2       PLO 3
CILO 1                L           P           O
CILO 2                O           L           P
```

On mobile, use the same stacked CILO presentation as the Faculty surface but without interactive controls.

## 20. Secretary UI removal

The current Secretary `/secretary/learning-outcomes` page loads both the Institutional Outcome catalog and a Course mapping administration list.

This workflow shall be removed.

Remove or retire:

```text
/secretary/learning-outcomes
/secretary/learning-outcomes/alignment/[courseId]
```

Also remove:

- Secretary navigation entries pointing to Learning Outcomes
- Secretary Institutional Outcome encoding controls
- Secretary Course mapping administration list
- Secretary CILO-to-PLO editing controls
- links and calls to action that lead into these surfaces
- loading states that exist solely for these routes
- route tests that assert Secretary mapping administration

Where deleting a route would break a bookmarked URL, redirect it to an appropriate Secretary landing page rather than leaving a stale editing interface.

## 21. Secretary service authorization removal

The current service layer explicitly supports Secretary program-specific mapping creation and removal.

That authorization must be removed.

A crafted request by a Secretary attempting to:

```text
create CILO/PLO mapping
change manifestation
remove CILO/PLO mapping
```

must return an authorization failure.

The same principle applies to Secretary ILO encoding through the outcome-write layer.

Do not rely on route removal alone.

## 22. Institutional Learning Outcome scope

This change removes the Secretary-facing Institutional Learning Outcome interface and encoding workflow.

It does not automatically require dropping the `InstitutionalOutcome` table or `CILOInstitutionalOutcomeMapping` table.

Those structures currently have their own database constraints and General Education behavior.

Deleting that domain data is a separate destructive decision and is not required to implement the requested CILO-to-PLO workflow.

For this change:

- remove Secretary ILO UI
- remove Secretary ILO write access
- do not add manifestation to ILO mappings
- avoid destructive ILO schema deletion unless separately specified

## 23. Program scope validation

A Faculty member editing a Course may see only PLOs belonging to that Course's owning Program.

The service shall reject:

```text
BSIT CILO -> BSCS PLO
```

even if a crafted request supplies a valid PLO ID.

Existing database protections already reject cross-Program program-level mappings. Preserve equivalent protection through the terminology migration.

## 24. PLO lifecycle behavior

Only active PLOs participate in new required manifestation assignment.

When a PLO is archived:

- it is no longer selectable for new alignment work
- it is no longer part of the active Cartesian completeness requirement
- existing historical mapping rows should not be silently rewritten solely because the PLO was archived

When a new PLO is created:

- every Course with active CILOs in that Program now has incomplete alignment until its Faculty assigns a manifestation for that new PLO

The UI should communicate this rather than silently fabricating a manifestation.

## 25. CILO lifecycle behavior

When a Faculty member creates a new active CILO:

- it begins without completed PLO classification
- the Course becomes incomplete for alignment purposes
- Faculty must assign L, P, or O for every active Program PLO

When a CILO is archived:

- it no longer participates in the active completeness requirement
- existing historical mapping data should not be rewritten merely because the CILO was archived

## 26. Server action validation

The server action schema shall accept manifestation values only from:

```text
LEARNING
PRACTICE
OPPORTUNITY
```

Reject:

```text
"L"
"P"
"O"
"learning"
"NONE"
null
arbitrary strings
```

unless a deliberate boundary transformation converts UI shorthand to the canonical enum before validation.

Prefer submitting canonical enum values from the UI and using the letters only for display.

## 27. Accessibility requirements

Manifestation controls shall be keyboard operable.

An accessible name should provide context similar to:

```text
CILO 2, PLO 4, manifestation: Practice
```

The interface shall not communicate manifestation solely through:

- color
- position
- one-letter abbreviations

Focus indicators must remain visible.

Mobile tap targets should use the project's normal interactive sizing.

## 28. Empty states

### Program has no PLOs

Faculty cannot complete CILO mapping.

Show an explicit state such as:

```text
No Program Learning Outcomes have been defined for this program.

A Program Head must create PLOs before Course alignment can be completed.
```

Do not present an empty matrix as if alignment were complete.

### Course has no CILOs

Show:

```text
No Course Intended Learning Outcomes have been defined for this Course.
```

Faculty should be directed back to CILO management.

### Legacy mappings missing manifestations

Show them as incomplete and require classification.

Do not silently display them as Learning, Practice, or Opportunity.

Unanswered cells left by a saved draft display the same way and count toward the remaining total.

## 29. Tests

At minimum, test:

- Program Head can create a PLO in an assigned Program.
- Program Head cannot create a PLO outside assigned Program scope.
- Faculty can create a CILO only for an authorized Course.
- Faculty mapping editor loads all active PLOs from the Course's Program.
- Every active CILO requires one manifestation for every active PLO.
- Missing manifestation prevents review or commit.
- Faculty can save a draft with unanswered cells and resume it later.
- Draft save persists only classified cells; unanswered pairs remain absent.
- Clearing a classified cell in a draft save removes that mapping row.
- A stale draft save is rejected the same way as a stale commit.
- Partial draft save leaves the Course incomplete for readiness and publication.
- Draft saves never touch mapping rows on archived CILOs or PLOs.
- Invalid manifestation is rejected at the server boundary.
- Cross-Program PLO is rejected.
- Same CILO/PLO pair cannot exist twice.
- Learning-to-Practice changes update the existing mapping.
- Manifestation update records `updated_by`.
- Stale review detects manifestation-only concurrent changes.
- Adding a new PLO makes existing Course alignment incomplete until classified.
- Adding a new CILO requires classification against every active PLO.
- Archived PLO does not require a new manifestation.
- Program Head mapping page displays manifestation values read-only.
- Program Head mapping page contains no mapping mutation controls.
- Secretary has no Learning Outcomes navigation item.
- Secretary legacy Learning Outcomes routes are removed or redirected.
- Secretary cannot create, change, or remove CILO/PLO mappings through crafted server requests.
- Secretary cannot encode Institutional Learning Outcomes through the removed workflow.
- desktop manifestation matrix is keyboard operable.
- mobile layout exposes full PLO and manifestation labels.
- review screen accurately reports manifestation-only changes.
- visible terminology uses Program Learning Outcome/PLO rather than Graduate Outcome/GO.

## 30. Explicitly out of scope

Do not implement in this change:

- PLO attainment calculations
- manifestation-aware analytics
- exclusion or inclusion rules for L/P/O in analytics
- Program Head analytical aggregation changes
- AI analytics changes
- regression analysis
- manifestation weighting
- numeric L/P/O scores
- automatic manifestation suggestions
- AI-selected manifestations
- curriculum recommendations
- approval workflow
- historical manifestation versioning
- publication-time manifestation snapshots
- ILO manifestation support
- destructive removal of the ILO database domain solely because its Secretary UI is removed

Existing analytics may require mechanical type or terminology fixes to keep the application compiling after the GO-to-PLO rename, but its behavior shall remain unchanged.

## 31. Required end-state workflow

The intended end state is:

```text
PROGRAM HEAD
creates and manages Program Learning Outcomes
             |
             v
FACULTY
is assigned a Course
             |
             v
FACULTY
creates Course Intended Learning Outcomes
             |
             v
FACULTY
classifies every CILO against every PLO
as Learning, Practice, or Opportunity
             |
             v
FACULTY
reviews complete Course alignment
             |
             v
SYSTEM
validates authorization, completeness,
Program scope, manifestations, and freshness
             |
             v
SYSTEM
atomically saves mapping state
             |
             v
PROGRAM HEAD
views CILO-to-PLO manifestation mapping
read-only
```

Faculty may save partial progress at any point before the final review and resume later.

Secretary does not participate in this outcome-management workflow.