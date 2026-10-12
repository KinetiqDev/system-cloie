# Reports

Reports owns the Program Head report-export surface: the downloadable course workbook, Program Outcome workbook, and raw quantitative CSV. It is a read-only projection over Analytics evidence and Response Review identity. It owns no new arithmetic, no new evidence scope, and no new authorization decision.

## Export evidence

**Program Head report export**:
A server-generated file over submitted evidence inside one authorized Program. Three shapes exist: `COURSE_WORKBOOK`, `PROGRAM_OUTCOME_WORKBOOK`, and `RAW_QUANTITATIVE_CSV`. Every file is produced by a re-authorizing server read; no browser payload carries evidence.
_Avoid_: Client-computed report, unfiltered report download, report as an analytics DTO

**Report evidence scope**:
Professional Course-bound evidence and Program-scoped Central evidence inside the selected Program, narrowed by academic period and, for course-shaped exports, by year level. The same Program predicate, the same `ResponseStatus.SUBMITTED` gate, and the same frozen instrument-version snapshot resolution that Analytics uses. General Education Course-bound evidence is never included.
_Avoid_: Respondent Program as scope, General Education rollup, program-wide evidence in a course workbook

**Year-level export control**:
The year-level control narrows Professional Course-bound evidence through `CourseBoundEvaluationTarget` rows for the selected Program, exactly as the Analytics year-level attribution does. Central deployments are filtered by academic period only, because a Central deployment's own year level is not course evidence and is never inferred here.
_Avoid_: Guessing Central year level, year level from respondent enrollment

**Class group**:
One `CourseAssignment` and its published evaluation. Class groups are the unit of course-workbook tallies: two faculty members or two sections of the same course keep separate response groups and are never merged under the course code.
_Avoid_: Merged course result across sections, merged result across faculty

**Report tally**:
Per-question and per-CILO counts produced by the canonical Analytics aggregators over raw submitted ratings. A question's frequency counts reconcile exactly with its valid rating records: `validCount = Σ counts`, `ratingSum = Σ (value × count)`, `mean = ratingSum / validCount`. Excluded counts, distinct response counts, and missing counts stay separate numbers.
_Avoid_: Mean of displayed question means, weighted manifestation score, blended cross-scale mean

**Rating sum derivation**:
The exported rating sum is derived from the authoritative per-option distribution, never from a second accumulation, so the printed sum, mean, and counts cannot disagree with each other.

**Missing count applicability**:
A blank answer counts as missing only when the frozen snapshot defines the question's applicability (`required` versus `required: false`). A question that the snapshot does not enumerate has unknown applicability and prints no missing count.
_Avoid_: Missing count for an unapplicable question, invented applicability

**Raw response block**:
One respondent row per submitted response with the original numeric rating in each applicable question column. Blocks are split per uniform instrument/deployment group: evaluations on different instrument versions or question structures never share a grid.
_Avoid_: Merged raw grid across instrument versions, invented rating for a blank answer

## Identified response records

**Identified report export**:
An export that carries the respondent's full name next to their submitted quantitative answers. Identified exports are restricted access, not ordinary aggregate reports, and are permitted only to a Program Head authorized for the selected Program. Identical names never merge two responses: internal respondent and response ids remain the matching keys.
_Avoid_: Named export for Faculty, Secretary, Dean, or Coordinator, name-keyed row identity

**Respondent name resolution**:
The name comes from the respondent `User` of the response through its evaluation assignment. A blank account name prints `Name unavailable`; no other account's identity, student number, email, or account id is ever substituted or exported.
_Avoid_: Invented identity, cross-account fallback, student number or email in an export

**Confidential export transport**:
Every download sets `private, no-store`, a non-sniffing content type, and a `Content-Disposition` filename, and carries a confidentiality notice inside the file. Exported text is formula-neutralized so a value can never execute as a spreadsheet formula, and raw qualitative comments are excluded from every export.
_Avoid_: Cached export, logged export row, comment export

**Report export audit**:
`report_export_audits` records the exporting actor, Program, export kind, applied filters, and aggregate submitted-response and rating-item counts for each download. The audit holds no respondent identity and no rating value, and a download fails closed when its audit record cannot be written.
_Avoid_: Unaudited download, identity in the audit trail

## Reporting terminology

**PO classification**:
The `PO.classification` field (Common, Core, Professional, Institution-specific, or the migration-only unclassified default). Classification is never inferred from a PO code. Persisted legacy codes such as `BSIT-GO1` are printed unchanged.
_Avoid_: Classification from the code, renaming stored identifiers

**Program Outcome report workbook**:
Course-bound PO evidence and program-wide Central PO evidence reported in separate sections, each keeping its own evidence-source and respondent-category rows, distributions by exact scale identity, valid and excluded counts, full-precision mean, two-decimal display mean, interpretation, CQI classification, and evaluation provenance. Incompatible scales, unsupported scales, and rows without evidence print their unclassified status.
_Avoid_: Combined cross-source mean, invented attainment, source pooling

**Current-mapping disclosure**:
The Analytics disclosure that historical course evidence is grouped by the Program's current CILO-to-PO mappings, reprinted on every exported sheet that groups historical course evidence.
_Avoid_: Publication-time mapping claim

**Raw quantitative export**:
One CSV row per original submitted quantitative answer item, in deterministic order with stable headers, carrying the rating value, its scale descriptor, CILO and PO alignment with classifications and manifestations, class-group context, respondent name, and internal matching ids. Escaping covers commas, quotes, and newlines.
_Avoid_: Comment rows, non-deterministic ordering, alias-only identity

## Open institutional requirements

Three questions stay unresolved and are recorded in `docs/product/program-head-report-export-layout.md`: institutional approval of downloadable identified responses, approval of the institutional column template, and any General Education coverage. The export ships with its disclosures and introduces no new policy.
