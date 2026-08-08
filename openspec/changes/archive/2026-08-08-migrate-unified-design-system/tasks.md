## Execution Contract

These 27 dependency-ordered slices are the GitHub execution units. Every implementation issue MUST include:

- **Skills to invoke:** `openspec-apply-change`, `implement`, `tdd`, and `code-review`; UI work also invokes `design-taste-frontend`, `shadcn`, and `a11y-debugging`; Next.js root/bootstrap work invokes `next-best-practices`; final readiness invokes `openspec-verify-change` and `fallow`.
- **Read and investigate first:** `openspec/config.yaml`, `docs/design.md`, this change's proposal/design/relevant delta specs, applicable ADRs and `CONTEXT.md`, exact current source/tests, and linked prerequisite issue evidence. Agents must re-check paths and current behavior before editing.
- **Verification:** focused tests first, then `pnpm lint`, `pnpm test`, and `pnpm build`; browser/a11y/deployment checks where listed.
- **Preservation:** no product workflow, authorization, route ownership, account state, database behavior, caching, or navigation information architecture changes unless explicitly stated.

The production-surface inventory assigns every auditable file exactly one disposition: owned slice, already compliant, redirect, `notFound()` placeholder, generated source, or approved exception. The readiness gate verifies this inventory and does not repair newly discovered unowned production code.

## 1. Foundation Preconditions

- [x] **1. Planning context, production-surface inventory, and bootstrap compatibility.** Create `src/features/design-system/CONTEXT.md`, `src/features/design-system/data/production-surface-inventory.ts`, and `src/__tests__/features/design-system/production-surface-inventory.test.ts`; add the `CONTEXT-MAP.md` entry; inspect effective primary Production/dedicated-demo CSP headers and production-build behavior for the synchronous same-origin `public/appearance-bootstrap.js`. Verify bootstrap, hydration, client navigation, streamed RSC, and a representative Server Action with no CSP violation. Preserve archived navigation behavior and commit `8e2582a` aggregate analytics privacy. Acceptance: every surface has one valid disposition; deployed incompatibility blocks appearance implementation and requires artifact revision; no repository CSP is added by this change. Dependencies: none. Commit: `docs(design-system): establish migration prerequisites`.

- [x] **2. Semantic tokens, metadata, and public shell.** Modify `src/styles/tokens.css`, `src/app/globals.css`, `src/app/layout.tsx` metadata only, `src/app/manifest.ts`, `src/app/(public)/layout.tsx`, and inventory audit metadata; create semantic-token, raw-value, metadata, and public-shell tests. Acceptance: approved Light/Dark values, no legacy gold, defined hover/input/popover/selection/overlay/sidebar/chart roles, explicit asset/logo allowlist, no `#0051C3`, streamed authenticated shell unchanged. Dependencies: 1. Commit: `feat(design-system): establish semantic foundations`.

## 2. Shared Components

- [x] **3. Actions, Cards, and Spinner.** Modify `src/components/ui/button.tsx` and `card.tsx`; add reviewed Base UI-compatible `spinner.tsx`; add exact component tests. Retain semantic `cta-success` until slice 20 removes it with its sole caller. Acceptance: `brand-accent`, exported `CardAction`, width-preserving disabled loading, duplicate activation prevented, no Radix. Dependencies: 2. Commit: `feat(design-system): retokenize actions and loading`.

- [x] **4. Form controls.** Retokenize `input.tsx`, `textarea.tsx`, `label.tsx`, `field.tsx`, `checkbox.tsx`, `radio-group.tsx`, `select.tsx`, and `switch.tsx`; add exact tests for each. Acceptance: visible labels, adjacent helper/error copy, programmatic invalid/disabled/selected state, checked uses primary, `customZodResolver` unchanged. Dependencies: 2. Commit: `feat(design-system): retokenize form controls`.

- [x] **5. Data and state primitives.** Retokenize `table.tsx`, `tabs.tsx`, `progress.tsx`, `skeleton.tsx`, and `empty.tsx`; add exact tests. Acceptance: semantic header/hover/selected/expanded/active/loading/empty states with unchanged APIs. Dependencies: 2. Commit: `feat(design-system): retokenize data states`.

- [x] **6. Overlay and feedback primitives.** Retokenize Sheet, Dialog, Drawer, AlertDialog, DropdownMenu, Tooltip, Alert, Badge, and Toast; add reviewed Base UI Popover; add exact tests. Acceptance: semantic surface/border/scrim/focus; title/Escape/trap/restoration preserved; one toast contract with information; status non-color-only; no Radix. Dependencies: 2. Commit: `feat(design-system): retokenize overlays and feedback`.

## 3. Showcase, Appearance, and Visualization

