# Dean cross-program analytics

Status: Accepted

System CLOIE gives the active Dean college-wide, read-only aggregate analytics. This extends the prior Dean readiness oversight contract without changing operational outcome ownership or identified response-review ownership. General Education evidence remains operationally owned by the Coordinator; the Dean can inspect aggregates only.

The college view compares historical evaluation opportunities, submitted responses, evaluation activity and missing evidence across programs. These are activity signals, not normalized academic rankings. General Education participation stays outside program-specific evidence comparison. College-wide Central deployments with no program remain visible as activity and are not attributed to a program or PO by inference.

Program drill-down reuses the existing PO, course, instrument, source, trend and qualitative engines behind an explicit active-Dean authorization path. It does not impersonate a Program Head or widen Program Head permissions. ILO evidence reuses the General Education engine behind the same explicit authorization. PO, ILO and CILO semantics remain separate. Frozen direct PO bindings survive catalog changes; historical CILO evidence uses current mappings with its existing limitation. No schema changes or migration rewrites are required.

The Dean workspace does not expose identified responses, raw comments, roster data, response identifiers or respondent identifiers. Written-feedback terms require repeated mentions and distinct responses. Supporting evidence is aggregate course, CILO, question, scale and evaluation provenance.

Optional AI uses the existing OpenAI-compatible bounded runtime. A strict server action accepts filters only, reauthorizes, rebuilds evidence and sends an allowlisted packet of at most 20 rows per tier and 16,000 characters or the smaller configured limit. It applies the current evidence-scope submission threshold and the qualitative-item threshold for feedback. Singleton terms do not cross the provider boundary. AI is interpretive, has no write operations, and cannot declare accreditation or prescribe curriculum changes. Production AI activation remains separately governed by ADR 0016.

No persistent analytics or AI cache is added. Reads remain request-scoped. College summaries use database groupBy counts rather than loading respondent rows or querying once per program. Program detail reads run only for the selected view. All-period activity may be expensive for large institutions; measure the college query before adding caching or pagination infrastructure.
