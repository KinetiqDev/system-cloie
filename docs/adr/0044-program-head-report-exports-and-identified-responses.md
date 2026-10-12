# Program Head report exports and identified response records

**Status:** Accepted (export build carries one proposed-policy disclosure; two institutional questions stay open)

System CLOIE replaces the Program Head Reports placeholders with three server-generated downloads: a year-level course workbook (XLSX), a Program Outcome report workbook (XLSX), and a normalized raw quantitative CSV. Individual response records in all three carry the respondent's actual full name, so these exports are **confidential**, not aggregate reports.

## Context

The Program Head already has aggregate Analytics and identified Response Review. Nothing could be handed to accreditation evidence, a QA committee, or a spreadsheet analysis without rebuilding tables by hand.

The October 6 consultation proposed identified Program Head exports. The Privacy Notice (version 1.2) already states that evaluation submissions are not completely anonymous and that authorized Program Heads may review identified submitted responses from Professional courses and Central deployments within their assigned programs, while also stating that ordinary reports should not display respondent identities and that access to identifiable response records must be restricted to specially authorized personnel. Those two statements are consistent only if the export is treated as restricted access, not an ordinary report.

## Decision

- **Exports reuse the Analytics read model.** Every count, mean, distribution, and classification in an export is produced by the canonical aggregators (`buildCiloMetrics`, `buildQuestionMetrics`, `aggregateOutcomeEvidence`, `buildProgramWidePoMetrics`, `buildQuantitativeMetric`, `groupRatingsByScale`, `classifyOutcomeMean`, `classifyOutcomeDistributions`) over evidence scoped exactly as Analytics scopes it. No export invents a second arithmetic path, and no export combines incompatible scales, weights manifestations, or labels unsupported evidence as attainment.
- **Scope is unchanged.** Professional Course-bound evidence and Central evidence inside the selected Program, plus the optional year level of the course workbook and CSV. General Education Course-bound evidence stays out until a separate approved access and reporting contract exists.
- **Named responses are permitted in exports.** The respondent's `User.name` reaches an export only through the authorized response → assignment → user path. No student number, account id, email, or raw qualitative comment is ever exported. Internal respondent and response ids stay in the export as stable columns for matching and deduplication; a missing name prints as `Name unavailable` and never falls back to another respondent's identity.
- **Authorization.** `resolveProgramHeadContext(programId)` gates every export server-side, and the download re-authorizes per request. Faculty, Secretary, Dean, General Education Coordinator, and unauthenticated requests are refused; frontend filters are never treated as authorization.
- **Audit trail.** Every download writes `report_export_audits`: actor, Program, export kind, applied period/year-level filters, and aggregate submitted-response and rating-item counts. No respondent identity or rating value is stored in the audit.
- **Transport.** Downloads are served from a route handler with `Cache-Control: private, no-store`, a non-sniffing content type, and a `Content-Disposition` filename. Exported text is written with spreadsheet-formula neutralization, and raw comments are excluded from every export.

## Considered Options

- **Handing exports to the analytics DTOs directly.** Rejected. Analytics DTOs are aggregate, cross-scale-aware, and deliberately free of respondent identity and raw rows; the export needs the underlying rows to print per-response grids and per-option tallies.
- **An identified-mode toggle beside an anonymous default.** Rejected. The export is a restricted-access download in every state; a mode switch would give an unapproved configuration the same audit and disclosure surface without a policy basis.
- **Caching export payloads.** Rejected. The payload is named-response data; a cached copy would outlive the session that was authorized to read it.
- **PDF at the same time.** Deferred. The PDF renderer is a separate deliverable and would need its own layout and print evidence.

## Consequences

- A Program Head export is personally identifiable data: the workbook carries a confidentiality notice, and handling it follows the Terms' "store exported reports securely" rule.
- **Open institutional question (privacy).** The Privacy Notice says ordinary reports should not display respondent identities. Downloadable identified responses therefore need an explicit institutional confirmation that the privacy policy and the respondent notice support them. Until that is recorded, the export ships with the disclosure in its Data Dictionary and the recommended handling note rather than as a silent release of identified data.
- **Open institutional question (layout).** The institutional column set for the year-level course worksheet is a representative sample, recorded in `docs/product/program-head-report-export-layout.md`, pending Program Head review before it is treated as the institution's reporting template.
- **Open institutional question (General Education).** Covering General Education Course-bound evidence would extend evidence ownership past ADR 0034 and needs its own access and reporting contract.
- Analytics and Response Review contracts are unchanged; the export is a read-only projection over them.

Related: [ADR 0009](0009-program-head-selected-program-context.md), [ADR 0034](0034-general-education-response-evidence-ownership.md), [ADR 0037](0037-canonical-outcome-attainment-interpretation-policy.md), [ADR 0038](0038-dean-cross-program-analytics.md).
