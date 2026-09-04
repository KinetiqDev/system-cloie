---
title: Stakeholder Decision Log
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Stakeholder Decision Log

Skeleton for the stakeholder decisions and agreements that Chapter 1 (scope/boundaries) and the RTM's objective column must trace to. Entries are added **only** when a decision is verifiable from a current repository source (domain `CONTEXT.md`, ADR, or committed product documentation). **Pending integration note:** additional decisions are expected to surface from the historical-source workstream (docs/history/ — legacy requirements, meeting minutes, and the May-2026 manuscript); those will be integrated with their own source citations once that material lands. Nothing below is inferred from code alone.

## Seeded decisions (verifiable from current repository sources)

### SD-01 — System boundary

| Field | Value |
| :---- | :---- |
| **Decision** | System CLOIE's boundary includes response collection, analytics, evidence, and reports. Curriculum revision decision-making and academic decision-making are **outside** the boundary. |
| **Source (current)** | [AGENTS.md](../../../AGENTS.md) Project Overview ("System CLOIE is **not** an LMS or SIS. It does not deliver instruction, manage individual grades or transcripts, or replace enrollment systems."); [CONTEXT-MAP.md](../../../CONTEXT-MAP.md) bounded contexts (Curriculum documents placement; it does not decide revisions); [docs/adr/0013-versioned-curriculum-course-placement.md](../../adr/0013-versioned-curriculum-course-placement.md) ("The PRD and SRS explicitly scope CLOIE as NOT automating curriculum revision decisions — this is a catalog/documentation feature, not a rules engine."); [src/features/curriculum/CONTEXT.md](../../../src/features/curriculum/CONTEXT.md) ("curricula never auto-generate assignments or schedules"; placement authority only). |
| **Consequence for requirements** | Requirements asserting curriculum-revision automation or academic decision-making are out of scope; any appearing in legacy drafts must be recorded as rejected/deferred in the RTM change log, not silently dropped. |
| **Date recorded** | pending (stakeholder approval artifact pending) |

## Pending integration

- [ ] Integrate further stakeholder decisions surfaced from docs/history/ (legacy requirements documents, meeting minutes, the May-2026 manuscript) — each entry requires its own current-repo or transcribed-source citation before it is accepted here. **Pending** on the historical-source workstream.
- [ ] Record stakeholder approval artifacts (proposal letters, agreements) when available — per the official guide's appendix list ("Approved project proposal / letters / stakeholder agreements"): [official guide](../guide/technical-document-guide-2026.md). **Pending.**
