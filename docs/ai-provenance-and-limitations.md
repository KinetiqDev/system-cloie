# AI Provenance and Limitations — System CLOIE Analytics

> Capstone Technical Document companion. Covers Chapter 2 (related systems / AI-enabled
> design) and Chapter 5 (implementation boundaries, operating limits, and known
> deficiencies) expectations for the AI-assisted analytics in System CLOIE.
> Authoritative code references: `src/features/analytics/services/`
> (`ai-insight-contract.ts`, `program-head-ai-schema.ts`,
> `generate-program-head-analytics-insight.ts`, `generate-faculty-analytics-insight.ts`),
> `src/lib/actions/program-head-analytics-actions.ts`,
> `src/features/analytics/components/program-head-inline-ai-insight.tsx`,
> ADR 0016 (`docs/adr/0016-server-side-bounded-ai-interpretation-boundary.md`),
> and the Analytics & AI Refinement Plan
> (`docs/analytics-and-ai-refinement-plan.md`).

## 1. Model Provenance and Infrastructure

- **Model:** GPT-OSS 20B, served via Groq for fast, low-latency inference. The model
  is selected for speed and cost-efficiency on short, bounded interpretation tasks —
  not for open-ended generation.
- **Transport:** Server-side only, through an OpenAI-compatible chat-completions
  interface (`openai` SDK, `chat.completions.create` with
  `response_format: { type: "json_object" }`). The browser never contacts the
  provider; all provider calls originate from server services
  (`generate-program-head-analytics-insight.ts`,
  `generate-faculty-analytics-insight.ts`).
- **Environment-based configuration:** The feature is disabled unless every
  `CLOIE_AI_*` variable is present and valid (see `.env.example`):
  `CLOIE_AI_ENABLED="true"`, `CLOIE_AI_API_KEY`, `CLOIE_AI_BASE_URL`,
  `CLOIE_AI_MODEL`, `CLOIE_AI_MIN_SUBMITTED_RESPONSES`,
  `CLOIE_AI_MIN_QUALITATIVE_ITEMS`, plus optional `CLOIE_AI_MAX_TOKENS`
  (default 50) and `CLOIE_AI_MAX_PACKET_CHARS` (default 16,000).
  Any missing or malformed value disables the feature closed (`loadAiConfiguration()`
  returns `null`). There is no client-side override.
- **Scope of deployment:** Program Head (PH) AI is view-specific — each analytics
  view (`outcomes`, `courses`, `stakeholders`, `trends`, `qualitative`) owns one
  inline interpretation requested with an explicit `analyticsView` parameter. The old
  dedicated AI tab is deleted; the component `ProgramHeadInlineAiInsight` renders one
  evidence-bound section per view. Faculty AI returns five sections
  (`overview`, `cilos`, `questions`, `trends`, `qualitative`) under the same shared
  `InsightSection` contract.

## 2. Evidence Boundaries and Privacy

- **Server-side evidence rebuilding:** Every AI request rebuilds its evidence
  server-side from validated, authorized reads. The PH service re-runs only the
  deterministic reader backing the requested view (`getProgramHeadOutcomes`,
  `getProgramHeadBreakdowns`, `getProgramHeadStakeholders`, `getProgramHeadTrends`,
  `getProgramHeadFeedback`); Faculty rebuilds from `getFacultyAnalyticsDataWithPrincipal`.
  Authorization is re-checked on each call — a request for a program or course outside
  the reviewer's scope returns `unauthorized` and the provider is never called.
- **De-identified aggregate packets only:** the provider receives a bounded JSON
  evidence packet containing server-computed means, distributions, counts, source
  labels, trend summaries, limitation notes, the applied filter facets, and the
  deterministic qualitative structure (identifier-redacted term prevalence with
  distinct-response counts, per-prompt structure with top terms and tone bands, and
  a tone distribution). Per ADR 0016 and ADR 0023, no raw comment text, sentence,
  excerpt, response identifier, or respondent identifier crosses the boundary.
- **Deterministic tone scoring:** tone bands come from the bundled winkNLP lexicon
  (`doc.out(its.sentiment)`), banded at ±0.2 into positive, neutral, and negative.
  The score is computed server-side over the answer as submitted — the identifier
  redaction deletes title-cased and digit-bearing tokens and would bias tone toward
  neutral — and only band counts plus the scored total are emitted, so no text can
  be reconstructed from the result. The rule, its thresholds, and its limits are
  disclosed in the product and in every AI limitation.
