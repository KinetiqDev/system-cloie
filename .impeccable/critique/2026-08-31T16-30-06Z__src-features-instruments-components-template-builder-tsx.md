---
target: template builders for Secretary, Dean, Program Head, Faculty, and any other authorized roles
total_score: 21
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-08-31T16-30-06Z
slug: atures-instruments-components-template-builder-tsx
---

# Template Builder UX Critique and Audit

Method: dual-agent attempted (A: DesignAssessment completed · B: TechnicalAssessment cancelled after timeout); deterministic detector completed in parent as prescribed fallback.

## Design Health Score

| #         | Heuristic                       |     Score | Key issue                                                                               |
| --------- | ------------------------------- | --------: | --------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     |         2 | No dirty/saved state; actions disappear below viewport.                                 |
| 2         | Match system / real world       |         3 | Domain terms are sound, but “Publish” actually enters different role-specific flows.    |
| 3         | User control and freedom        |         1 | Cancel and back navigation discard edits without a guard.                               |
| 4         | Consistency and standards       |         3 | One shared builder controls roles, but route wrappers vary.                             |
| 5         | Error prevention                |         3 | Faculty readiness is validated; Program Head publish does not save current edits first. |
| 6         | Recognition rather than recall  |         1 | Users must remember and hunt for bottom-only actions.                                   |
| 7         | Flexibility and efficiency      |         1 | No persistent actions, dirty-state affordance, or save shortcut.                        |
| 8         | Aesthetic and minimalist design |         3 | Calm, coherent visual system; excessive vertical travel remains.                        |
| 9         | Error recovery                  |         2 | Errors and toasts exist, but recovery is remote from affected content.                  |
| 10        | Help and documentation          |         2 | Settings helper text exists; save/publish consequences are unclear.                     |
| **Total** |                                 | **21/40** | **Significant interaction work needed.**                                                |

## Audit Health Score

| Dimension                |     Score | Key finding                                                                                                                  |
| ------------------------ | --------: | ---------------------------------------------------------------------------------------------------------------------------- |
| Accessibility            |       3/4 | Semantic controls and keyboard DnD are strong; persistent action access and navigation-loss prevention are absent.           |
| Performance              |       3/4 | No measured hot-path defect; 2,219-line client builder raises rerender risk but was not profiled.                            |
| Responsive               |       2/4 | Shared controls provide coarse-pointer sizing, but the only document actions are at the bottom and lack safe-area treatment. |
| Theming                  |       4/4 | Builder uses semantic tokens and shared primitives.                                                                          |
| Implementation integrity |       3/4 | Detector returned zero findings; route-level back-link duplication and role-flow divergence remain.                          |
| **Total**                | **15/20** | **Good foundation; weak long-form action architecture.**                                                                     |

## Design specificity verdict

The builder is recognizably System CLOIE through its outcome bindings, role scope, institutional hierarchy, and restrained design system. The interaction shell is still category-generic: a long form with a footer button row. The detector returned zero mechanical findings for the three builder components; this is a UX architecture failure, not token drift or prohibited styling.

## Priority issues

1. **P1 — Bottom-only actions.** `template-builder.tsx:1371-1388` makes Save/Publish unavailable through most of a long authoring session.
2. **P1 — Silent edit loss.** The builder has no dirty model or navigation guard. Back, Cancel, sidebar navigation, and browser close can discard work.
3. **P1 — Inconsistent publish semantics.** Faculty publish saves, validates, then navigates (`993-1015`); Program Head publish only routes (`program-head-template-builder.tsx:35-37`). Unsaved Program Head edits can therefore be excluded from the next publish step.
4. **P2 — Competing action hierarchy.** Publish uses `brand-accent` while Save uses primary; two colored siblings obscure which action persists work versus advances a high-stakes flow.
5. **P2 — Mobile action failure.** A document-footer row has no fixed/sticky behavior or `pb-safe`; the defect worsens on mobile.

## What works

- One shared `TemplateBuilder` supplies Faculty, Program Head, Secretary, and Dean surfaces.
- Faculty publication saves first and enforces readiness before advancing.
- Shared Button, semantic tokens, visible labels, keyboard DnD announcements, and coarse-pointer sizing are strong foundations.

## Recommended pattern

Desktop/tablet: a sticky page action header inside the builder, below the global 64px top bar. Left side contains Back, title, scope label, and explicit state (`Unsaved changes`, `Saving…`, `Saved`). Right side contains role-appropriate actions. Keep a non-sticky closing affordance at document end only as optional reinforcement, not the sole action location.

Mobile: a compact page heading followed by a fixed bottom action bar with `pb-safe`; primary action full-width, secondary action adjacent or in an overflow menu only when genuinely secondary. Add bottom content padding so the bar never covers fields.

Action semantics: use `Save draft` as neutral secondary persistence and `Continue to publish` as the single primary action because the current controls enter a publication/deployment flow rather than instantly publishing. Program Head and Faculty must both save successfully before advancing. Institutional baseline copy uses `Create program copy`; management-only builders show only `Save template`. Cancel/back invokes a discard confirmation only when dirty.
