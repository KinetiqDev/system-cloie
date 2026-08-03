## ADDED Requirements

### Requirement: A Program Head has one account role and an active assignment set
The system SHALL keep a Program Head's CLOIE account role as exactly `PROGRAM_HEAD` while allowing the Program Head to have zero, one, or multiple active Program Head assignments. The active Program Head assignments SHALL define the complete authorized Program set. An active Program Head assignment SHALL not imply that its Program is primary, default, or selected.

#### Scenario: Program Head manages two Programs
- **GIVEN** a User has one `PROGRAM_HEAD` UserRole and active Program Head assignments for BEED and BSED
- **WHEN** the system resolves that User's Program Head authority
- **THEN** the authorized Program set contains BEED and BSED
- **AND THEN** the system does not create, infer, or display a primary Program

#### Scenario: Program Head has no active assignment
- **GIVEN** a User has the `PROGRAM_HEAD` role and no active Program Head assignment
- **WHEN** the User opens the Program Head entry route
- **THEN** the system renders an actionable empty state explaining that no Program is currently assigned
- **AND THEN** the User cannot open a Program Head management context

### Requirement: Program Head management requires a deliberate route-selected Program
The system SHALL use `/program-head/programs/[programId]/...` as the canonical route family for Program Head management work. The dynamic route segment SHALL identify one requested selected Program context. `/program-head/profile` MAY remain account-scoped to display the complete assignment set, but it SHALL NOT establish management authority.

#### Scenario: Program Head opens a selected Program dashboard
- **GIVEN** a Program Head has an active assignment for BEED
- **WHEN** the Program Head opens `/program-head/programs/{BEED}/dashboard`
- **THEN** the system displays only BEED dashboard data
- **AND THEN** subsequent Program Head management links preserve `{BEED}` until the Program Head deliberately selects another Program

#### Scenario: Legacy Program Head management URL is opened
- **GIVEN** a Program Head opens a previously static Program Head management URL
- **WHEN** the route is resolved
- **THEN** the system redirects to `/program-head`
- **AND THEN** the redirect does not choose a Program from assignment order, a client value, or a remembered preference

### Requirement: Program Head entry handles every active-assignment cardinality
The Program Head entry route SHALL use the current active assignment set to determine the next step. It SHALL redirect a Program Head with exactly one active assignment to that Program's canonical dashboard, display a deliberate Program selector for a Program Head with multiple active assignments, and display the no-assignment empty state for a Program Head with zero active assignments.

#### Scenario: Program Head has exactly one active assignment
- **GIVEN** a Program Head has exactly one active assignment for BEED
- **WHEN** the Program Head opens `/program-head`
- **THEN** the system redirects to `/program-head/programs/{BEED}/dashboard`

#### Scenario: Program Head has multiple active assignments
- **GIVEN** a Program Head has active assignments for BEED and BSED
- **WHEN** the Program Head opens `/program-head`
- **THEN** the system displays BEED and BSED as distinct selectable Program contexts
- **AND THEN** no Program management data or mutation control is rendered until the Program Head follows one selector link

### Requirement: Server-side context validates the selected Program against the full active set
Every Program Head management page, Server Action, and independently callable Program Head service SHALL authenticate the current `PROGRAM_HEAD` User and validate the requested `programId` against that User's complete current active assignment set before returning Program-scoped data or accepting a command. The resolved context SHALL expose the current User, the complete authorized Program set, and exactly one selected Program.

#### Scenario: Program Head selects an authorized Program
- **GIVEN** a Program Head has active assignments for BEED and BSED
- **WHEN** the Program Head requests a BSED management route or action with `programId` BSED
- **THEN** the server resolves BSED as the selected Program
- **AND THEN** the context retains BEED and BSED as the authorized Program set

#### Scenario: Program Head changes a route segment to an unassigned Program
- **GIVEN** a Program Head has an active assignment for BEED but not BSBA
- **WHEN** the Program Head requests a BSBA Program Head management route or submits BSBA as an action input
- **THEN** the system denies the selected Program context before returning or mutating BSBA data
- **AND THEN** the response does not disclose protected resource details

#### Scenario: Program Head assignment becomes inactive after page load
- **GIVEN** a Program Head loaded a selected BSED context
- **AND GIVEN** a Secretary deactivated the BSED assignment before the Program Head submits a write
- **WHEN** the Program Head submits the write
- **THEN** the server denies the write because BSED is no longer active for that Program Head

