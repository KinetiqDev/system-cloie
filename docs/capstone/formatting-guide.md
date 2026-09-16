---
title: System CLOIE Manuscript Formatting Guide
kind: living-project-document
status: living
last_verified: 2026-09-16
---

# System CLOIE Technical Document Formatting Guide

This guide translates the [Capstone Project Technical Document Guide 2026](guide/technical-document-guide-2026.md) into a practical Google Docs setup for the System CLOIE manuscript. Where the College guide gives an explicit rule, it is marked **Official**. Where the guide is silent, the value below is a **System CLOIE convention** chosen for consistency and readability.

## 1. Page and manuscript setup

| Item                   | Setting                                | Basis                                                           |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Paper size             | Letter, 8.5 × 11 in                    | Official                                                        |
| Margins                | 1 in on all sides                      | Official                                                        |
| Font                   | Times New Roman                        | System CLOIE choice allowed by guide                            |
| Body font size         | 12 pt                                  | Official                                                        |
| Body alignment         | Justified                              | Official option, used consistently for System CLOIE             |
| Body line spacing      | 1.5                                    | Official                                                        |
| Body paragraph spacing | 0 pt before, 6 pt after                | System CLOIE convention                                         |
| First-line indent      | None by default                        | System CLOIE convention; guide says avoid excessive indentation |
| Paragraph separation   | Use paragraph spacing, not blank lines | Official                                                        |

## 2. Google Docs heading hierarchy

Use Google Docs heading styles so the document outline and automatic table of contents follow the manuscript structure.

| Google Docs style | Use                              | Font            |  Size | Weight      | Alignment | Line spacing | Before | After |
| ----------------- | -------------------------------- | --------------- | ----: | ----------- | --------- | -----------: | -----: | ----: |
| Heading 1         | Chapter title                    | Times New Roman | 12 pt | Bold        | Center    |         1.15 |   0 pt | 12 pt |
| Heading 2         | Main section, e.g. `4.1`         | Times New Roman | 12 pt | Bold        | Left      |         1.15 |  12 pt |  6 pt |
| Heading 3         | Subsection, e.g. `4.1.1`         | Times New Roman | 12 pt | Bold        | Left      |         1.15 |  10 pt |  4 pt |
| Heading 4         | Lower subsection, e.g. `4.1.1.1` | Times New Roman | 12 pt | Bold italic | Left      |         1.15 |   8 pt |  4 pt |
| Heading 5         | Rare deeper subsection           | Times New Roman | 12 pt | Bold italic | Left      |         1.15 |   6 pt |  3 pt |
| Normal text       | Body paragraphs                  | Times New Roman | 12 pt | Regular     | Justified |          1.5 |   0 pt |  6 pt |

The College guide requires a numbered hierarchical heading system and advises against unnecessary levels. The exact heading weights and point spacing above are System CLOIE conventions because the guide does not prescribe them.

### Chapter title format

Use one Heading 1 block:

```text
CHAPTER 4
REQUIREMENTS AND SYSTEM DESIGN
```

Use uppercase, bold, centered text. Do not insert a blank line between the chapter number and chapter name. Start the first section after the Heading 1 paragraph spacing.

## 3. Lists

Use **numbered lists** when order, sequence, priority, or steps matter. Use **bulleted lists** when order does not matter.

- Font: Times New Roman, 12 pt
- Alignment: left
- Line spacing: 1.5 for ordinary lists
- Do not insert blank lines between every item
- Use a standard hanging indent consistently
- Long technical entries may use single spacing when readability requires it
- Formal requirements should use stable IDs such as `FR-01`, `NFR-01`, `SEC-01`, or `DR-01` rather than generic bullets

## 4. Tables

- Times New Roman, normally 12 pt; reduce only when necessary for a readable table
- Single-spaced
- Table title goes **above** the table
- Number tables consistently by chapter or throughout the manuscript
- Discuss every table in the surrounding text
- Cite the source if the table is adapted
- Keep header wording short and clear
- Do not shrink text excessively to force a wide table onto one page

