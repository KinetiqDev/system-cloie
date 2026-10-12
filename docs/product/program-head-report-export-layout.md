# Program Head report-export layout (representative sample)

Status: **representative sample, pending Program Head review.** This file is the layout the implemented exporters produce. It is not yet the institution's approved reporting template.

Produced by the Program Head Reports page (ADR 0044). Every number comes from the canonical Analytics aggregators over submitted evidence scoped to the selected Program.

## 1. Course evaluation workbook (XLSX)

Worksheets, in order:

| Sheet             | Contents                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Overview`        | Program, period, year level, generation time, export actor, counts, confidentiality notice                                                              |
| `PO Summary`      | PO rows reached by the courses in this workbook: code, description, classification, valid ratings, distinct responses, mean, interpretation, CQI status |
| one per course    | Course code as the worksheet name, with course information, class groups, CILO/PO alignment, question tallies, CILO summaries, raw response blocks      |
| `Data Dictionary` | Column meanings, denominators, scale identities, classification rules, disclosures                                                                      |

Course worksheet sections, top to bottom:

1. **Course information** — course code and title, Program, school year / semester / term, year level, instrument name and version.
2. **Class groups** — one block per course assignment: faculty member, section, evaluation name and status, assigned respondents, submitted responses, response rate. Two faculty members or two sections of the same course stay in separate blocks; nothing is merged under the course code.
3. **CILO and PO alignment** — one row per CILO: CILO label and description, mapped PO codes and descriptions, PO classification from the `PO.classification` field, Learning/Practice/Opportunity manifestation (descriptive label, never a weight), and direct question-to-PO bindings where the published evaluation carries them.
4. **Question tallies** — one row per question per class group: CILO, section and item key, prompt, exact Likert scale identity, one count column per scale option, valid rating count, excluded rating count, missing count (only when the frozen snapshot says the item was required), rating sum, full-precision mean, two-decimal display mean, interpretation and CQI status when the scale is classifiable.
5. **CILO summaries** — one row per CILO: contributing questions, distinct submitted responses, valid rating count, distribution, full-precision mean, two-decimal display mean, interpretation or an explicit unclassified status.
6. **Raw response blocks** — one block per uniform instrument/deployment group. Columns: respondent name, response id, respondent id, submitted timestamp, then one column per applicable question holding the original numeric rating (blank when unanswered). Sections that used different instrument versions or question structures get their own block rather than one merged grid.

## 2. Program Outcome report workbook (XLSX)

Worksheets: `Overview`, `PO Summary`, `PO Classification`, `PO Rating Tallies`, `Course and CILO Contributions`, `Program-wide Evidence`, `Data Dictionary`.

- Course-bound PO evidence and program-wide (Central) evidence are reported in separate sections and never combined into one mean.
- PO rows carry distribution by exact scale identity, valid and excluded counts, full-precision mean, two-decimal display mean, interpretation, CQI classification, and evaluation provenance.
- Classification comes from `PO.classification` (Common, Core, Professional, Institution-specific, or the migration-only `Needs classification` default), never from the PO code.
- Persisted legacy codes such as `BSIT-GO1` are printed unchanged.
- Program-wide rows are separated by respondent category: central student respondents, alumni, industry partners.
- Incompatible scales, unsupported scales, and rows with no evidence print their unclassified status; no combined mean or attainment label is invented.
- The current-mapping disclosure is printed verbatim on every sheet that groups historical course evidence.

## 3. Raw quantitative CSV

One row per original submitted quantitative answer item, deterministic order, stable headers (39 columns, in this order):

```
period_school_year
period_semester
period_term
period_label
program_code
program_name
year_level
evidence_source
respondent_category
deployment_type
deployment_id
deployment_name
deployment_status
course_code
course_title
course_assignment_id
faculty_name
section
instrument_name
instrument_version
cilo_code
cilo_description
po_codes
po_descriptions
po_classifications
manifestations
direct_po_codes
direct_po_descriptions
direct_po_classifications
question_section_key
question_item_key
question_prompt
scale_label
rating_value
rating_descriptor
respondent_name
respondent_id
response_id
submitted_at
```

Notes:

- Comma, quote, and newline characters are escaped; a leading `=`, `+`, `-`, or `@` is neutralized so a value can never execute as a spreadsheet formula.
- **This is an identified export.** `respondent_name` carries the respondent's account name, and `respondent_id` and `response_id` are stable internal identifiers carried so rows can be matched and deduplicated without merging two people who share a name. No account email, student number, or other identifier is exported, and no qualitative comment is ever exported.
- Program-wide rows have no course, faculty, section, or CILO columns: a Central deployment carries no course context and binds Program Outcomes directly.
- Question text is exported as the frozen publication snapshot prompt; `rating_descriptor` is the label that snapshot gives the answered value.

## Unresolved institutional requirements

1. **Identified export approval.** The Privacy Notice expects ordinary reports to omit respondent identity. Downloadable identified responses need a recorded institutional decision on the privacy basis, the respondent notice wording, retention, and the approved recipient list.
2. **Institutional layout approval.** The columns above are a representative sample. Program Heads may need additional accreditation columns (e.g. curriculum reference, term of assessment, action taken) before this becomes the college template.
3. **General Education coverage.** Program Head reports currently exclude General Education Course-bound evidence (ADR 0034). Any General Education inclusion needs its own access and reporting contract.
