---
title: Chapter 1 — Project Context and Definition
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Chapter 1 — Project Context and Definition

## What this chapter must demonstrate

Per the [official guide, Chapter 1](../guide/technical-document-guide-2026.md): establish the real problem or opportunity, the stakeholders affected, the intended IT intervention, and the boundaries and success targets of the capstone. The chapter must begin with the actual context rather than a generic discussion of "computerization," use baseline data / observations / interviews / records or credible external evidence where available, and define scope, exclusions, beneficiaries, success criteria, and project-specific terms. Content here must reflect the current state of System CLOIE — obsolete claims from earlier manuscript drafts are not carried over; repository evidence linked below is the source of truth.

## 1.1 Background and Problem Context

[To be drafted — see guide section 1.1](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Product overview and current description of System CLOIE: [docs/product/overview.md](../../product/overview.md)
- End-to-end user journeys across roles: [docs/system-cloie-user-journeys.md](../../system-cloie-user-journeys.md)
- Domain vocabulary and context boundaries: [CONTEXT-MAP.md](../../../CONTEXT-MAP.md)

## 1.2 Problem Statement

[To be drafted — see guide section 1.2](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Stakeholder evidence and problem baselines from the current product framing: [docs/product/overview.md](../../product/overview.md)
- Role-specific pain points surfaced in user journeys: [docs/system-cloie-user-journeys.md](../../system-cloie-user-journeys.md)

## 1.3 Project Objectives

[To be drafted — see guide section 1.3](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Objectives must trace to requirements; see the RTM skeleton: [docs/capstone/evidence/requirements-traceability.md](../evidence/requirements-traceability.md)
- Decisions already made with stakeholders (seeded from current CONTEXT.md / ADRs): [docs/capstone/evidence/stakeholder-decisions.md](../evidence/stakeholder-decisions.md)

## 1.4 Scope, Boundaries and Constraints

[To be drafted — see guide section 1.4](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- System-level product boundary ("not an LMS or SIS; does not deliver instruction, manage individual grades or transcripts, or replace enrollment systems"): [AGENTS.md](../../../AGENTS.md)
- Bounded contexts and their relationships: [CONTEXT-MAP.md](../../../CONTEXT-MAP.md)
- Stakeholder decisions on system boundary (in scope: response collection, analytics, evidence, reports; out of scope: curriculum revision decisions and academic decision-making): [docs/capstone/evidence/stakeholder-decisions.md](../evidence/stakeholder-decisions.md)
- Explicit "NOT automating curriculum revision decisions" scoping: [docs/adr/0013-versioned-curriculum-course-placement.md](../../adr/0013-versioned-curriculum-course-placement.md)

## 1.5 Significance and Intended Beneficiaries

[To be drafted — see guide section 1.5](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- User groups and their workflows: [docs/system-cloie-user-journeys.md](../../system-cloie-user-journeys.md)
- Role and access model: [docs/product/roles-and-access.md](../../product/roles-and-access.md)

## 1.6 Success Criteria / Expected Project Outcomes

[To be drafted — see guide section 1.6](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Success criteria must link to requirements, testing, and user acceptance; see: [docs/capstone/evidence/testing-validation.md](../evidence/testing-validation.md) and [docs/capstone/evidence/requirements-traceability.md](../evidence/requirements-traceability.md)
- Current verified testing infrastructure: [docs/cloie-techstack.md](../../cloie-techstack.md)

## 1.7 Definition of Terms

[To be drafted — see guide section 1.7](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Project-specific vocabulary is already canonically defined per domain; definitions must be drawn (not invented) from the CONTEXT.md files indexed by [CONTEXT-MAP.md](../../../CONTEXT-MAP.md)
- Definitions must use each domain's canonical terms and avoid the `_Avoid_` synonyms listed in those files
