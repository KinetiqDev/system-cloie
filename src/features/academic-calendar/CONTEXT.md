# Academic Calendar

Academic Calendar defines the school-year and period structure used to decide when academic work is active, upcoming, or historical.

## Language

**School year**:
The academic year container for semesters and terms.
_Avoid_: Calendar year

**Semester**:
A major academic period within a school year; regular semesters contain terms, while Summer does not.
_Avoid_: Term when referring to the whole semester

**Academic term**:
The first-term or second-term subdivision of a regular semester.
_Avoid_: Semester, summer term

**Summer semester**:
A semester where academic terms are not applicable.
_Avoid_: Summer term

**Assignment period**:
The academic period used to scope course assignments: a regular-semester academic term, or the Summer semester itself.
_Avoid_: Summer term, calendar period

**Active academic period**:
The current semester or term used by CLOIE for live academic work.
_Avoid_: Upcoming period, historical period

**Canonical term (structural term)**:
One of the 5 fixed AcademicTermInstance definitions every School Year SHALL contain (First/First, First/Second, Second/First, Second/Second, Summer/null), created transactionally with the School Year. Canonical terms must never be deleted.
_Avoid_: Optional term, ad-hoc term

**Legacy non-canonical term**:
An AcademicTermInstance outside the canonical 5-term set, created by pre-canonical manual CRUD. Remains queryable and date-mutable but cannot be recreated once deleted.
_Avoid_: Structural term
