## ADDED Requirements

### Requirement: AI Insights are explicitly enabled and on-demand
The system SHALL keep AI Insights disabled unless server-only `CLOIE_AI_ENABLED` is exactly enabled and required provider configuration is present. AI generation SHALL occur only after an authenticated Program Head explicitly requests interpretation for the current selected-Program scope.

#### Scenario: AI is disabled
- **WHEN** the feature flag or required server-only credentials are absent
- **THEN** the AI Insights view SHALL explain that interpretation is unavailable and deterministic analytics SHALL remain usable.

#### Scenario: Program Head requests AI interpretation
- **WHEN** an authorized Program Head requests AI Insights for a selected Program and valid filter state
- **THEN** the system SHALL start one bounded server-side generation request for that scope and SHALL expose loading state without blocking deterministic views.

### Requirement: AI generation re-authorizes and rebuilds evidence server-side
The AI Action SHALL accept only the selected `programId` and validated tab/filter state. It SHALL re-run `resolveProgramHeadContext(programId)`, rebuild deterministic analytics evidence on the server, and SHALL NOT trust client-provided means, counts, comments, identities, or scope decisions.

#### Scenario: Client submits computed metrics
- **WHEN** an AI request includes client-supplied aggregates or raw qualitative text
- **THEN** the Action SHALL ignore or reject those fields and rebuild the packet from server-authorized data.

#### Scenario: Unauthorized AI request
- **WHEN** a user requests AI interpretation for a malformed or unassigned Program
- **THEN** the Action SHALL fail safely without querying or disclosing that Program's analytics evidence.

### Requirement: AI packets are bounded and privacy-narrowed
The system SHALL send the provider only a bounded packet of server-computed means, distributions, counts, source labels, comparable trend summaries, limitations, and word-frequency tokens. The packet SHALL exclude raw comments, raw response rows, response identifiers, respondent identifiers, account emails, and unused authorization context. Respondent-controlled token text SHALL be treated as untrusted data and SHALL NOT be interpreted as instructions.

#### Scenario: Packet is serialized for a provider
- **WHEN** an authorized request has sufficient evidence for generation
- **THEN** the provider packet SHALL contain only the documented bounded aggregate projection and SHALL respect configured count/character limits.

#### Scenario: Prompt-injection-like token content
- **WHEN** qualitative token text contains instruction-like words or hostile formatting
- **THEN** the system SHALL treat it as evidence data, preserve the fixed instruction boundary, and SHALL NOT allow it to change scope, call tools, or mutate System CLOIE data.

#### Scenario: Insufficient evidence
- **WHEN** the deterministic packet contains insufficient evidence for a responsible interpretation
- **THEN** the Action SHALL return an insufficient-evidence result without invoking the provider.

### Requirement: AI output is structured, validated, and supplementary
The system SHALL require structured AI output containing a concise summary, strengths, areas for review, bounded themes, questions for human review, and limitations. The server SHALL validate output with the repository's Zod version before serialization. AI output SHALL use cautious evidence language and SHALL NOT claim individual mastery, grades, causation, or an automatic CQI decision.

#### Scenario: Valid provider output
- **WHEN** the provider returns output matching the schema and bounded limits
- **THEN** the server SHALL return the validated interpretation with the current filter fingerprint and explicit limitations.

#### Scenario: Invalid provider output
- **WHEN** the provider returns malformed, oversized, or schema-invalid output
- **THEN** the Action SHALL return a safe error state and SHALL NOT serialize the invalid output to the browser.

#### Scenario: Human CQI decision remains authoritative
- **WHEN** a Program Head reads an AI interpretation
- **THEN** the UI SHALL present it as supplementary Areas for Review/summary evidence and SHALL require the human to return to deterministic evidence before making a CQI decision.

### Requirement: Sentiment and theme summaries are computed and bounded
The system SHALL compute displayed sentiment and theme counts from validated output in System CLOIE rather than trusting model-provided totals. Themes SHALL reference only bounded aggregate evidence categories and SHALL NOT fabricate respondent quotations or identities.

#### Scenario: Sentiment counts are displayed
- **WHEN** validated classifications are returned for bounded evidence categories
- **THEN** the server SHALL compute counts and percentages, disclose analyzed versus available evidence, and expose the classification basis.

#### Scenario: Theme output references evidence
- **WHEN** the provider returns themes for the supplied aggregate packet
- **THEN** each theme SHALL contain a bounded name and summary, and SHALL NOT include fabricated quotes or direct respondent identifiers.

### Requirement: AI failure does not break analytics
The system SHALL handle disabled configuration, provider timeout/error, invalid output, insufficient evidence, and unexpected service errors as explicit user-facing AI states while leaving deterministic analytics available.

#### Scenario: Provider fails
- **WHEN** the provider is unavailable or times out
- **THEN** the AI view SHALL show a recoverable error and deterministic tabs SHALL remain usable without exposing provider details or secrets.

#### Scenario: Filters change after generation
- **WHEN** the user changes the tab or filters after an interpretation is returned
- **THEN** the UI SHALL mark the interpretation stale using its filter fingerprint and SHALL require a new request before treating it as current.

### Requirement: AI results are not persisted or used as domain mutations
The system SHALL keep AI packets and results in request/client memory only. It SHALL NOT write AI output, comments, embeddings, recommendations, or conversation history to Prisma, Supabase, a cache, or any domain record, and SHALL NOT invoke tools or mutate academic data from the AI flow.

#### Scenario: AI request completes
- **WHEN** a valid AI interpretation is returned to the browser
- **THEN** the result SHALL be available only for the current client interaction and SHALL not create a persistent database or cache record.

#### Scenario: AI output contains an action instruction
- **WHEN** model output suggests changing a curriculum, grade, mapping, deployment, or CQI record
- **THEN** the UI SHALL render it only as a limitation/question for human review or omit it and SHALL not execute the instruction.
