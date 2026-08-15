## ADDED Requirements

### Requirement: Course roster upload accepts bounded name CSV input
System CLOIE SHALL accept a UTF-8 CSV with exactly one recognized `name` or `Student Name` column, standard CSV quoting, and 1 to 100 source rows. It SHALL preserve every source row independently, including repeated names, and SHALL not mutate a Course-assignment membership while parsing or preparing preview.

#### Scenario: Official names contain quoting and repeated values
- **GIVEN** an authorized Course roster manager uploads a CSV containing quoted punctuation and two identical Student names
- **WHEN** the file is parsed
- **THEN** System CLOIE SHALL preserve both source indexes as independently resolvable rows and SHALL perform no membership write

#### Scenario: File structure is invalid
- **GIVEN** a file has invalid UTF-8, no recognized name column, a non-empty extra column, no data rows, or more than 100 source rows
- **WHEN** the manager requests preview
- **THEN** System CLOIE SHALL reject the file before candidate discovery or membership mutation with safe recovery guidance

#### Scenario: One name value is unusable
- **GIVEN** a structurally valid file contains a blank or over-200-character normalized name among valid names
- **WHEN** preview is prepared
- **THEN** System CLOIE SHALL retain that source row as `INVALID_NAME` while continuing to resolve the other rows

### Requirement: Name normalization is temporary and conservative
System CLOIE SHALL use Unicode NFKC normalization, Unicode-aware case-insensitive comparison, trimming, and repeated-whitespace collapse for strict comparison only. It SHALL preserve canonical `User.name` and uploaded source values and SHALL not persist a normalized roster name.

#### Scenario: Casing and whitespace differ
- **GIVEN** an uploaded value ` ANDY   ZANE EGUT ` and one scoped account named `Andy Zane Egut`
- **WHEN** strict comparison runs
- **THEN** the row SHALL be an `EXACT_MATCH` without changing either stored or source name

#### Scenario: Canonical names have culturally variable structure
- **GIVEN** a single-word, compound, punctuation-bearing, or diacritic-bearing canonical account name
- **WHEN** System CLOIE prepares candidates
- **THEN** it SHALL treat the name as opaque text and SHALL not infer first, middle, surname, or token ownership

### Requirement: Candidate discovery is assignment-authorized and eligibility-aligned
System CLOIE SHALL authorize the target Course assignment once, batch-load a bounded candidate population, and resolve all uploaded rows without one database query per row. Program-specific discovery SHALL require matching profile and active assignment-period placement Program but SHALL not exclude by assignment year level or section. General Education discovery SHALL accept any valid active placement in the assignment period.

#### Scenario: Irregular Student differs from assignment cohort
- **GIVEN** an eligible Program-specific Student matches the assignment Program but has a different current year level or section
- **WHEN** the Student name is resolved
- **THEN** System CLOIE SHALL keep the Student selectable and SHALL use academic context only to rank or explain candidates

#### Scenario: General Education Student belongs to another Program
- **GIVEN** an active Student has a sufficient profile and active assignment-period placement outside the assignment Program
- **WHEN** a General Education roster resolves the Student name
- **THEN** the Student SHALL remain eligible for candidate selection

#### Scenario: Candidate belongs outside authorized scope
- **GIVEN** a name-similar account is outside the server-authorized academic candidate neighborhood
- **WHEN** preview or manual search runs
- **THEN** System CLOIE SHALL not disclose or select that account

### Requirement: Resolution states distinguish certainty from eligibility
Every source row SHALL have an identity-resolution state separate from membership disposition. A unique strict-normalized candidate SHALL be `EXACT_MATCH`; one uniquely strong explainable middle-token, initial, separator-punctuation, suffix, or diacritic variant MAY be `SUGGESTED_MATCH`; multiple equal-tier candidates SHALL be `AMBIGUOUS`; absence of a safe selectable candidate SHALL be `NO_MATCH`.

