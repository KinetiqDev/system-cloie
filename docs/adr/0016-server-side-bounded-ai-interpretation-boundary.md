# Server-Side Bounded AI Interpretation Boundary

**Status:** Accepted

System CLOIE will implement bounded AI-assisted interpretation of selected-Program analytics evidence, including de-identified submitted qualitative responses processed server-side. Development and testing may enable the feature through an engineering-configured corpus threshold and a deliberately selected OpenAI-compatible base URL. The browser receives only validated aggregate-derived output; AI never authorizes access, makes CQI decisions, mutates domain records, or persists response text or AI history. Production enablement and operating policy remain separately reviewable, but implementation work must preserve the safety boundary now rather than defer it.

## Considered Options

- **Aggregate-only AI.** Rejected as the complete interpretation boundary because word-frequency tokens and numeric aggregates cannot support reliable sentiment or theme interpretation.
- **Server-side de-identified qualitative processing with engineering-configured enablement.** Accepted for feature development and testing. It enables the requested sentiment/theme capability while preserving server-side authorization, deterministic redaction, bounded corpus size, no quote reproduction, aggregate-only browser output, and non-persistence.
- **Client-side or unrestricted provider access to raw comments.** Rejected. It would cross the existing analytics privacy boundary and expose respondent-controlled text outside independently authorized server services.
- **Persisted AI summaries or conversational history.** Rejected. Persistence would create a new evidence lifecycle, retention policy, and correction problem not required for supplementary interpretation.

## Consequences

- The feature is disabled by default and requires an explicit server-side enablement flag, provider base URL, credentials, and corpus threshold.
- Testing may use controlled fixtures or deliberately selected test data; test enablement does not permit bypassing authorization, redaction, bounded input, output validation, or non-persistence.
- Deterministic submitted-response analytics remains the authoritative evidence surface and can ship independently.
- Production rollout requires a later operating-policy decision for privacy suppression, provider retention, and approved data processing, but that decision does not block implementation of the guarded feature path.
