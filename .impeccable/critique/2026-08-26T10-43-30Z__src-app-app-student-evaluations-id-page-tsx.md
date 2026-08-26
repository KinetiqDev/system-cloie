---
target: student evaluation-taking flow
total_score: 28
max_score: 40
na_heuristics:
p0_count: 3
p1_count: 2
timestamp: 2026-08-26T10-43-30Z
slug: src-app-app-student-evaluations-id-page-tsx
---

# Design Critique — Student Evaluation-Taking Flow

Method: dual-agent (A: CritiqueDesignReview · B: CritiqueDetectorEvidence)
Target: src/app/(app)/student/evaluations/[id]/page.tsx + src/features/responses/components/wizard-shell.tsx (incl. list page and responses components)

## Verification Blocker

**[P0] Dev database schema drift blocks live verification (infrastructure, not UI).** `listStudentAssignedEvaluations()` throws PrismaClientKnownRequestError — column `courses.description` does not exist in the connected dev database. Dashboard, evaluations list, and evaluation detail/wizard all render `RespondentRouteError`. Browser evidence therefore covers error states only; wizard findings derive from source review + mock rendering. Likely cause: this worktree's Prisma schema is ahead of the linked dev database (unapplied migration). Apply pending migrations (dry-run → push → types regen) before any visual re-review. Do not assume product-code breakage until confirmed against main.

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                    |
| --------- | ------------------------------- | --------- | ---------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Draft-save indicator subtle; no "last saved" proof when resuming             |
| 2         | Match System / Real World       | 3         | Clear language overall; `router.back()` breaks "Back to Dashboard" promise   |
| 3         | User Control and Freedom        | 3         | No explicit Save & Exit; exit relies on unreliable history back              |
| 4         | Consistency and Standards       | 4         | Token discipline and component reuse genuinely strong                        |
| 5         | Error Prevention                | 3         | Quantitative validated, qualitative not — despite domain invariant           |
| 6         | Recognition Rather Than Recall  | 3         | Resume always starts at section 0; no completed-section visibility           |
| 7         | Flexibility and Efficiency      | 2         | Strictly linear wizard; no section jump, shortcuts, or accelerators          |
| 8         | Aesthetic and Minimalist Design | 3         | Calm and restrained, but header+footer eat ~25% of mobile viewport           |
| 9         | Error Recovery                  | 3         | Good boundary pattern, but generic cause-free copy; no scroll-to-first-error |
| 10        | Help and Documentation          | 1         | Zero contextual help/onboarding; weakest area vs the literacy-level bar      |
| **Total** |                                 | **28/40** | **Good (low end)**                                                           |

## Design Specificity Verdict

**LLM assessment:** Approaching specificity but not there — 2.5/4. Tokens, Manrope/Inter, and semantic color roles read bespoke; the Likert rating control (48px circular radios with descriptors) and suggested-response chips are genuinely OBE-tailored, and the submission confirmation is the most product-distinctive moment. But error copy ("We couldn't load this page") is interchangeable with any web app, and the wizard skeleton is generic form-wizard architecture.

**Deterministic scan:** CLI detector over target markup: **clean (exit 0)** — sanity-verified (the tool does emit findings elsewhere, e.g. profile page side-tab accent). Browser overlay found 1 anti-pattern (`flat-type-hierarchy`: sizes 12→18px, ratio 1.5) but verified **false positive for this target**: all flagged sizes belong to app-shell chrome (sidebar email caption, labels, brand title), not the evaluated files. Real signal about shell type scale; out of scope here.

**Visual overlays:** None user-visible — injection succeeded only on the error-boundary state (schema drift); overlays discarded on reload.

## Overall Impression

A disciplined, consistent implementation of a good design system wrapped around a structurally average wizard, currently invisible behind a broken dev database. The system carries the design; the flow itself adds little System CLOIE-specific intelligence. Biggest opportunity: make the resume experience and the submission moment trustworthy enough that a first-time, low-literacy respondent never fears losing work or submitting blind.

