# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary operational audience** (confirmed): institutional admin/evaluator roles running college-wide OBE evaluation cycles — `SECRETARY`, `DEAN`, `PROGRAM_HEAD`, `FACULTY`, `GEN_ED_COORDINATOR`. They structure academic terms, own outcome catalogs, author instruments, deploy evaluations, review responses, and consume attainment analytics and reports.

**Respondent audience**: `STUDENT`, `ALUMNI`, `INDUSTRY_PARTNER`. Transient users who complete deployed evaluations; their submissions are the raw evidence that becomes attainment analytics. Alumni and industry partners are external stakeholders without institutional email accounts.

Every account holds exactly one active role. Production authentication is Google OAuth restricted to `@acd.edu.ph` / `@acdeducation.com`.

**Confirmed user characteristic:** users span all levels of technical literacy; many are not tech-savvy. The incumbent UX is experienced as confusing — usability across literacy levels is a standing product requirement, not a nicety.

## Product Purpose

System CLOIE ("Comprehensive Learning Outcomes and Instructional Evaluation") is Assumption College of Davao's college-level Outcome-Based Education evaluation, monitoring, analytics, and reporting platform. It manages academic structures and learning outcomes (ILO / PLO / CILO), supports stakeholder evaluations from students, alumni, and industry partners, and produces attainment analytics and evidence for quality assurance, accreditation, and continuous quality improvement. It is explicitly **not** an LMS, SIS, grading system, or transcript/enrollment replacement.

**Success means:**

- Credible, defensible attainment evidence for QA and accreditation.
- **Traceable analytics** (confirmed): every chart, mean, and figure must visibly connect back to the respondent answers that produced it. The chain from response → aggregation → presented analytics must be followable and visually coherent.
- Usable end-to-end by people with varying technical literacy, replacing the currently confusing UX with clear flows for every role.

## Positioning

A purpose-built, college-wide OBE attainment-evidence engine for ACD. The mechanism a neighboring product could not truthfully copy: the typed outcome chain (ILO/PLO/CILO with LEARNING/PRACTICE/OPPORTUNITY manifestations) → frozen instrument versions → gated evaluation deployments → one-response-per-respondent stakeholder evidence → deterministic attainment analytics with bounded AI interpretation. LMS and SIS products manage instruction and records; none produce this auditable attainment-evidence chain from multiple stakeholder populations.

## Operating Context

- **Academic structures:** school years / semesters / terms with an active period; programs and majors; versioned curricula; course catalog and class-section teaching assignments whose membership rosters are authoritative for evaluation scope.
- **Outcome catalogs:** ILO (college-wide, `GEN_ED_COORDINATOR`-owned), PLO (program-owned), CILO (course-level); typed alignment relations; readiness semantics per academic period.
- **Evaluation lifecycle:** instrument templates with immutable frozen versions; Course-bound and Central deployments; server-side publication alignment gate; roster exclusions and reversals; availability windows.
- **Responses:** one-response invariant per deployment; eligibility gating; section-scoped drafts; atomic submission completeness.
- **Review:** identified vs anonymized review flows over SUBMITTED responses only; identified respondent detail is Program-Head-only.
- **Analytics:** deterministic aggregates are the authoritative evidence surface; AI-assisted interpretation is supplementary, server-side, de-identified, bounded, never persisted (ADR 0016).
- **Reports:** formal institutional evidence output for QA/accreditation.
- **Environments (separate security boundaries):** Primary Production (OAuth-only), dedicated resettable demo deployment, local dev auth. Never cross them.
- **PWA:** installable app shell on desktop and mobile; offline data caching deferred by ADR 0006.

## Capabilities and Constraints

- Eight SystemRole values; single-active-role invariant; all authorization enforced server-side with role, program, course, and academic-context scoping.
- Auth today is Supabase Auth Google OAuth with SSR cookies only.
- **Explicitly undecided (future consideration, confirmed by stakeholder):** adding email/password or other-provider auth to serve external stakeholders (`ALUMNI`, `INDUSTRY_PARTNER`) who lack ACD accounts; internal roles (`SECRETARY`, `GEN_ED_COORDINATOR`, `PROGRAM_HEAD`, `FACULTY`, `STUDENT`) would keep the institutional Gmail flow. No approved change yet — do not build or assume.
- Canonical terminology: Institutional Learning Outcome (ILO), Program Learning Outcome (PLO), Course Intended Learning Outcome (CILO). "Graduate Outcome" is retired.
- **PWA surface expectation (confirmed):** web platform, but on mobile the app must feel almost mobile-native — touch-friendly controls, natural scrolling, native-like navigation and ergonomics. Mobile is a first-class product surface, never a scaled-down desktop.
- No offline data caching, mutation queues, Serwist/Workbox/next-pwa unless ADR 0006 is reopened.
- Detailed stack and engineering rules live in `AGENTS.md` (with `CONTEXT-MAP.md`, feature `CONTEXT.md` files, and `docs/adr/`); do not duplicate here.

## Brand Commitments

- Name is always **System CLOIE** in user-facing copy and documentation; never shortened to "CLOIE".
- **The ACD seal must be preserved** (confirmed binding). Never recolor, invert, filter, distort, or redraw official logos.
- Official assets: `public/logos/acd-logo.png` (ACD seal), `public/logos/cloie-logo.png` (product mark), `public/logos/google-logo.svg` (sign-in).
- Approved visual specification lives in `docs/design.md` (light/dark/system themes, semantic token contract). The stakeholder has granted explicit latitude to improve the design system beyond the incumbent spec — accessibility, user experience, contrast, clarity — provided product truth and the seal are preserved. Improvements should update the governing docs rather than diverge from them silently.

## Evidence on Hand

- Approved design spec: `docs/design.md`; numerical tokens in `src/styles/tokens.css` and `src/app/globals.css`.
- Theme companion boards: `docs/assets/system-cloie-design-system-light.png`, `docs/assets/system-cloie-design-system-dark.png`.
- Protected design-system showcase route in-app (`src/features/design-system/`, ADR 0010).
- Domain truth: `CONTEXT-MAP.md` + 16 feature `CONTEXT.md` files + 19 ADRs under `docs/adr/`.
- Demo seed data exists for development/demonstration; production contains real institutional data.
- **Absence to respect:** no marketing testimonials, case studies, or customer evidence exist. This is an internal institutional platform — never fabricate such content.

## Product Principles

1. **Traceable evidence chain** — any analytic number can be followed, visibly and coherently, back to the responses that produced it.
2. **Usable at every literacy level** — clarity of flow and language outranks density; a non-technical user completes each workflow without training.
3. **Institutional trust** — confidential-response handling, one-response integrity, and server-enforced role/program scoping are part of the product's meaning, not implementation detail.
4. **Role-aware focus** — each surface shows exactly what its role's scope authorizes; nothing more.
5. **Defensible outputs** — analytics and reports must withstand accreditation scrutiny.

## Accessibility & Inclusion

- Confirmed audience need: varying technical literacy across all eight roles; alumni and industry partners use the system rarely and without institutional context — flows must be self-explanatory.
- Normative baseline (DESIGN.md): ≥4.5:1 text contrast, visible keyboard focus everywhere, ≥44px touch targets on touch devices, status never by color alone, honored reduced-motion, screen-reader-complete components.
- Stakeholder directive: treat accessibility, contrast, and UX clarity as improvable priorities, not fixed constraints.
