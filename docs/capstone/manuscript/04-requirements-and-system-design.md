---
title: Chapter 4 — Requirements and System Design
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Chapter 4 — Requirements and System Design

## What this chapter must demonstrate

Per the [official guide, Chapter 4](../guide/technical-document-guide-2026.md): specify what the system must do and document the architecture and design decisions that enable the team to build, test, deploy, maintain, and secure it. Use models selectively — a diagram should answer a technical question, not exist merely because it appears in a template. Requirements must be prioritized with measurable quality requirements and acceptance criteria, and a Requirements Traceability Matrix must link objectives → requirements → design/components → test evidence. Do not copy guide text; do not import claims from obsolete manuscript drafts.

## 4.1 System Context and Stakeholders

[To be drafted — see guide section 4.1](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- System boundary and external actors: [CONTEXT-MAP.md](../../../CONTEXT-MAP.md) (contexts and relationships), [AGENTS.md](../../../AGENTS.md) (Project Overview: not an LMS/SIS)
- Stakeholder-facing roles and access: [docs/product/roles-and-access.md](../../product/roles-and-access.md)
- Stakeholder decisions on what is inside/outside the boundary: [docs/capstone/evidence/stakeholder-decisions.md](../evidence/stakeholder-decisions.md)

## 4.2 Requirements Specification

[To be drafted — see guide section 4.2](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Domain requirements are canonically stated as invariants per bounded context — start from [CONTEXT-MAP.md](../../../CONTEXT-MAP.md) and each `src/features/<domain>/CONTEXT.md`
- RTM skeleton with stable requirement IDs and provenance rules: [docs/capstone/evidence/requirements-traceability.md](../evidence/requirements-traceability.md)
- Schema-level requirements: [prisma/schema.prisma](../../../prisma/schema.prisma) with domain models under [prisma/models/](../../../prisma/models/)

## 4.3 Use Case / User Interaction Model

[To be drafted — see guide section 4.3](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Role-by-role interaction flows already documented end to end: [docs/system-cloie-user-journeys.md](../../system-cloie-user-journeys.md)
- Workflow-level documentation: [docs/product/workflows.md](../../product/workflows.md)

## 4.4 Solution Architecture

[To be drafted — see guide section 4.4](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Modular monolith under `src/features/<domain>/`, Server Components by default, server-enforced role/program/academic-context scoping: [AGENTS.md](../../../AGENTS.md) (Architecture section)
- Architecture decisions and trade-offs recorded as ADRs: [docs/adr/](../../adr/) — notably [0002-separate-domain-users-from-auth-identities.md](../../adr/0002-separate-domain-users-from-auth-identities.md), [0009-program-head-selected-program-context.md](../../adr/0009-program-head-selected-program-context.md), [0020-self-hosted-supabase-target-neutral-backends.md](../../adr/0020-self-hosted-supabase-target-neutral-backends.md)
- Stack reference: [docs/cloie-techstack.md](../../cloie-techstack.md)

## 4.5 Data Design

[To be drafted — see guide section 4.5](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Prisma models split by domain: [prisma/schema.prisma](../../../prisma/schema.prisma), [prisma/models/](../../../prisma/models/) (`responses.prisma`, `outcomes.prisma`, `evaluations-deployments.prisma`, `course-assignments.prisma`, `academic-calendar.prisma`, `academic-structure.prisma`, `curriculum.prisma`, `identity-access.prisma`, `instruments.prisma`)
- Data invariants and snapshot immutability semantics live in the domain CONTEXT.md files (e.g. [src/features/responses/CONTEXT.md](../../../src/features/responses/CONTEXT.md), [src/features/outcomes/CONTEXT.md](../../../src/features/outcomes/CONTEXT.md))
- Sensitive-data handling (confidential responses, restricted qualitative comments): [docs/cloie-techstack.md](../../cloie-techstack.md)

## 4.6 Component, API and Integration Design (as applicable)

[To be drafted — see guide section 4.6](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Feature services and server actions per domain under [src/features/](../../../src/features/) and [src/lib/actions/](../../../src/lib/actions/); entry-point and integration notes in [docs/cloie-techstack.md](../../cloie-techstack.md)
- Supabase Auth (Google OAuth) integration and request-entry seam (`src/proxy.ts`): [docs/cloie-techstack.md](../../cloie-techstack.md)
- Bounded AI integration boundary: [docs/adr/0016-server-side-bounded-ai-interpretation-boundary.md](../../adr/0016-server-side-bounded-ai-interpretation-boundary.md)

## 4.7 User Experience and Interface Design

[To be drafted — see guide section 4.7](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Design system with root semantic tokens, unified appearance preferences, and protected visual showcase: [src/features/design-system/CONTEXT.md](../../../src/features/design-system/CONTEXT.md), [docs/adr/0010-unified-appearance-and-protected-showcase.md](../../adr/0010-unified-appearance-and-protected-showcase.md)
- Mobile-first-class PWA experience rules: [AGENTS.md](../../../AGENTS.md) (PWA and Product Experience)
- Visual regression baselines: [playwright.config.ts](../../../playwright.config.ts) (`@visual` curated baseline), [e2e/visual-baseline.spec.ts](../../../e2e/visual-baseline.spec.ts)

## 4.8 Security and Privacy Design

[To be drafted — see guide section 4.8](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- AuthN/AuthZ design: single-role accounts ([docs/adr/0001-single-role-accounts.md](../../adr/0001-single-role-accounts.md)), domain users separated from auth identities ([docs/adr/0002-separate-domain-users-from-auth-identities.md](../../adr/0002-separate-domain-users-from-auth-identities.md)), Google-authoritative names ([docs/adr/0014-google-authoritative-account-names.md](../../adr/0014-google-authoritative-account-names.md))
- Legal gate: privacy/terms acknowledgement before role selection: [src/features/legal/CONTEXT.md](../../../src/features/legal/CONTEXT.md)
- Confidential-response and one-response invariants; cross-role privacy boundaries: [src/features/responses/CONTEXT.md](../../../src/features/responses/CONTEXT.md), [src/features/response-review/CONTEXT.md](../../../src/features/response-review/CONTEXT.md)
- Demo/production authentication separation: [docs/adr/0008-dedicated-demo-deployment-authentication.md](../../adr/0008-dedicated-demo-deployment-authentication.md)

## 4.9 Deployment / Infrastructure Design

[To be drafted — see guide section 4.9](../guide/technical-document-guide-2026.md)

### Working notes (from repository evidence)

- Deployment architecture document: [docs/architecture/deployment.md](../../architecture/deployment.md)
- Actual deployment inventory (Coolify host, Supabase, Cloudflare tunnel, backups): [docs/operations/deployment-inventory.md](../../operations/deployment-inventory.md)
- Dedicated demo deployment design and runbook: [docs/adr/0008-dedicated-demo-deployment-authentication.md](../../adr/0008-dedicated-demo-deployment-authentication.md), [docs/runbooks/dedicated-demo-deployment.md](../../runbooks/dedicated-demo-deployment.md)
- Target-neutral backend contract: [docs/adr/0020-self-hosted-supabase-target-neutral-backends.md](../../adr/0020-self-hosted-supabase-target-neutral-backends.md)