#### Scenario: Google name omits middle tokens
- **GIVEN** uploaded `MARIA THERESE ANN GONZALES REYES` and a uniquely strong scoped candidate `Maria Therese Reyes`
- **WHEN** ordered-token evidence is evaluated
- **THEN** System CLOIE SHALL classify the row as `SUGGESTED_MATCH`, show a closed reason label, and SHALL not call it exact

#### Scenario: Same-name accounts exist
- **GIVEN** two selectable scoped accounts have the same strict-normalized name as one uploaded row
- **WHEN** resolution runs
- **THEN** the row SHALL be `AMBIGUOUS` and System CLOIE SHALL not select by database order or academic placement

#### Scenario: Two repeated names and two accounts exist
- **GIVEN** two identical uploaded rows and two distinct same-name scoped accounts
- **WHEN** the manager reconciles them
- **THEN** each source row SHALL remain ambiguous until the manager maps it to a different account

#### Scenario: One repeated-name account exists
- **GIVEN** two identical uploaded rows and only one selectable account
- **WHEN** the manager resolves the rows
- **THEN** at most one row MAY select that account and the other SHALL remain unresolved or be skipped

### Requirement: Candidate search is bounded and shared
Bulk reconciliation and manual add SHALL use the same authorization, candidate scope, eligibility, diagnostic, and ranking contract. Interactive search SHALL require at least two normalized characters, return at most 10 ranked candidates, provide no pagination or all-Student browse mode, and ignore stale query results.

#### Scenario: Faculty refines an ambiguous search
- **GIVEN** `Jo` returns 10 scoped candidates for an ambiguous row
- **WHEN** the manager enters `John Paul`
- **THEN** System CLOIE SHALL return only the current bounded result and SHALL not expose later pages from the broader query

#### Scenario: Strong ineligible diagnostic exists
- **GIVEN** no selectable candidate exists but a strongly name-matching account in the authorized academic neighborhood is inactive or has invalid profile or placement data
- **WHEN** preview is prepared
- **THEN** System CLOIE MAY show the non-selectable account with ACD email, safe reason, and current authorized academic context but SHALL keep the row unresolved

### Requirement: Preview requires explicit reconciliation
A unique exact match MAY be ready without row acknowledgement. Suggested matches SHALL require one final acknowledgement of the current suggested-match count. Ambiguous, no-match, and invalid-name rows SHALL be explicitly resolved or skipped; System CLOIE SHALL not silently omit them.

#### Scenario: Suggestions remain unacknowledged
- **GIVEN** preview contains three preselected suggested matches
- **WHEN** the manager has not acknowledged reviewing the three suggestions
- **THEN** System CLOIE SHALL keep final confirmation disabled

#### Scenario: Suggested selection changes
- **GIVEN** the manager acknowledged suggested matches and then changes one suggested account
- **WHEN** the preview state updates
- **THEN** System CLOIE SHALL clear the acknowledgement and require it again

#### Scenario: Unresolved row is skipped
- **GIVEN** a Student has not registered and the row is `NO_MATCH`
- **WHEN** the manager explicitly selects Skip
- **THEN** preview SHALL retain the row as skipped and final confirmation SHALL state that it will not be added

### Requirement: Preview remains private session state
Preview, candidate search results, selections, skips, and final results SHALL remain in the current management workspace memory only. They SHALL not be persisted in browser storage, a server cache, or the database. Closing a dirty preview SHALL require discard confirmation; closing or refreshing SHALL discard it.

#### Scenario: Manager closes a dirty preview
- **GIVEN** parsed or reconciled rows exist
- **WHEN** the manager attempts to close, escape, or dismiss the responsive workspace
- **THEN** System CLOIE SHALL request accessible discard confirmation before losing the preview

#### Scenario: Workspace is reopened
- **GIVEN** the manager discarded or completed the prior session
- **WHEN** the workspace opens again
- **THEN** it SHALL start at Add members without prior names, candidates, choices, or results