Example:

```text
Table 4.1
System CLOIE Functional Requirements Summary
```

## 5. Figures and diagrams

- Figure caption goes **below** the figure
- Number figures consistently by chapter or throughout the manuscript
- Discuss every figure in the surrounding text
- Cite the source if adapted
- Design figures to remain readable within the approximately 6.5 in usable portrait width
- Prefer simple text, boxes, lines, and standard notation over decorative icons
- Use restrained color and ensure the figure still works in grayscale
- Keep figure text readable at final print size, preferably around 9 to 10 pt
- Use detailed diagrams only when they improve technical understanding; move excessive detail to the appendices

Example:

```text
Figure 4.3. System CLOIE Solution Architecture
```

## 6. Captions and long technical entries

Tables, figure captions, references, and long technical entries use **single spacing** under the College guide. Keep the same Times New Roman family throughout the manuscript.

For captions, use a consistent 12 pt treatment unless space requires a modest reduction. Do not use decorative styling.

## 7. References and citations

- Citation style: APA 7th edition unless the College adopts another official style
- Use one consolidated `REFERENCES` section for sources cited in the manuscript
- Reference entries: Times New Roman, 12 pt, single-spaced
- Use APA 7 hanging indentation for each reference entry
- Include only sources actually cited in the manuscript
- Use a reference manager when practical

The current System CLOIE manuscript places `REFERENCES` after Chapter 5 and before Chapter 6 Appendices. The College guide requires APA 7 but does not explicitly prescribe the placement of the full manuscript reference list.

## 8. Page numbering and preliminary pages

- Title page: no displayed page number
- Preliminary pages: lowercase Roman numerals
- Chapter 1 onward: Arabic numerals
- Generate the Table of Contents, List of Figures, and List of Tables automatically where possible

Recommended preliminary pages from the guide are:

Title Page; Approval/Endorsement Sheet; Acknowledgment when used; Abstract; Table of Contents; List of Figures; List of Tables; and List of Abbreviations/Acronyms when needed.

## 9. Appendices

Chapter 6 contains supporting evidence. Use appendix material for detailed artifacts that would interrupt the main technical narrative, including detailed requirements, test records, large schemas, API references, deployment procedures, and administrative evidence.

Keep appendix formatting consistent with the main manuscript unless an official appendix form already has its own layout. **Do not reformat official Appendix F, G, or H forms in a way that changes their required structure.**

For custom appendix content:

- Times New Roman, 12 pt by default
- 1.5 spacing for prose
- Single spacing for tables, forms, technical entries, captions, and reference-like material
- Use the appendix letter as the identifier root and decimal numbering for sections beneath it
- Format the top-level appendix title as `APPENDIX E: Technical and operational reference`
- Format first-level appendix sections as `Appendix E.1: <description>`, `Appendix E.2: <description>`, and so on
- Format deeper subsections as `E.1.1: <description>`, `E.1.2: <description>`, `E.2.1: <description>`, and so on
- Continue the same decimal hierarchy only when another level is genuinely needed
- Prefer selected evidence over printing large volumes of repository output or source code

Example:

```text
APPENDIX E: Technical and operational reference

Appendix E.1: Database schema and data dictionary
E.1.1: Core academic entities
E.1.2: Evaluation and response entities

Appendix E.2: API and integration reference
E.2.1: Authentication integrations
E.2.2: External service integrations
```

## 10. Writing and consistency rules

Use concise technical prose. Explain project-specific decisions and evidence. Avoid unsupported claims, generic filler, long textbook definitions, and diagrams included only because a template appears to expect them.

Apply the same formatting rules throughout the manuscript. Do not use manual blank lines, manual spaces, or repeated tabs to create layout. Use Google Docs paragraph spacing, heading styles, page breaks, tables, and automatic document features instead.

## Source authority

The authoritative formatting source is the [Capstone Project Technical Document Guide 2026](guide/technical-document-guide-2026.md). When this local System CLOIE convention conflicts with a later College, adviser, panel, or official appendix instruction, follow the newer official instruction.