- [x] **7. Protected interactive Design System Showcase.** Create `/design-system` route/layout/loading, server access policy, typed static fixtures, ordered registry, foundation/state matrices, form controls, overlay/feedback, table selection, loading/empty/error, and static offline-reference sections. Acceptance: authenticated development/valid dedicated demo only; primary Production/malformed demo fail closed; real production components; no primary navigation item, database access, Server Action, or mutation. Dependencies: 3-6. Commit: `feat(design-system): add protected interactive showcase`.

- [x] **8. Gated Light/Dark/System appearance selection.** Add `public/appearance-bootstrap.js`, appearance parser/availability/provider, root insertion, and a standalone topbar appearance trigger (`appearance-menu-trigger.tsx`) with Light / Dark / System radio entries, mirrored on public routes through `(public)/layout.tsx`. Keep repository CSP and `src/proxy.ts` unchanged. The Settings Appearance route was removed during review; the avatar profile menu is identity and logout only, and the trigger renders nothing when appearance is unavailable. Acceptance: pre-paint parity, invalid storage safety, OS updates for System, explicit override, state preservation, exact-`"true"` Production gate, forced Light/no write/no controls when disabled. Dependencies: 1, 2, 4. Commit: `feat(design-system): add gated appearance selection`.

- [x] **9. Accessible chart wrapper and quantitative analytics.** Add reviewed `src/components/ui/chart.tsx` without overwriting Card or duplicating Recharts; add Showcase chart reference; migrate quantitative chart, summary, breakdown, and filter components. Acceptance: semantic palette/grid/tooltip/legend/labels, exact-value alternative, text insight, deterministic mark-level distinction plus legend/labels beyond five categories, aggregate-only DTO tests pass. Dependencies: 3-5, 7. Commit: `refactor(analytics): migrate quantitative charts`.

- [x] **10. Qualitative visualization and review consumers.** Migrate word cloud, qualitative cloud, dashboard fallback/composition, course-bound review tabs, anonymized response presentation, and published list. Acceptance: five semantic chart tokens, deterministic repeated-token distinction, frequency summary, aggregate-only browser payload; independently authorized raw-text review behavior unchanged. Dependencies: 3, 5, 9. Commit: `refactor(analytics): migrate qualitative visualization`.

- [x] **11. Role-aware navigation.** Retokenize AppShell, desktop sidebar, Dean rail, mobile drawer, respondent bottom nav, and NavigationLink; add responsive/navigation Showcase references. Acceptance: no route/matching/pending/`aria-current`/focus-containment/responsive-mode regression; dark logo plates; 44px targets. Dependencies: 3, 7. Commit: `refactor(navigation): apply semantic navigation roles`.

## 4. Administrative and Authoring Domains

- [x] **12. Secretary user management.** Migrate Secretary stat cards, add-user form, users table/filter/pagination/KPI, dialogs, and page. Acceptance: semantic role/category/lifecycle states, minimum type scale, protected edit and authorization unchanged. Dependencies: 3-6. Commit: `refactor(users): migrate Secretary management UI`.

- [x] **13. Academic Calendar management.** Migrate active-term badge, rollover table/runner, school-year form/list, active-term dialog, term form/picker, and Secretary school-year routes. Acceptance: semantic lifecycle/loading/empty/error states; Academic Calendar context invariants unchanged. Dependencies: 3-6. Commit: `refactor(academic-calendar): migrate management UI`.

- [x] **14. Academic Structure management.** Migrate program/course/major components and Secretary, Dean, and canonical Program Head routes. Acceptance: semantic cards/forms/dialogs/tables; steward authority, lifecycle, deletion, catalog, and ADR 0009 routes unchanged. Dependencies: 3-6. Commit: `refactor(academic-structure): migrate management UI`.

- [x] **15. Course Assignment lists and forms.** Migrate assignment page shell, tables, filters, summaries, create/edit dialogs, assignment sheet, class identity, faculty Popover, wizard, and Secretary/Dean/canonical Program Head routes. Acceptance: semantic list/form/alert/confirmation, contained tables, membership and all-program manager invariants unchanged. Dependencies: 3-6. Commit: `refactor(course-assignments): migrate assignment UI`.

- [x] **16. Roster and enrollment management.** Migrate roster management/pages, Faculty/shared/canonical Program Head roster routes, enrollment editor/history, and Dean enrollment oversight routes. Acceptance: semantic roster/enrollment states; membership, eligibility, import, enrollment, and ADR 0009 scope unchanged. Dependencies: 3-6. Commit: `refactor(academic): migrate roster and enrollment UI`.

