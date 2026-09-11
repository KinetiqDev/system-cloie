# Remove Dean Enrollment Oversight

## Status

Accepted

## Date

2026-09-11

## Context

The Dean oversight IA carried an Enrollments surface: `/dean/college-oversight/enrollments` (program-level placement totals, expandable to class rows) and its `/dean/college-oversight/enrollments/roster` drill-down, backed by `/api/dean/enrollments` + `/api/dean/enrollments/roster` and the `getDeanEnrollments`, `getDeanRoster`, and `getDeanRosterPage` reads in `src/features/dean/services/read-dean-oversight.ts`.

That surface projects the term-placement ledger already owned by the Enrollments domain for the Secretary and Student flows. The Dean's college-wide D&D scope needs readiness and mapping-gap oversight, not enrollment administration: the view duplicates `StudentEnrollment` aggregates, and its roster drill-down serves student names to a role that has no operational use for them.

The Dean dashboard information architecture ([issue #103](https://github.com/Tugeru/project-cloie/issues/103)) accepted the oversight direction; the enrolled-totals and roster drill-down are removed by this decision rather than deferred.

## Decision

Delete the Dean enrollment oversight surface end to end:

- Routes: `src/app/(app)/dean/college-oversight/enrollments/**` (page, loading, roster page, roster loading) and `src/app/api/dean/enrollments/**`.
- Read model: `getDeanEnrollments`, `getDeanRoster`, `getDeanRosterPage`, the `DeanEnrollmentsData` / `DeanRosterData` types, and the roster context/page-size helpers. The `getDeanEnrollments`-only `parseOptionalTrimmedQuery` / `parsePage` route helpers go with them.
- Cross-cutting wiring: the Dean navigation entry, the College Oversight landing card, the academic-period revalidation paths, and the production-surface inventory rows.
- Test and browser coverage for the removed surface.

Unchanged: the `StudentEnrollment` ledger, enrollment sources, upsert and soft-deactivation semantics, class lookup targeting, and every Secretary, Student, and onboarding flow that writes or reads enrollments. The Dean read model keeps the dashboard, eligible periods, and Learning Outcomes oversight.

No replacement route is introduced. Enrollment oversight is out of scope for System CLOIE, not deferred.

## Consequences

- ADR 0006 loses its Enrollments scope: the cached app-shell list, the last-viewed enrollment totals, and the offline export-button rule no longer describe a Dean surface. ADR 0006 is amended accordingly and remains Deferred.
- No Dean route serves student names. The privacy rule that kept the roster projection to display names is satisfied by removing the projection rather than maintaining it.
- Dean navigation exposes one College Oversight destination (Learning Outcomes). The `College Oversight` group and its landing page remain.
- The Enrollments domain contract is unchanged; `src/features/enrollments/CONTEXT.md` still governs the ledger and class lookup.

## Related

- [ADR 0005](0005-outcome-ownership-and-dean-oversight.md) — outcome ownership and the Dean's read-only oversight scope.
- [ADR 0006](0006-dean-pwa-offline-cache-contract.md) — Dean PWA offline cache contract (Enrollments clauses void).
- Wayfinder map: [Dean dashboard information architecture](https://github.com/Tugeru/project-cloie/issues/103)
