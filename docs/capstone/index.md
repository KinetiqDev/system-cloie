---
title: Capstone Documentation Index
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Capstone Documentation Index

Persistent repository knowledge for the BSIT Capstone Project (System CLOIE). Markdown is canonical; all links are relative.

## Roles of the three directories

| Directory | Role | Nature |
| ----- | ----- | ----- |
| [guide/](guide/) | **Official reference.** Faithful transcriptions of the institution-issued capstone documents: the [Technical Document Guide (2026)](guide/technical-document-guide-2026.md) and its appendices — [F: Requirements Traceability Matrix template](guide/appendix-f-requirements-traceability-matrix-template.md), [G: Simplified Testing and User Validation forms](guide/appendix-g-simplified-testing-user-validation.md), [H: Revision Compliance form](guide/appendix-h-revision-compliance-form.md). | Authoritative reference; never edited to match the project — the project conforms to it. |
| [manuscript/](manuscript/) | **The technical document being written.** One living scaffold per guide chapter, each with the guide's requirement for that chapter, a section skeleton mirroring the guide's subsections, and working notes linking real repository evidence. | Living project document; drafted and revised as work completes. |
| [evidence/](evidence/) | **Traceable proof.** Structured evidence records (RTM, testing/validation, revision compliance, stakeholder decisions, deployment/handover) aligned to the guide's appendix structure, each linking to real artifacts in the repository. | Living project document; entries appear only with verifiable sources. |

## Files

### Manuscript (chapters, mirroring the guide's structure)

1. [01-project-context-and-definition.md](manuscript/01-project-context-and-definition.md) — guide Chapter 1 (§§1.1–1.7)
2. [02-related-literature-technologies-and-systems.md](manuscript/02-related-literature-technologies-and-systems.md) — guide Chapter 2 (§§2.1–2.3)
3. [03-methodology-and-engineering-process.md](manuscript/03-methodology-and-engineering-process.md) — guide Chapter 3 (§§3.1–3.7)
4. [04-requirements-and-system-design.md](manuscript/04-requirements-and-system-design.md) — guide Chapter 4 (§§4.1–4.9)
5. [05-implementation-evaluation-and-outcomes.md](manuscript/05-implementation-evaluation-and-outcomes.md) — guide Chapter 5 (§§5.1–5.7)

Abstract guidance lives in the [official guide](guide/technical-document-guide-2026.md) (200–300 words, single paragraph, three to five keywords; reflects the completed project, not the proposed work). The Abstract is written last, after Chapters 1–5 have content.

### Evidence (appendix-aligned records)

- [requirements-traceability.md](evidence/requirements-traceability.md) — RTM per Appendix F, with ID-stability policy and provenance rules
- [testing-validation.md](evidence/testing-validation.md) — per Appendix G: automated layers (Vitest, gated DB invariants, Playwright E2E incl. mobile Pixel 7, production browser evidence) plus G-1–G-4 records
- [revision-compliance.md](evidence/revision-compliance.md) — per Appendix H: defense-stage revision log (Title / Outline / Pre-Final / Final)
- [stakeholder-decisions.md](evidence/stakeholder-decisions.md) — stakeholder decisions traceable to current CONTEXT.md / ADRs
- [deployment-handover.md](evidence/deployment-handover.md) — deployment evidence links and the ISDRT-policy handover checklist

## No-fabrication rule

Every claim, value, count, date, version, signature, and approval recorded under evidence/ (and later in the manuscript) must come from a real, linked repository artifact or an actual executed activity. Missing items are marked **pending** — never estimated, projected, or filled in to look complete. The RTM may not mark a requirement `Verified / Passed` without linked test evidence; Appendix G/H records may not contain participant counts, dates, or signatures for activities that have not occurred. Evidence fills in as work completes: an empty section means not-yet-done, not forgotten.

## Related documentation

- Current domain knowledge: [CONTEXT-MAP.md](../../CONTEXT-MAP.md), [src/features/<domain>/CONTEXT.md](../../src/features/), [docs/adr/](../adr/)
- Historical project material (legacy requirements, meetings, the May-2026 manuscript): [docs/history/](../history/) — kept separate so obsolete claims are never mistaken for current ones
- Official institutional references: [docs/institutional/](../institutional/)
