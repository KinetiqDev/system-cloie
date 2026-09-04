---
title: System CLOIE Institutional Handover — ISDRT Policy Interpretation
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# System CLOIE institutional handover — ISDRT policy interpretation

This document interprets the Assumption College of Davao policy [ISDRT Policy on Institutional Information Systems](../institutional/isdrt-policy.md) for System CLOIE, the college-wide outcome-based education evaluation platform developed in this repository.

It is an interpretation and working record only. The authoritative policy is the transcription at [../institutional/isdrt-policy.md](../institutional/isdrt-policy.md), converted faithfully from `ISDRT Policy_Long.docx` (permanent copy in [../assets/source-docs/institutional/](../assets/source-docs/institutional/), working copy in [../\_sources/institutional/](../_sources/institutional/)). Where this document and the policy disagree, the policy governs; conflicts are surfaced here, never silently reconciled.

Per the policy's section XI (Effectivity), the policy takes effect upon approval; the transcription includes the signature block (prepared by the ICTC Supervisor, approved by the ACD President) but the source states no effective date.

## Source-document notes

- **Forms are pending.** No converted institutional forms document exists in the repository, and no forms source document (routing, endorsement, originality check, or similar) has been supplied. Nothing has been fabricated. The canonical split targets are reserved for future conversion, starting with `../institutional/forms/routing-form.md` and sibling form pages under `../institutional/forms/`, once the source `.docx` files are available.
- **ACD programs prospectus.** `../_sources/institutional/ACD_Programs_Prospectus.xlsx` is held as a reference source. It is intentionally not converted; the `.xlsx` is left as-is.
- **Heading anomaly in the source.** The policy's roles-and-responsibilities section is typed "IV. GUIDELINES AND PROCEDURES", duplicating the earlier "VII. GUIDELINES AND PROCEDURES"; it appears to be a numbering typo for VIII. The transcription preserves the source verbatim, as required.

## Policy obligation mapping

Statuses: **Supported** (repository evidence exists today), **Partial** (some evidence; named gaps), **Pending** (no repository evidence; open obligation). Evidence links are to repository files verified on 2026-09-04 unless noted.

### System turnover — policy §VII.4

Before deployment, the developer must formally turn over the completed system to the ICTC with the listed artifacts.

| Required artifact                              | System CLOIE practice                                                                                                                    | Evidence                                                                                       | Status                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| Complete and updated code                      | The repository itself is the turnover artifact, maintained in git on `main`                                                              | Repository `KinetiqDev/system-cloie`                                                           | Supported                      |
| System architecture diagram                    | No consolidated diagram; architectural decisions are recorded as ADRs                                                                    | `../adr/` (21 ADRs)                                                                            | Pending (consolidated diagram) |
| User manual                                    | No end-user documentation exists in the repository                                                                                       | —                                                                                              | Pending                        |
| Administrator Guide or System Playbook         | Deployment, secrets, migrations, backups, and rollback are documented operator-side, though not packaged as a formal administrator guide | `../deployment-coolify.md`, [deployment-inventory.md](deployment-inventory.md), `../runbooks/` | Partial                        |
| Administrative and database access credentials | Secrets are configured in Coolify/Supabase and intentionally absent from git; encrypted recovery custody is not yet established          | [deployment-inventory.md](deployment-inventory.md), "Secrets" section                          | Partial                        |
| Backup and restore procedures                  | Initial backups exist and passed readability checks, but automation, off-server copies, and a restore drill are outstanding              | [deployment-inventory.md](deployment-inventory.md), "Backups" section                          | Partial                        |
| List of software dependencies and licenses     | Dependencies are pinned via the pnpm lockfile; a license inventory has not been compiled                                                 | `package.json`, `pnpm-lock.yaml`                                                               | Partial                        |

Final validation testing before turnover maps to the repository's verification practice: narrowest-relevant verification first, CI on GitHub Actions, and the production build verified at initial deployment (see `AGENTS.md`, "Verification" and "Continuous Integration"; [deployment-inventory.md](deployment-inventory.md), "Verification").

### Hosting and maintenance — policy §VII.5 and §VI.4

The policy requires approved systems to be "hosted on ICTC – managed servers or on officially authorized cloud infrastructure approved by the ICTC" and assigns hosting, monitoring, patching, backups, support, and archiving to the ICTC upon acceptance.

System CLOIE is currently hosted on a private Ubuntu host (`home-lab`) operated by the repository owner, deployed through Coolify with a Cloudflare Tunnel and self-hosted Supabase. This satisfies the engineering substance of the obligation — documented hosting, monitoring paths, a pinned Supabase release, and operator runbooks — but it is **not** ICTC-managed infrastructure, and the repository holds no record of ICTC written clearance. Per the policy, "No system shall be deployed on external platforms or independent servers without prior written clearance." This is surfaced as an open institutional obligation, not reconciled away.