- **Strict row and character caps:** Packets are deterministically truncated before
  serialization — at most 20 course rows, 20 instrument rows, 15 context rows,
  120 characters per label, 40 characters per token text, 6 terms per prompt,
  qualitative prompts sliced to 180 characters, and a hard `maxPacketChars` ceiling
  (default 16,000). The qualitative tier spends what the token slice leaves and
  records the omission in `evidenceScope.promptAnalysis`, while a base packet that
  itself exceeds the ceiling aborts the request (`unexpected`) instead of truncating
  silently.
- **Qualitative privacy thresholds:** Corpus gates refuse interpretation (provider
  never called) until the selected scope meets both
  `minimumSubmittedResponses` and, for the qualitative view, `minimumQualitativeItems`
  (`insufficient-evidence` state). Qualitative evidence is redacted term prevalence,
  per-prompt structure, and tone band counts — never quotations, identities, or PII.
  The prompt explicitly forbids presenting a term as a quote or complete thought.
- **AI never receives client-supplied aggregates:** Client filters (tab, school year,
  evidence source) are re-validated server-side through Zod
  (`program-head-ai-schema.ts`) and then used only as selectors for the server's own
  reads. The packet is built from database reads, never from numbers the browser
  sends. The user message wraps the packet in `<system-cloie-evidence>` markers with
  an explicit instruction that the content is data, not instructions, and must not
  change scope, role, or system behavior.

## 3. Deterministic vs AI Roles

- **System CLOIE calculates everything deterministically.** All metrics, means, rating
  distributions, CILO contributor matrices, trend comparability breaks
  (instrument-fingerprint matching), word-cloud tokens, term prevalence with
  distinct-response counts, per-prompt structure, and tone bands are computed by
  tested deterministic services. Charts render from these values and never wait
  on AI.
- **Themes are the AI's reading of that structure, not a stored artifact.** System
  CLOIE does not cluster, label, or persist a theme; the model names what the
  per-prompt terms and counts show, inside one validated observation. Nothing about
  a theme survives the request.
- **The AI's sole role is interpretation of grounded evidence.** Given one bounded
  packet, it surfaces a single evidence-bound observation per section: what pattern
  the numbers show, the exact figures behind it, how it relates to other figures in
  the packet, what the evidence cannot prove, and one checkable question a human
  could look into.
- **What the AI never does:**
  - Never calculates attainment, means, or distributions.
  - Never makes academic or curriculum decisions (no CQI directives, no grade or
    mastery claims, no causation, no blame of individuals).
  - Never suggests executing actions, changing records, or using tools — it has no
    tools and cannot modify System CLOIE.
  - Never authorizes access, mutates domain records, or persists response text or
    AI history (ADR 0016 non-persistence boundary; process restart clears all
    cached output).

## 4. Output Contract and Hallucination Guardrails

- **Zod-validated `InsightSection` contract** (`ai-insight-contract.ts`), shared by
  Faculty and PH generators:
  ```ts
  {
    observation: string;          // 1..400 chars, anchored to concrete numbers
    evidence: string[];           // 1..5 strings, 1..200 chars each, exact figures
    connection?: string;          // max 400 chars, omitted when unsupported
    limitation: string | null;    // max 200 chars
    reviewQuestion: string | null;// max 200 chars, question — never a directive
  } | null                       // null when evidence supports no observation
  ```
  Provider output is length-checked (`AI_MAX_OUTPUT_CHARS = 12,000`) before parsing
  and Zod-validated after. Anything failing validation surfaces as `invalid-output`,
  never rendered.
- **System-prompt prohibitions (hallucination guardrails):**
  - Model-authored sentiment is banned. The model may report the deterministic tone
    distribution as figures, name the fixed-rule thresholds, and describe which band
    holds most scored answers; it must not add its own sentiment, tone, satisfaction,
    or quality verdict, and must not treat the distribution as a judgement about
    teaching quality. It states the rule's limits with the figures.
  - Qualitative structural rules are enforced: prompts are described separately and
    never merged, terms are never presented as quotations or complete thoughts, and a
    high mention count from one answer is never reported as broad agreement (mention
    volume and distinct-response reach are separate measures).
  - Applied filters are respected: the packet states the reviewer's chosen evidence
    source and stakeholder, every figure already reflects them, and the model must not
    describe evidence outside that scope.
  - Management-consultant sludge is banned: no generic strengths/areas-for-review
    inventories (exactly one grounded observation per section), no synergies,
    holistic excellence, deep dives, moving forward, robust ecosystems, or filler.
  - Curriculum and action recommendations are banned: no CQI decisions, no grade or
    mastery claims, no causation, no invented identities, quotations, comments, or
    values.
  - Scale-relative reading is enforced: means are judged against their named scale
    range (e.g., 1–5), never an absolute standard; trend periods are compared only
    when marked comparable; small pools must be disclosed as possibly
    unrepresentative.
