---
title: System CLOIE Documentation Index
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Documentation Index

Front door for System CLOIE documentation. Orientation starts at [AGENTS.md](../AGENTS.md) (project overview, engineering principles, reference chain). Domain discovery uses [CONTEXT-MAP.md](../CONTEXT-MAP.md). Agent navigation rules: [docs/agents/knowledge-base.md](agents/knowledge-base.md). All links are relative Markdown; see [tooling/obsidian.md](tooling/obsidian.md) for vault conventions.

## Current Domain Contracts

One `CONTEXT.md` per bounded domain, indexed with relationships in [CONTEXT-MAP.md](../CONTEXT-MAP.md):

[auth](../src/features/auth/CONTEXT.md) · [users](../src/features/users/CONTEXT.md) · [academic-calendar](../src/features/academic-calendar/CONTEXT.md) · [academic-structure](../src/features/academic-structure/CONTEXT.md) · [curriculum](../src/features/curriculum/CONTEXT.md) · [course-assignments](../src/features/course-assignments/CONTEXT.md) · [outcomes](../src/features/outcomes/CONTEXT.md) · [instruments](../src/features/instruments/CONTEXT.md) · [evaluations](../src/features/evaluations/CONTEXT.md) · [responses](../src/features/responses/CONTEXT.md) · [response-review](../src/features/response-review/CONTEXT.md) · [analytics](../src/features/analytics/CONTEXT.md) · [enrollments](../src/features/enrollments/CONTEXT.md) · [dean](../src/features/dean/CONTEXT.md) · [legal](../src/features/legal/CONTEXT.md) · [design-system](../src/features/design-system/CONTEXT.md)

## Durable Decisions

[docs/adr/](adr/) — 21 numbered ADRs. Read before any architecture change; index table in [architecture/overview.md](architecture/overview.md).

## Product

- [overview.md](product/overview.md) — what System CLOIE is and is not; domain map; system boundary.
- [roles-and-access.md](product/roles-and-access.md) — role inventory and scope highlights.
- [workflows.md](product/workflows.md) — primary end-to-end workflows.
- [system-cloie-user-journeys.md](system-cloie-user-journeys.md) — detailed journey walkthroughs.

## Architecture

- [overview.md](architecture/overview.md) — modular monolith, rendering rules, CI gates, ADR index.
- [data-and-storage.md](architecture/data-and-storage.md) — Prisma schema organization, migrations, caching policy.
- [auth-and-authorization.md](architecture/auth-and-authorization.md) — OAuth flow, role scoping, server-enforced authorization.
- [deployment.md](architecture/deployment.md) — Coolify/self-hosted Supabase, demo separation, CI environments.
- [cloie-techstack.md](cloie-techstack.md) — verified dependency versions and pointers to stack rules.

## Operations and Runbooks

- [operations/deployment-inventory.md](operations/deployment-inventory.md)
- [operations/institutional-handover.md](operations/institutional-handover.md) — ISDRT policy interpreted for System CLOIE.
- [runbooks/](runbooks/) — dedicated demo deployment, appearance production activation.
- [deployment-coolify.md](deployment-coolify.md)
- [testing/production-browser-evidence.md](testing/production-browser-evidence.md)

## External Authoritative References

- Capstone guide: [capstone/guide/technical-document-guide-2026.md](capstone/guide/technical-document-guide-2026.md) + appendices F/G/H ([capstone/index.md](capstone/index.md)).
- Institutional policy: [institutional/isdrt-policy.md](institutional/isdrt-policy.md); institutional form conversions are pending (targets under `institutional/forms/`).

## Capstone Documentation

[capstone/index.md](capstone/index.md) — [manuscript/](capstone/manuscript/) chapter scaffolds and [evidence/](capstone/evidence/) (RTM, testing/validation, revision compliance, stakeholder decisions, deployment/handover). Evidence fills in only with verifiable sources; nothing is fabricated.

## Historical Material

[history/README.md](history/README.md) — index of historical project sources (retired proposals, migration report). Historical documents never describe current behavior.

## Agent Documentation

- [agents/knowledge-base.md](agents/knowledge-base.md) — source authority roles, conflict-handling protocol, maintenance workflow.
- [agents/domain.md](agents/domain.md), [agents/fallow.md](agents/fallow.md), [agents/issue-tracker.md](agents/issue-tracker.md) — existing agent runbooks.
- Project skills: [.agents/skills/cloie-knowledge/SKILL.md](../.agents/skills/cloie-knowledge/SKILL.md) (orientation), [.agents/skills/graphify/SKILL.md](../.agents/skills/graphify/SKILL.md).

## Tooling

- [tooling/graphify.md](tooling/graphify.md) — knowledge-graph commands and CLOIE query patterns.
- [tooling/obsidian.md](tooling/obsidian.md) — vault settings; Markdown stays canonical.
