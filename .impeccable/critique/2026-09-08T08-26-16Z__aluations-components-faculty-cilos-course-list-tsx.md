---
target: Faculty Manage CILOs and roster-to-publication workflow
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-08T08-26-16Z
slug: aluations-components-faculty-cilos-course-list-tsx
---
# Faculty CILO workflow audit and critique

Method: dual-agent (A: FacultyDesignReview; B: FacultyTechnicalAudit), parent source verification and browser access attempt.

Assessment only. No application edits or database mutations. Authenticated browser verification blocked: local /faculty/cilos redirects to portal; Faculty entry requires legal acknowledgement and Google authentication. No acknowledgment performed, no bypass, no screenshots/axe/overlay. Existing application left running; parent browser closed. Source and supplied screenshots support design findings. Mechanical detector returned [] on scoped targets.

## Design specificity
Preserve System CLOIE's institutional visual identity and semantic tokens. The failure is task organization: disconnected data-management pages do not guide preparation of an evaluation. Recommend a resumable course workspace, not a forced wizard.

## Nielsen scores
Visibility 2; real-world match 3; control 2; consistency 2; error prevention 2; recognition 2; efficiency 1; minimalist design 2; recovery 2; contextual help 1. Total 19/40, Poor. Provisional expert review, not measured usability.

## Technical scores
Accessibility 2; performance 3; responsive 2; theming 3; integrity 2. Total 12/20. Runtime performance, contrast, dark rendering, touch sizes and keyboard behavior unverified.

## Priority issues
1. P1 Disconnected workflow: faculty-cilos-course-list.tsx:451,542; add-cilo-form.tsx:88; course-alignment-editor.tsx:530-564,614-617. Preserve course, period and explicitly selected assignment across outcomes, alignment, questionnaire and publication. Provide next relevant action after save; do not force completed tasks or roster-first authoring.
2. P1 Mobile table-only CILO browsing: faculty-cilos-course-list.tsx:458-559. Card/list toggle using existing Tools/Roster pattern; cards default narrow, dense list desktop, compact stacked rows for mobile list. Inline next action, conditional metadata, truthful server-derived mapping readiness. Table already contains keyboard-focusable horizontal overflow in components/ui/table.tsx:18-24; assessment A's missing-containment claim rejected.
3. P1 Shared-save contract conflict: outcomes/CONTEXT.md:59-65 specifies reviewed confirmed commit, but manage-course-alignment.ts:811-895 writes live shared mapping rows through Save progress; tests:876-974 expect creates/removals/updates. Do not silently remove review or claim progress is private. Recommend one review-and-save path permitting reviewed incomplete progress while keeping publication gates, pending explicit contract decision. Mobile review needs space and visible Back to editing.
4. P1 Publication information order: publish-course-bound-evaluation-form-v2.tsx:366-445 renders full binding reference before configuration on stacked layouts. Put configuration first on mobile; disclose full bindings from summary. Carry course into compatible template choice. Use this template should open authorized copy directly. Never infer arbitrary CILO bindings or fabricate questions without approved rules.
5. P2 Academic period overlap: term-instance-picker.tsx:106 inherits select.tsx:64 alignItemWithTrigger=true; installed Base UI SelectPositioner documents selected-item overlap. Disable overlap specifically for picker, bottom/start preferred with viewport collision handling. Mobile sheet appropriate. Explicit Academic period label; All Terms currently placeholder, not selectable All.

## Roster
Keep preview-first name reconciliation and explicit membership. Exception-first review: summarize exact/duplicate rows, foreground suggested/ambiguous/unmatched rows, keep all inspectable. Current review shows six filter buttons and defaults all (course-roster-management.tsx:649-663,1095). Continue preparing evaluation after confirmation with same assignment. Do not auto-match ambiguous names or infer membership from enrollment. Import draft persistence explicitly deferred by ADR 0015.

## Proposed composition
Course setup shared across classes: Outcomes -> Alignment -> Evaluation questions.
Class setup scoped to assignment/period: Students -> Respondent preview -> Publish.
Resumable checklist, direct entry, completed work reused. Mobile one task panel, visible course context, reachable safe-area footer, per-CILO mapping disclosure. Desktop dense course overview and comparison matrix.

## Strengths
Existing alignment table/card adaptation; mobile editor drawer and sticky safe-area save bar; server role/scope gates, stale-write rejection, frozen publication snapshots, full-word manifestation controls.

## Cognitive load and personas
Main memory demand is moving between data-type pages, repeated selections, unclear next actions and all-target mapping scans. First-time faculty cannot discover the Tools handoff. Returning faculty repeat navigation/context. Mobile faculty face sideways table scrolling and long binding reference before configuration. Screen-reader users need explicit labels for search, period and CILO textareas. No user-abandonment rates or task timing measured.

## Minor findings
Placeholder-only search and modal new-CILO input; existing CILO textareas have no explicit programmatic label. Only term persists in list URL; q/type/page are local. Bare empty state gives no recovery guidance. Review confirmation footer lacks visible return-to-editing action. Compact touch dimensions not measured; no numerical WCAG contrast claim.

## Recommended commands
shape -> adapt -> distill -> onboard/clarify -> polish. Preserve tokens and domain distinctions. Resolve shared-save intent before implementation. Questions for user: connected workspace versus smaller linked-page refinement; recommended reviewed shared-progress semantics versus retaining explicitly labeled immediate shared writes with amended contract.