- **Markdown-fence-tolerant JSON parsing:** `parseInsightJson` accepts a bare JSON
  value or JSON inside a single markdown fence (` ```json … ``` `) and
  rejects everything else. The system prompt demands exactly one JSON value with no
  surrounding text, while the parser tolerates the fence wrapper models commonly
  emit — belt and suspenders, with Zod as the final gate.

## 5. Caching and Rate Limiting

- **SHA-256 process-local LRU cache:** Validated insights are cached in a bounded
  `Map` (max 128 entries each for PH and Faculty, oldest evicted first). The cache
  stores validated AI output only — never source responses, sessions, or
  authorization decisions. Cache keys hash the prompt version
  (`program-head-analytics-v2` / `faculty-analytics-v4`), the scope identity
  (program or faculty user id), the model, the base URL, and the full serialized
  evidence packet.
- **In-flight deduplication:** Concurrent identical requests share one provider call
  via an `inFlightInsights` map; the entry is removed in `finally` so failures never
  poison later requests.
- **Evidence-hash invalidation:** Because the serialized packet is part of the key,
  any change in mappings, responses, filters, thresholds, model, or prompt version
  produces a different hash and automatically triggers a fresh interpretation. No
  manual cache busting is needed, and unchanged scopes reuse validated output
  without spending tokens.
- **Rate limiting by construction:** Corpus gates, packet caps, `maxOutputTokens`,
  a 60-second provider timeout (`AI_PROVIDER_TIMEOUT_MS`), and cache reuse together
  bound provider spend. Timeouts and provider errors surface as recoverable states
  (`timeout`, `provider-error`), never as fabricated content.

## 6. Human Oversight and Failure Modes

- **Graceful degradation:** AI failure never blocks deterministic charts. Every
  failure mode — disabled configuration, insufficient evidence, unauthorized scope,
  timeout, provider error, invalid output — returns a typed state that the UI
  renders as an explanatory placeholder beside fully functional charts.
- **Manual regeneration control:** Each inline insight section carries its own
  retry/regenerate affordance. Regeneration re-runs the full pipeline (authorization
  → evidence rebuild → gates → provider → validation), so a reviewer can refresh an
  interpretation after new responses arrive without reloading the dashboard.
- **Human academic review is the final authority.** AI output is supplementary
  interpretation, structurally framed as reviewable: every observation ships with
  its evidence figures, an explicit limitation, and a `reviewQuestion` phrased as a
  checkable question rather than a directive. Program heads and faculty decide what,
  if anything, to act on; the system records no AI-driven decisions.

## 7. Known Limitations and Capstone Boundaries

1. **Deferred `cilo_plo_mappings_snapshot` migration (accepted boundary).**
   Course-derived PLO metrics (`buildCourseDerivedPloMetrics`) join
   publication-time question-to-CILO bindings with the **current, live**
   `CILOMapping` table. If a Program Head edits a CILO-to-PLO mapping today,
   historical course evidence is reinterpreted under the new mapping — historical
   PLO analytics are technically mutable. Program-wide central deployments are
   unaffected (they correctly use `CentralDeploymentPloSnapshot`). The schema fix
   (a `cilo_plo_mappings_snapshot` JSON column on `CourseBoundEvaluation` plus
   backfill) was deferred as high-migration-risk for this phase; the UI carries the
   "Publication-time mapping snapshots are not yet available" disclosure, and this
   document records the gap as the primary defense-ready future-work item.
2. **Deterministic-structure ceiling.** The provider sees identifier-redacted term
   prevalence, per-prompt structure, and tone band counts rather than raw comments,
   so interpretation is limited to what that structure shows. Verbatim de-identified
   excerpts remain unshipped (ADR 0016 keeps the path available; ADR 0023 records the
   adjudication and output-guardrail work it still requires).
3. **Tone rule limits.** The bundled lexicon is small and fixed. It handles simple
   negation but misses some negations and sarcasm, and an answer mixing praise and
   criticism scores once. Bands are a word-level rule, not a reader's judgement, and
   the product says so beside every distribution.
4. **Small-pool and incomparability caveats.** Single-term seeds, thin respondent
   pools, and instrument-version breaks limit what trends can prove. The AI is
   instructed to state these limits, and trend views mark incomparable periods with
   break reasons rather than drawing continuous lines.
5. **No persisted AI history.** Interpretations are ephemeral and non-auditable
   beyond the deterministic evidence that produced them. Reproducibility rests on
   the evidence packet and prompt version, not on stored model output.