Evidence: [deployment-inventory.md](deployment-inventory.md) (host, Coolify, Supabase, Cloudflare, backups), `../deployment-coolify.md` (deployment runbook), [ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md) (self-hosted Supabase only, target-neutral backends), [ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md) and the [dedicated demo runbook](../runbooks/dedicated-demo-deployment.md) (isolated demo deployment discipline).

**Status: Partial — operations documented and running; ICTC hosting authorization pending.**

### Documentation and inventory registration — policy §VII.6

The policy requires every approved system to be recorded in the ICTC System Registry with system title, responsible unit, approval date, hosting location, and assigned ICTC personnel.

The repository maintains its side of this record: system identity and ownership in `AGENTS.md` ("Project Overview", "Product Naming"), hosting location and operational state in [deployment-inventory.md](deployment-inventory.md), and decision history in `../adr/`. There is no evidence that System CLOIE has been entered into the ICTC System Registry, and no assigned ICTC personnel are recorded anywhere in the repository.

**Status: Partial — repository-side documentation maintained; ICTC registry entry pending.**

### Prior approval and evaluation — policy §VII.1–VII.2 and §VI.1–VI.3

The policy requires a formal system proposal to the ICTC before development, a comprehensive technical and compliance evaluation, and written confirmation before development or deployment proceeds.

The repository contains no proposal, evaluation record, or written ICTC approval for System CLOIE. The development practice that would feed such an evaluation is well documented — architectural decisions in `../adr/`, engineering standards in `AGENTS.md`, static-analysis policy in [ADR 0011](../adr/0011-fallow-code-intelligence-policy.md) — but the institutional approval chain itself is an open obligation.

**Status: Pending.**

### Development collaboration — policy §VII.3

Once approval is granted, the ICTC may designate a technical liaison to coordinate with the developer and monitor compliance with coding, database, and security standards.

No ICTC liaison is recorded. Standards adherence is currently governed from the repository side: `AGENTS.md` ("Core Engineering Principles", "Architecture", "Supabase and Prisma") and CI, with human-in-the-loop review artifacts such as [issue #45 sign-off](../reviews/issue-45-hitl-signoff.md) establishing a precedent for recorded review.

**Status: Pending (liaison designation); standards practice Supported.**

### Roles and responsibilities — policy section typed "IV."

The policy defines responsibilities for the ICTC, the ICTC Head, the concerned office or unit head, the developer, and end users. System CLOIE's developer-side obligations (adhere to standards, provide complete documentation, comply with turnover requirements) are the subject of the mapping above. The ICTC-side roles and the endorsing unit head have no repository counterpart and are pending institutional action.

### Review and sustainability — policy §IX and §X

The policy is subject to review every two years, and the institution expects sustainable ownership beyond individual developers. On the repository side, this interpretation follows the repository's living-document convention: every claim here carries a `last_verified` date (2026-09-04) and operational state is re-verified in [deployment-inventory.md](deployment-inventory.md) (last verified 2026-08-31). Scheduling the institutional biennial review and confirming continued ownership are pending.

## Pending checklist

Institutional and operational obligations not yet satisfied, with the repository evidence that must change when they are:

- [ ] Submit the formal system proposal to the ICTC and obtain written approval (policy §VII.1–VII.2, §VI.1–VI.2). No repository evidence exists.
- [ ] Obtain ICTC written clearance for the current hosting arrangement, or migrate to ICTC-managed infrastructure (policy §VII.5, §VI.4). Update [deployment-inventory.md](deployment-inventory.md) when resolved.
- [ ] Obtain ICTC liaison designation for the development phase (policy §VII.3).
- [ ] Compile the turnover artifact set: consolidated architecture diagram, user manual, and a packaged Administrator Guide (policy §VII.4). ADRs and runbooks are the raw material.
- [ ] Establish encrypted recovery custody for runtime secrets (policy §VII.4, credentials). Tracked in [deployment-inventory.md](deployment-inventory.md), "Outstanding operational readiness".
- [ ] Automate backups, add an off-server copy, and run a recorded restore drill (policy §VII.4, §VII.5). Tracked in [deployment-inventory.md](deployment-inventory.md).
- [ ] Compile a dependency license inventory (policy §VII.4).
- [ ] Register System CLOIE in the ICTC System Registry: title, responsible unit, approval date, hosting location, assigned ICTC personnel (policy §VII.6).
- [ ] Convert institutional forms to `../institutional/forms/` (starting with `routing-form.md`) once source documents are supplied.
- [ ] Schedule the biennial policy review with the ICTC and the Director for Administration (policy §X).
