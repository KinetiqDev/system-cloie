## Why

Course roster detail currently separates add-one and CSV import into two large page blocks. The latest management-dialog prototype proved a single focused flow, but its fold-in commit is no longer present on `main`. Rebuild the approved conservative workflow with assignment context, responsive overlay behavior, and stable roster-detail hierarchy.

**Classification:** feature UI redesign within Course Catalog and Assignments, with Design System integration.

## What Changes

- Replace separate add-one and CSV import surfaces with one `Manage roster` workspace for mutable, authorized Course-assignment rosters.
- Display compact Course-assignment context and roster counts before management begins, so managers can verify class scope and current evaluation eligibility.
- Keep CSV import and add-one-student methods in a two-step management flow: add members, then import results.
- Use a Dialog on desktop and Drawer on mobile, preserving accessible focus, keyboard behavior, touch targets, and result review.
- Strengthen visible success, validation, import-result, empty, read-only, and mutation-pending states without changing roster business operations.
- Cover responsive management behavior and authorization/lifecycle visibility with component tests; retain future browser acceptance work in issue #143.

## Capabilities

### New Capabilities
- `course-roster-management-workspace`: responsive, contextual, multi-method Course-assignment roster management for authorized mutable rosters.
- `course-roster-detail-hierarchy`: course-assignment context, roster-count hierarchy, and management entry point for Course roster detail.

### Modified Capabilities

None. Existing add, import, remove, restore, authorization, and lifecycle requirements remain unchanged; this change composes their existing behavior into a new user experience.

## Impact

- **Affected contexts:** Course Catalog and Assignments; Design System.
- **Affected modules:** roster detail page, roster-management client components, CSV parsing/import presentation, shared `WizardStepper`, roster page tests, and production-surface inventory.
- **Authorization:** unchanged. Server Actions continue to validate active role, Course assignment ownership or program scope, selected Program context, roster lifecycle, and eligibility.
- **Privacy:** unchanged. Roster data remains request-scoped; import results remain session-only; safe row messages and opaque support references remain required.
- **Prisma model, SQL migrations, generated Supabase types:** no effect.
- **Caching, deployment, dependencies:** no effect. No new cache, package, API, route, or environment setting.
- **Preserved invariants:** explicit Course-assignment memberships remain independent from term placement; active and evaluation-eligible counts remain distinct; removed history stays default-off; read-only rosters expose no write controls; Program Head selected-Program scope stays explicit; role-owned routes and existing URL behavior stay unchanged.
