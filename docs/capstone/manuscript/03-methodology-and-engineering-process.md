---
title: Chapter 3 — Project Methodology and Engineering Process
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Chapter 3 — Project Methodology and Engineering Process

## What this chapter must demonstrate

Per the [official guide, Chapter 3](../guide/technical-document-guide-2026.md): explain and provide evidence of how the team planned, elicited requirements, developed, secured, tested, managed, and iteratively improved the capstone. The chapter must document the actual engineering process used — not reproduce a textbook methodology description; a methodology diagram alone is insufficient. System CLOIE's development process is already operationalized in the repository, so much of this chapter can be evidenced directly from the engineering docs linked below. Do not copy guide text; do not import claims from obsolete manuscript drafts.

## 3.1 Development Approach and Lifecycle

[To be drafted — see guide section 3.1](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Iterative, vertical-slice delivery with dependency-ordered slices and bounded GitHub issues as units of work: [AGENTS.md](../../../AGENTS.md) (Implementation Slices, Agent Workflow)
- Issue tracking conventions: [docs/agents/issue-tracker.md](../../agents/issue-tracker.md)
- Fallow code-intelligence policy (static analysis as evidence for iteration decisions): [docs/adr/0011-fallow-code-intelligence-policy.md](../../adr/0011-fallow-code-intelligence-policy.md)

## 3.2 Requirements Engineering and Stakeholder Engagement

[To be drafted — see guide section 3.2](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Requirements were resolved into domain terminology and invariants recorded per bounded context; the process output is [CONTEXT-MAP.md](../../../CONTEXT-MAP.md) and the `src/features/<domain>/CONTEXT.md` files it indexes
- Durable architectural decisions with rationale: [docs/adr/](../../adr/) (21 ADRs; every entry records context, decision, considered options, consequences)
- Stakeholder decision log: [docs/capstone/evidence/stakeholder-decisions.md](../evidence/stakeholder-decisions.md)
- Traceability practice: [docs/capstone/evidence/requirements-traceability.md](../evidence/requirements-traceability.md)

## 3.3 Development Workflow, Collaboration and Configuration Management

[To be drafted — see guide section 3.3](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Repository conventions (pnpm, Conventional Commits, focused commits, verification commands): [AGENTS.md](../../../AGENTS.md), [docs/cloie-techstack.md](../../cloie-techstack.md)
- CI quality gates (risk-selected lint/test/build, database-integration, browser-e2e): [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)
- Code-intelligence workflow for large-change navigation: [docs/agents/fallow.md](../../agents/fallow.md)

## 3.4 Secure and Responsible Development

[To be drafted — see guide section 3.4](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Security practices enforced in-process (server-side session validation, role/scope checks, Zod validation, confidential-response protection, one-response enforcement, immutable finalized submissions): [docs/cloie-techstack.md](../../cloie-techstack.md)
- Server-side bounded AI interpretation boundary (human oversight, disabled-by-default gating): [docs/adr/0016-server-side-bounded-ai-interpretation-boundary.md](../../adr/0016-server-side-bounded-ai-interpretation-boundary.md)
- Environment/secrets discipline and disposable-database separation for tests and demo evidence: [docs/testing/production-browser-evidence.md](../../testing/production-browser-evidence.md)
- Institutional policy context for responsible computing: [docs/institutional/isdrt-policy.md](../../institutional/isdrt-policy.md)

## 3.5 Verification, Validation and Testing Strategy

[To be drafted — see guide section 3.5](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- The testing strategy is defined and executed in the repo; the chapter should summarize and cite rather than restate: [docs/capstone/evidence/testing-validation.md](../evidence/testing-validation.md) is the evidence skeleton aligned to Appendix G
- Layered verification commands and gated DB invariant suites: [README.md](../../../README.md)

## 3.6 Project Management, Risks and Milestones

[To be drafted — see guide section 3.6](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- GitHub issues as bounded implementation units with approved requirements/acceptance criteria treated as binding: [AGENTS.md](../../../AGENTS.md)
- Triage and label conventions: [docs/agents/triage-labels.md](../../agents/triage-labels.md)
- Risk/milestone summary to be drafted from actual issue and release history — pending; no values may be fabricated.

## 3.7 Feasibility and Sustainability (as applicable)

[To be drafted — see guide section 3.7](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Operational sustainability context: self-hosted, target-neutral backend design and deployment inventory: [docs/adr/0020-self-hosted-supabase-target-neutral-backends.md](../../adr/0020-self-hosted-supabase-target-neutral-backends.md), [docs/operations/deployment-inventory.md](../../operations/deployment-inventory.md)
- Include only considerations that materially affect the project; cost-benefit analysis only if financial feasibility is a genuine project decision (per guide §3.7).
