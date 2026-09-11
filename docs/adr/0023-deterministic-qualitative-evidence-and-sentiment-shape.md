# Deterministic Qualitative Evidence and Sentiment Shape

**Status:** Accepted

**Shipped-state note (2026-09-11):** the deterministic core, both browser surfaces, both AI packets, and both prompts shipped together: `qualitative-analytics.ts` (analyzer, tone bands, prevalence), the Program Head qualitative view, the Faculty written-feedback view, the Program Head qualitative packet with budgeted `promptEvidence`, the Faculty packet with budgeted token and prompt tiers, the applied-filter facets on every packet, and prompt versions `program-head-analytics-v3` / `faculty-analytics-v5`. No database migration was required. Per-prompt evidence is keyed by evidence source, instrument version, and prompt label, and carries the instrument-version label; every prompt tier is character-budgeted so a broad scope degrades by omission instead of losing the whole interpretation.

System CLOIE ships richer qualitative evidence to bounded AI interpretation by computing the qualitative signal deterministically on the server and keeping verbatim respondent text on the server. Three concepts cross the provider boundary: identifier-redacted term prevalence (term, mentions, distinct responses), per-prompt qualitative structure (item/response counts, top terms, tone distribution), and a deterministic sentiment distribution. The provider interprets that structure; it never performs its own sentiment analysis, never reproduces respondent text, and never receives a sentence, an excerpt, a response identifier, or a respondent identifier. The de-identified raw-comment path accepted in ADR 0016 remains unshipped.

## Context

The shipped Program Head and Faculty AI insights receive word-frequency counts and per-prompt answer counts only (`generate-program-head-analytics-insight.ts`, `generate-faculty-analytics-insight.ts`, `qualitative-analytics.ts`). Word frequency cannot separate "achieved" from "less achieved", one verbose respondent outweighs a dozen brief ones, and the Program Head cloud pools every evidence source into one corpus while the quantitative surfaces refuse to pool sources. Issue #620 records the consequence: the insight restates numbers instead of interpreting feedback.

A word-frequency token is also a poor fingerprint of what respondents meant. The measured corpus at reference volume is 7,228 qualitative items across 3,745 responses, so richer evidence is cheap to compute but must stay bounded.

## Decision

### Crossing the boundary

| Signal               | Definition                                                                                                                        | Emitted to browser and provider                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Term prevalence      | identifier-redacted term, total mentions, distinct responses containing the term                                                  | term, mentions, distinct-response count                       |
| Per-prompt structure | per instrument prompt, instrument version, and evidence source: item count, distinct-response count, top terms, tone distribution | counts, redacted terms, and the instrument-version label only |
| Sentiment shape      | per prompt and per scope: count of answers banded positive, neutral, negative by a deterministic rule                             | band counts and the scored total                              |

Nothing else crosses. Raw comments, sentences, excerpts, response identifiers, respondent identifiers, emails, roster records, and authorization context stay server-side, exactly as the Analytics CONTEXT AI evidence packet defines.

### Deterministic rules

**Term prevalence** reuses the existing pipeline: `redactProgramHeadFeedbackIdentifiers` then winkNLP tokenization with stopword removal, projecting `{ text, mentions, responseCount }`. Distinct-response counting requires the response identity inside the analysis input; it never leaves the server. Terms are ordered by mentions descending, then distinct responses descending, then `localeCompare`, so serialized packets and cache keys stay stable. Counts describe the corpus as submitted: a blank answer is ignored, and an answer that redacts to nothing still counts in item, response, source, prompt, and tone totals while contributing no term.

**Sentiment shape** scores each non-empty answer server-side with winkNLP's bundled lexicon — `wink-nlp` 2.4.0 with `wink-eng-lite-web-model` 1.8.1, `nlp.readDoc(text).out(its.sentiment)` — and bands the score:

- `positive` when score ≥ `+0.2`
- `negative` when score ≤ `-0.2`
- `neutral` otherwise (including unmixed zero scores)

The thresholds and the lexicon are fixed, versioned with the application, and reproducible offline; no provider participates. Scoring reads the answer as submitted, not the redacted projection, because redaction deletes title-cased and digit-bearing tokens and would bias tone toward neutral. Only band counts and the scored total are emitted, so the unredacted read cannot reconstruct any text.

Known limits, disclosed in the product and in every AI limitation: the lexicon misses some negation patterns (for example "never clear" scores neutral), cannot read sarcasm, and averages an answer that mixes praise and criticism into one score.

### Provider voice