- [x] **17. Faculty CILO and Program Head outcome authoring.** Migrate Faculty profile CILO list/new/form and Program Head GO/CILO mapping components/routes. Acceptance: no raw success/sub-minimum text; Faculty scope, GO ownership, Course CILO, mappings, and ADR 0009 unchanged. Dependencies: 3-6. Commit: `refactor(outcomes): migrate CILO and outcome authoring`.

- [x] **18. Staff profiles and demo role controls.** Migrate Faculty/Program Head/Dean profiles, role-switcher list/dropdown, and Program Head context header. Acceptance: semantic focus/danger and minimum type; dev/demo visibility, one active role, selected Program context, and primary Production boundaries unchanged. Dependencies: 3-6. Commit: `refactor(auth-ui): migrate staff profiles and demo controls`.

- [x] **19. Dean dashboard and oversight.** Migrate Dean dashboard, college-oversight landing, and learning-outcomes oversight; classify Dean redirects and `notFound()` placeholders explicitly in inventory. Acceptance: semantic dashboard/oversight; ADR 0005 authority and navigation unchanged. Dependencies: 3-6 and 9-10 where consumed. Commit: `refactor(dean): migrate oversight UI`.

- [x] **20. Instrument and template authoring.** Migrate all instrument production components and Secretary/Dean/Faculty/canonical Program Head tool routes; remove `cta-success` in the same commit as its sole caller. Acceptance: approved action hierarchy, destructive recovery, no intermediate type break. Dependencies: 3-6. Commit: `refactor(instruments): migrate authoring UI`.

- [x] **21. Evaluation deployment.** Migrate assignment picker, central/course-bound publish forms, Faculty CILO course list, Faculty new/detail deployment routes, and Program Head new deployment route. Acceptance: semantic lifecycle/validation/loading; publication, recipient exclusion, roster lock, and eligibility unchanged. Dependencies: 3-6. Commit: `refactor(evaluations): migrate deployment UI`.

- [x] **22. Evaluation review.** Migrate close/detail/late-include dialogs, published table, exports, Faculty response routes, canonical Program Head reviews, and active Dean review detail routes. Acceptance: confirmed destructive action and safe cancellation; close/review authorization unchanged. Dependencies: 3-6, 10. Commit: `refactor(evaluations): migrate review UI`.

## 5. Public, Respondent, Legal, and Recovery

- [x] **23. Landing, Portal, login, onboarding, and account status.** Migrate root landing, Portal components, login, onboarding forms/routes, and dynamic status route; remove forbidden glow/decorative blur while preserving approved landing chrome and `bc07fd9` card-count grid. Acceptance: low-density semantic public UI; Google auth, role claim, and account-state behavior unchanged. Dependencies: 2-6. Commit: `refactor(portals): migrate public account UI`.

- [x] **24. Respondent evaluations, dashboards, profiles, and history.** Migrate response wizard/review components, evaluation-list card, all existing Student/Alumni/Industry Partner evaluation list/detail/submitted routes, dashboards, profiles, and history. Acceptance: text/count progress, recovery errors, 44px controls, explicit Completed, minimum type, contained tables, eligibility/submission/bottom-nav unchanged. Dependencies: 3-6. Commit: `refactor(respondents): migrate respondent UI`.

- [x] **25. Legal, global error, and route recovery.** Migrate all legal components/routes, global/root/not-found/unauthorized errors, ErrorBoundary, and operational/respondent route errors. Acceptance: semantic readable legal prose and recovery; no raw inline palette; global error remains dependency-light; acknowledgement and safe return behavior unchanged. Dependencies: 2, 3, 6. Commit: `refactor(ui): migrate legal and recovery surfaces`.

## 6. Release

- [x] **26. Repository readiness gate.** Update `.env.example`, `docs/design.md`, ADR 0010, activation runbook, Showcase fixtures, and production inventory only. Do not repair unowned production code here. Acceptance: all owners complete; Light/Dark/System at 375/768/1024/1440; keyboard, contrast, touch, reduced motion, chart a11y, first paint, DTO privacy, raw-color/type audits, CSP/runtime and deployment boundaries pass; Showcase unavailable in primary Production; no default enables rollout. Dependencies: 1-25. Commit: `docs(design-system): complete appearance readiness gate`.

- [x] **27. Primary Production activation (operator-only).** After accepted slice 26 evidence, follow `docs/runbooks/appearance-production-activation.md`: confirm target identity, set server-only `CLOIE_APPEARANCE_ENABLED` to exact `"true"`, redeploy, verify first paint and representative routes, record redacted evidence, and roll back by unsetting on regression. No repository files or commit. Dependencies: accepted 26. Label: `ready-for-human`. Status: completed by the operator 2026-08-08 (issue #271 closed as completed); activation involved no repository change.