## What's Working

1. **Token/component consistency (4/4)** — semantic tokens everywhere, identical button placement, matching skeletons; the strongest product-specific quality.
2. **Touch-first rating control** — 48px radios, `touch-manipulation`, `active:scale`, descriptor labels, `peer-focus-visible` ring: well-executed custom control for thumbs and keyboards alike.
3. **Review-before-submit dialog** — scrollable 80vh summary, prominent irreversibility warning, Go Back / Confirm & Submit choice: correct progressive disclosure for a high-stakes irreversible action.

## Priority Issues

1. **[P0] Unreliable `router.back()` in wizard header** — direct-link arrivals (email/bookmark) strand users in history. Fix: `router.push(returnRoute)` using the existing prop. Suggested command: `/impeccable polish`.
2. **[P0] No section-state memory on resume** — wizard always opens at section 0; users must remember progress (violates recognition-over-recall; highest cognitive-load contributor). Fix: derive first incomplete section from loaded draft answers; add a completed/in-progress/remaining section mini-map. Suggested command: `/impeccable shape` (concept), then implement.
3. **[P1] Qualitative items never validated despite domain invariant** — CONTEXT.md: submission asserts every qualitative item non-empty; `validateCurrentSection` checks quantitative only. This is a functional correctness bug, not styling. Fix: extend validation + distinct message. Suggested command: `/impeccable harden` (plus Vitest coverage).
4. **[P1] No help, onboarding, or contextual guidance** — zero tooltips/instructions anywhere in the flow; directly contradicts the confirmed "usable at every literacy level" bar. Fix: first-section guidance banner explaining the scale + requiredness; tooltip jargon support. Suggested command: `/impeccable onboard`.
5. **[P2] Generic, cause-free error boundary** — "We couldn't load this page" gives no cause hint; blind retry. Fix: cause hints (network/session), keep Try Again + explicit dashboard link. Suggested command: `/impeccable clarify`.
6. **[P2] Mobile chrome consumes ~25% of viewport** — sticky header (~140px) + fixed footer (~76px) on 844px height starves question content. Fix: collapsible header on scroll, thinner progress bar, reduced padding. Suggested command: `/impeccable adapt`.

## Persona Red Flags

**Jordan (first-timer):** no explanation of the Likert scale or chips; "Not saved" indicator may scare him off though autosave fires on Next; the finality warning may frighten more than inform; `router.back()` may eject him somewhere unexpected.
**Sam (accessibility):** fieldset/legend/radiogroup semantics are correct (strength); chip toggle gives no selection-state announcement; animation classes risk mid-animation SR announcements; otherwise solid focus management.
**Casey (distracted mobile):** 25% chrome hides question content; interruption + resume resets to section 0; accidental Next has no undo; success screen offers no receipt/reference — no proof of completion if she's pulled away.

## Emotional Journey

Strong positive peak at submission (checkmark animation + warm copy) but functionally thin: no confirmation number, no "view your submission" path, no recorded-proof reassurance. Pre-submission warning creates appropriate gravity; error boundary is a frustration valley because it names no cause. Micro-friction: every forward navigation waits on autosave with no optimistic feedback.

## Minor Observations

- Previous button disabled state lacks `cursor-not-allowed` (pointer suggests clickability).
- Initial save status reads "Not saved" even when server drafts exist; `savedAt` captured but never shown as relative time.
- ReviewModal uses `border-border/50` opacity modifier instead of a semantic border role.
- Wizard back button `-ml-2` misaligns it from content grid.
- List-card `title` attribute duplicates clamped text (redundant for SR users).
- Empty state is passive ("will appear here") — could instruct next action.

## Questions to Consider

- If submitting an evaluation is the highest-stakes student action in System CLOIE, why does success offer no receipt, reference, or way back to the submission?
- What would a zero-training interface look like for a student who has never seen a 5-point Likert scale?
- What would make this flow unmistakably System CLOIE rather than a generic form wizard?
