---
title: Deployment and Handover Evidence
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Deployment and Handover Evidence

Skeleton adjacent to [Appendix F](../guide/appendix-f-requirements-traceability-matrix-template.md) (deployment/handover evidence row) and [Appendix H](../guide/appendix-h-revision-compliance-form.md) (final-clearance conditions), supporting manuscript Chapter 5 §5.6 ([manuscript/05-implementation-evaluation-and-outcomes.md](../manuscript/05-implementation-evaluation-and-outcomes.md)). Deployment facts already documented in the repo are linked below; handover artifacts and stakeholder acceptance are **pending** and must not be asserted before they exist.

## Deployment evidence (existing, linked)

| Item                                                                                                                                              | Evidence source                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated demo deployment contract (operator runbook: scope/safety, auth modes, environment contract, provision/reset, rollback, evidence limits) | [docs/runbooks/dedicated-demo-deployment.md](../../runbooks/dedicated-demo-deployment.md); design decision in [docs/adr/0008-dedicated-demo-deployment-authentication.md](../../adr/0008-dedicated-demo-deployment-authentication.md) |
| Deployment inventory (host, Coolify, Supabase, Cloudflare tunnel, secrets, backups, verification, outstanding operational readiness)              | [docs/operations/deployment-inventory.md](../../operations/deployment-inventory.md) (last verified 2026-08-31 in that file)                                                                                                           |
| Deployment architecture (runtime topology, target-neutral backend contract)                                                                       | [docs/architecture/deployment.md](../../architecture/deployment.md); [docs/adr/0020-self-hosted-supabase-target-neutral-backends.md](../../adr/0020-self-hosted-supabase-target-neutral-backends.md)                                  |
| Production build/auth boundary discipline for any accepted evidence                                                                               | [docs/testing/production-browser-evidence.md](../../testing/production-browser-evidence.md)                                                                                                                                           |

## Institutional turnover policy (official source, linked)

The institutional policy governing development, review, and turnover of information systems for institutional use — System CLOIE's handover must satisfy its System Turnover requirements (complete code, database schema and scripts, architecture diagram, user manual, administrator guide, credentials, backup/restore procedures, dependency/license list) and its hosting/maintenance rules: [docs/institutional/isdrt-policy.md](../../institutional/isdrt-policy.md).

## Handover checklist (pending)

| Item (per ISDRT turnover list)                 | Artifact                                                                                                                                                | Status                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Complete and updated code                      | repository (this repo)                                                                                                                                  | pending formal turnover                                               |
| Database schema and related scripts            | [prisma/schema.prisma](../../../prisma/schema.prisma), [prisma/models/](../../../prisma/models/), [supabase/migrations/](../../../supabase/migrations/) | pending formal turnover                                               |
| System architecture diagram / documentation    | [docs/architecture/deployment.md](../../architecture/deployment.md), [CONTEXT-MAP.md](../../../CONTEXT-MAP.md)                                          | pending formal turnover                                               |
| User manual                                    | pending — not yet produced                                                                                                                              | pending                                                               |
| Administrator Guide / System Playbook          | pending — not yet produced                                                                                                                              | pending                                                               |
| Administrative and database access credentials | never committed; transferred out-of-band per [docs/operations/deployment-inventory.md](../../operations/deployment-inventory.md)                        | pending formal turnover                                               |
| Backup and restore procedures                  | [docs/operations/deployment-inventory.md](../../operations/deployment-inventory.md) (Backups; outstanding-readiness notes)                              | pending (recurring backup schedule noted as outstanding in that file) |
| Software dependencies and licenses             | [package.json](../../../package.json)                                                                                                                   | pending formal turnover                                               |
| ICTC review/validation per ISDRT policy        | [docs/institutional/isdrt-policy.md](../../institutional/isdrt-policy.md)                                                                               | pending                                                               |

## Client / stakeholder acceptance (pending)

Per the official guide's appendix list ("Client/stakeholder acceptance, turnover, or deployment documentation") — [official guide](../guide/technical-document-guide-2026.md). No acceptance, turnover, or deployment acceptance document exists yet; names, signatures, and dates are **pending** and must not be fabricated.