### Requirement: Program Head reads and commands stay within the selected Program
Every Program Head-scoped read and command for dashboards, Graduate Outcomes, CILO-to-GO mappings, Program-specific Courses, Course Assignments, Course-assignment rosters, Course-bound evaluations and reviews, instrument templates, baseline copies, central deployments, analytics, and reports SHALL operate on one selected Program only. A resource identified by a URL or command input SHALL belong to the selected Program as well as the Program Head's active assignment set.

#### Scenario: Program Head manages two Programs but opens one selected context
- **GIVEN** a Program Head has active assignments for BEED and BSED
- **AND GIVEN** each Program has Courses, Outcomes, templates, and deployments
- **WHEN** the Program Head opens the BSED Courses, Outcomes, Tools, Analytics, or Reports route
- **THEN** the system returns only BSED-scoped records and labels
- **AND THEN** BEED records are not combined into the result

#### Scenario: Program Head targets an authorized resource from another selected Program
- **GIVEN** a Program Head manages BEED and BSED
- **AND GIVEN** a BEED Graduate Outcome exists
- **WHEN** the Program Head submits a BSED selected-context command targeting that BEED Graduate Outcome
- **THEN** the system denies the command
- **AND THEN** the BEED Graduate Outcome remains unchanged

#### Scenario: Program Head opens an out-of-context roster or review resource
- **GIVEN** a Program Head manages BEED and BSED
- **AND GIVEN** a BEED Course Assignment or Course-bound evaluation exists
- **WHEN** the Program Head opens it from a BSED selected-context route
- **THEN** the system returns the feature's non-disclosing unavailable result
- **AND THEN** it does not switch the selected Program implicitly

### Requirement: Sensitive Program Head writes revalidate scope and resource ownership atomically
Before a sensitive Program Head write commits, the system SHALL revalidate in the write transaction that the current User still has an active assignment for the selected Program and that every target Program-scoped resource belongs to that selected Program. The revalidation SHALL preserve existing lifecycle, freshness, confirmation, uniqueness, and roster/evaluation constraints.

#### Scenario: Assignment changes while a central deployment is being published
- **GIVEN** a Program Head has prepared a central deployment for selected BSED
- **AND GIVEN** the BSED assignment is deactivated before the publish transaction commits
- **WHEN** the Program Head submits publish
- **THEN** the transaction does not create the deployment or respondent assignments
- **AND THEN** the Program Head receives a safe authorization failure

#### Scenario: Outcome changes after review preparation
- **GIVEN** a Program Head prepared an Outcome write review for selected BEED
- **AND GIVEN** the Outcome state or BEED assignment changes before confirmation
- **WHEN** the Program Head confirms the write
- **THEN** the transaction rejects the stale review or inactive assignment
- **AND THEN** it does not apply a partial Outcome update

### Requirement: Selected Program context remains explicit across navigation, forms, and freshness
Program Head navigation, in-page links, back links, form actions, redirects, action schemas, loading/error recovery links, and route revalidation SHALL carry the selected Program canonical path. A client-supplied Program ID is only a requested scope and SHALL be validated server-side. Program Head context, authorization, rosters, responses, and other private reads SHALL remain request-scoped and SHALL NOT use persistent shared caching.

#### Scenario: Program Head mutates a selected Program's template
- **GIVEN** a Program Head is viewing selected BSED Tools
- **WHEN** the Program Head creates, edits, duplicates, activates, deactivates, or deletes a BSED template successfully
- **THEN** the system revalidates the affected BSED canonical Tools route
- **AND THEN** it preserves required revalidation for other role-owned routes
- **AND THEN** it does not use an obsolete static Program Head path as the selected context

#### Scenario: Program Head switches Programs
- **GIVEN** a Program Head is viewing selected BEED Outcomes
- **WHEN** the Program Head selects BSED from the Program context selector
- **THEN** the system navigates to a BSED canonical route
- **AND THEN** no BEED form state or BEED route URL is treated as BSED authority

### Requirement: Remembered selection is never Program Head authority
The system SHALL NOT store selected Program authority in user-editable JWT metadata, browser-only global state, or an unvalidated preference. If a future remembered Program preference exists, it SHALL be used only to suggest a destination after the server validates the current active assignment set and SHALL NOT bypass the multiple-Program selector.

#### Scenario: Stale remembered Program is unavailable
- **GIVEN** a future convenience preference points to BSED
- **AND GIVEN** the Program Head no longer has an active BSED assignment
- **WHEN** the Program Head opens the Program Head entry route
- **THEN** the system ignores the stale preference as authority
- **AND THEN** it follows the current zero, one, or multiple assignment entry behavior