The provider may report the deterministic distribution as figures and may describe the dominant band as reported by the stated rule. It may not assert its own sentiment, tone, satisfaction, or quality verdict, may not label an outcome or a finding positive or negative on its own authority, and may not present a term as a quotation or a complete thought. The `InsightSection` contract is unchanged.

### Floors and scope

- Program Head: no change to the existing gates. Term prevalence and per-prompt structure are computed for every contributing source; per-source evidence keeps its source label so pooled evidence is never presented as one construct. The Program Head word cloud remains a single pooled magnitude visual, and the structured evidence — per-source tone, per-prompt terms, and prevalence with distinct-response counts — is what carries the source and prompt labels. Themes are the provider's reading of that structure; System CLOIE does not store one.
- Faculty: the five-distinct-respondent floor continues to gate every qualitative contribution, including tone bands, which read zero below the floor. Singleton terms stay dropped for Faculty, per prompt as well as per scope.
- Per-prompt structure releases only for prompts whose own distinct-response count meets the floor; other prompts are withheld rather than partially disclosed, and two instrument versions that share a prompt label never merge into one aggregate.
- Each prompt row carries the stable instrument identity as well as its readable label: the identity keys the browser rows, and a label that two distinct instruments genuinely share is qualified with it, because instrument template names and version numbers are unique per template rather than college-wide. Instrument identities are catalog provenance, not respondent identity.
- The applied filter facets (evidence source, stakeholder, academic period label) are stated inside the packet, so the interpretation can name and caveat the scope it was given. Filter evidence is still rebuilt and re-authorized server-side per request; no client-supplied aggregate is trusted.

### Budget and caching

The bounded base packet keeps its hard failure: exceeding `CLOIE_AI_MAX_PACKET_CHARS` aborts the request as `unexpected`. Optional qualitative tiers degrade by omission instead, recording truncation so the browser can disclose what was analyzed — the Program Head packet in its `evidenceScope`, the Faculty packet in the per-tier `tokensTruncated`, `promptCountsTruncated`, and `promptTermsTruncated` flags that the Faculty AI evidence carries to the written-feedback view. Each tier spends only what the tiers before it left, so a broad scope still receives an interpretation. Ordered selection is deterministic: prompts by item count descending, terms by the prevalence order above.

The cache key remains a SHA-256 over the prompt version, scope identity, provider, model, and the complete serialized packet, so any evidence change mints a new key. Because the key hashes the packet and not the prompt text, a prompt-only edit is invisible to the cache; bumping `PH_AI_PROMPT_VERSION` / `FACULTY_AI_PROMPT_VERSION` in the same commit is required, not optional.

## Considered Options

- **Server-computed structure with provider interpretation.** Accepted. It delivers the requested per-prompt, thematic, and sentiment reading while keeping the privacy boundary server-enforced, deterministic, and reproducible.
- **Provider-judged sentiment labels.** Rejected. A provider verdict on whether feedback is positive or negative is unsupported by the evidence it receives, not reproducible across models or runs, and contradicts the shipped prompts and the recorded removal of sentiment from the AI schemas. The deterministic distribution supplies the same user-facing information with an auditable rule behind it.
- **Verbatim de-identified excerpts.** Deferred, not rejected. ADR 0016 keeps the path available; shipping it requires a new decision plus a sentence-level adjudication rule and an output guardrail that rejects any provider output containing an n-gram drawn from the corpus.
- **No change.** Rejected. It leaves the issue's problem in place and leaves the qualitative surface restating counts.

## Consequences

- The Program Head qualitative view and the Faculty written-feedback view render prevalence and tone structure from deterministic reads; charts and tables never wait on a provider.
- Both system prompts and both prompt-version constants change together. Provider output that invents its own sentiment remains rejected by schema or ignored by validation.
- `src/features/analytics/CONTEXT.md`, `src/features/response-review/CONTEXT.md`, the Program Head analytics spec, and the provenance document are updated in the same change; the refinement plan's pre-change baseline is marked historical.
- Seed data must produce enough distinct respondents to demonstrate the Faculty floor and the tone bands; affected visual baselines and fixtures are regenerated deliberately.
- A percentage-based provider usage budget is **deferred**. It needs its own decision covering per-instance versus centralized accounting, a new typed failure state and its product copy, and what happens to a request that exceeds budget. Nothing in this decision blocks it, and no budget mechanism ships here.
- Verbatim excerpts remain out of scope, and no schema migration is required: every signal is derived from existing `qualitative_response_items` rows.
