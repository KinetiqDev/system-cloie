# Operational Route Rendering Inventory

This inventory selects route-level loading boundaries and role-level recovery for
GitHub #184. Existing authorization, account-state gates, role-owned URLs, and
server-side reads remain unchanged. Course Assignments entries receive only
loading geometry; their server-first migration remains owned by OpenSpec tasks
3.1-3.3.

| Role         | Selected route                                                     | Fallback owner                                                                | Geometry source                                              | Boundary type |
| ------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------- |
| Secretary    | `/secretary/dashboard`                                             | `secretary/dashboard/loading.tsx`                                             | KPI dashboard cards                                          | route-level   |
| Secretary    | `/secretary/courses`                                               | `secretary/courses/loading.tsx`                                               | course catalog table and filters                             | route-level   |
| Secretary    | `/secretary/courses/new`                                           | `secretary/courses/new/loading.tsx`                                           | course form card                                             | route-level   |
| Secretary    | `/secretary/courses/[id]/edit`                                     | `secretary/courses/[id]/edit/loading.tsx`                                     | course form card                                             | route-level   |
| Secretary    | `/secretary/programs`                                              | `secretary/programs/loading.tsx`                                              | program table and filters                                    | route-level   |
| Secretary    | `/secretary/programs/[id]/edit`                                    | `secretary/programs/[id]/edit/loading.tsx`                                    | program form card                                            | route-level   |
| Secretary    | `/secretary/users`                                                 | `secretary/users/loading.tsx`                                                 | four KPI cards, user filters, and responsive table/card list | route-level   |
| Secretary    | `/secretary/users/new`                                             | `secretary/users/new/loading.tsx`                                             | account form card                                            | route-level   |
| Secretary    | `/secretary/instruments`                                           | `secretary/instruments/loading.tsx`                                           | instrument catalog table                                     | route-level   |
| Secretary    | `/secretary/instruments/[id]/edit`                                 | `secretary/instruments/[id]/edit/loading.tsx`                                 | instrument builder card                                      | route-level   |
| Secretary    | `/secretary/school-years`                                          | `secretary/school-years/loading.tsx`                                          | school-year table                                            | route-level   |
| Secretary    | `/secretary/school-years/[id]`                                     | `secretary/school-years/[id]/loading.tsx`                                     | school-year detail cards                                     | route-level   |
| Secretary    | `/secretary/school-years/[id]/rollover`                            | `secretary/school-years/[id]/rollover/loading.tsx`                            | rollover action panel                                        | route-level   |
| Faculty      | `/faculty/dashboard`                                               | `faculty/dashboard/loading.tsx`                                               | KPI cards and chart cards                                    | route-level   |
| Faculty      | `/faculty/analytics`                                               | `faculty/analytics/loading.tsx`                                               | analytics filters, cards, and chart                          | route-level   |
| Faculty      | `/faculty/cilos`                                                   | `faculty/cilos/loading.tsx`                                                   | course/CILO table                                            | route-level   |
| Faculty      | `/faculty/cilos/new`                                               | `faculty/cilos/new/loading.tsx`                                               | CILO form card                                               | route-level   |
| Faculty      | `/faculty/cilo-evaluations/new`                                    | `faculty/cilo-evaluations/new/loading.tsx`                                    | publication form card                                        | route-level   |
| Faculty      | `/faculty/cilo-evaluations/[evaluationId]`                         | `faculty/cilo-evaluations/[evaluationId]/loading.tsx`                         | review tabs and summary cards                                | route-level   |
| Faculty      | `/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]`  | `faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/loading.tsx`  | anonymized response review                                   | route-level   |
| Faculty      | `/faculty/course-rosters`                                          | `faculty/course-rosters/loading.tsx`                                          | roster filters and table                                     | route-level   |
| Faculty      | `/faculty/tools`                                                   | `faculty/tools/loading.tsx`                                                   | tool catalog table                                           | route-level   |
| Faculty      | `/faculty/tools/[id]/edit`                                         | `faculty/tools/[id]/edit/loading.tsx`                                         | tool builder card                                            | route-level   |
| Program Head | `/program-head/dashboard`                                          | `program-head/dashboard/loading.tsx`                                          | KPI cards and chart cards                                    | route-level   |
| Program Head | `/program-head/courses`                                            | `program-head/courses/loading.tsx`                                            | course catalog table                                         | route-level   |
| Program Head | `/program-head/course-assignments`                                 | `program-head/course-assignments/loading.tsx`                                 | assignment filters and table                                 | route-level   |
| Program Head | `/program-head/cilo-reviews`                                       | `program-head/cilo-reviews/loading.tsx`                                       | review list table                                            | route-level   |
| Program Head | `/program-head/cilo-reviews/[evaluationId]`                        | `program-head/cilo-reviews/[evaluationId]/loading.tsx`                        | review tabs and summary cards                                | route-level   |
| Program Head | `/program-head/cilo-reviews/[evaluationId]/responses/[responseId]` | `program-head/cilo-reviews/[evaluationId]/responses/[responseId]/loading.tsx` | anonymized response review                                   | route-level   |
| Program Head | `/program-head/cilo-evaluations/new`                               | `program-head/cilo-evaluations/new/loading.tsx`                               | publication form card                                        | route-level   |
| Program Head | `/program-head/outcomes`                                           | `program-head/outcomes/loading.tsx`                                           | outcome table                                                | route-level   |
| Program Head | `/program-head/outcomes/mapping`                                   | `program-head/outcomes/mapping/loading.tsx`                                   | mapping cards and badges                                     | route-level   |
| Program Head | `/program-head/tools`                                              | `program-head/tools/loading.tsx`                                              | tool catalog table                                           | route-level   |
| Program Head | `/program-head/tools/new`                                          | `program-head/tools/new/loading.tsx`                                          | tool builder card                                            | route-level   |
| Program Head | `/program-head/tools/[id]/edit`                                    | `program-head/tools/[id]/edit/loading.tsx`                                    | tool builder card                                            | route-level   |
| Program Head | `/program-head/tools/publish`                                      | `program-head/tools/publish/loading.tsx`                                      | publication form card                                        | route-level   |
| Dean         | `/dean/dashboard`                                                  | `dean/dashboard/loading.tsx`                                                  | dashboard KPI and matrix geometry                            | route-segment |
| Dean         | `/dean/academic-structure` catalog/list descendants                | `dean/academic-structure/loading.tsx`                                         | academic structure table geometry                            | route-segment |
| Dean         | `/dean/academic-structure/courses/new`                             | `dean/academic-structure/courses/new/loading.tsx`                             | course form card                                             | route-level   |
| Dean         | `/dean/academic-structure/courses/[id]/edit`                       | `dean/academic-structure/courses/[id]/edit/loading.tsx`                       | course form card                                             | route-level   |
| Dean         | `/dean/academic-structure/instruments/new`                         | `dean/academic-structure/instruments/new/loading.tsx`                         | instrument builder card                                      | route-level   |
| Dean         | `/dean/academic-structure/instruments/[id]/edit`                   | `dean/academic-structure/instruments/[id]/edit/loading.tsx`                   | instrument builder card                                      | route-level   |
| Dean         | `/dean/academic-structure/programs/[id]/edit`                      | `dean/academic-structure/programs/[id]/edit/loading.tsx`                      | program form card                                            | route-level   |
| Dean         | `/dean/college-oversight/*`                                        | `dean/college-oversight/loading.tsx`                                          | oversight filter and table geometry                          | route-segment |

Each role also gets a role-level `error.tsx` owned by that role segment. These
boundaries preserve the authenticated shell, expose retry and exact dashboard
navigation, and redact exception details. Dean work intentionally stops at
role-level recovery and route-segment geometry: local Dashboard and College
Oversight Suspense regions belong to #191.

Excluded routes are static group landings, redirect or `notFound()` polyfills,
lightweight profiles, report/analytics stubs, and client-only create pages such
as `/secretary/courses/new` and `/secretary/instruments/new`. Create flows that
now live in dialogs (for example program creation) have no loading boundary of
their own.

## Browser Evidence Limitation

Automated component and route evidence is available in
`src/__tests__/app/operational-route-rendering.test.tsx`. Browser traces and
accessibility snapshots were not recorded in this worktree because no approved
authenticated deployment, disposable Supabase-authenticated account, or
dedicated signed-demo deployment was available. The development-only
`cloie_dev_auth` and `/api/auth/dev-login` paths were not used. A follow-up
verification must use an approved environment with Fast 3G and 4x CPU
throttling, record the selected LCP element and breakdown, and verify that only
the intended route region suspends.
