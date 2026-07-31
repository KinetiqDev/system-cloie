## 1. Native Legal Content And Public Routes

- [x] 1.1 Create `src/features/legal/types.ts`, `src/features/legal/content.ts`, and `src/features/legal/index.ts` with typed Privacy Notice and Terms of Use metadata, summaries, sections, lists, tables, contact blocks, stable IDs, and explicit pending-approval values derived from the Markdown references without importing them.
- [x] 1.2 Create the shared legal Server Components under `src/features/legal/components/` for the page shell, header, metadata, table of contents, section/content renderer, summary, and footer using existing design tokens and installed shadcn/base components.
- [x] 1.3 Add `src/app/(legal)/layout.tsx`, `src/app/(legal)/privacy/page.tsx`, and `src/app/(legal)/terms/page.tsx` with public static-compatible rendering, unique metadata, responsive long-form layout, cross-document links, and portal navigation.
- [x] 1.4 Add legal route/content tests covering public rendering, native-content source boundaries, headings/anchors, metadata, draft status, cross-links, mobile-safe structure, and absence of Markdown imports.
- [x] 1.5 Add public Privacy Notice and Terms of Use links to the appropriate landing or portal navigation surface without forcing legal pages through the centered login layout.
- [x] 1.6 Verify Slice 1 with `pnpm vitest run src/__tests__/app/privacy-page.test.tsx src/__tests__/app/terms-page.test.tsx src/__tests__/features/legal/legal-content.test.ts`, `pnpm lint`, and `pnpm build`.
- [x] 1.7 Replace the mobile top-only table of contents with a persistent safe-area-aware trigger and scrollable Base UI Drawer; preserve desktop sticky navigation, anchor behavior, keyboard access, and no-overflow behavior.

Acceptance criteria:

- `/privacy` and `/terms` are public, native, readable pages.
- The Markdown files are reference-only and are not imported or parsed.
- Draft/institutional approval status is visible wherever source metadata remains unresolved.
- Legal navigation and stable anchors work with keyboard and mobile layouts.

Proposed commit: `feat(legal): add native privacy and terms pages`

## 2. Role Intent And Acknowledgement Dialog

- [x] 2.1 Add `src/features/auth/services/role-intent.ts` to centralize serialization and validation of the seven configured role intents while preserving the callback contract and canonical `industry-partner` slug.
- [x] 2.2 Create `src/features/legal/components/legal-acknowledgement-dialog.tsx` as the narrow Client Component boundary with focus-safe Dialog composition, concise summaries, full-page links, labelled required Checkbox, `Cancel`, `Agree and Continue with Google`, loading state, error state, and reset behavior.
- [x] 2.3 Integrate the dialog into `src/features/portals/components/role-selection-card.tsx` so role actions open the dialog and no longer start OAuth directly.
- [x] 2.4 Update `src/features/auth/components/google-signin-button.tsx` and `src/app/(public)/login/page.tsx` so the error-only role-less login path does not undermine the role-selection entry contract; preserve development and dedicated-demo paths unchanged.
- [x] 2.5 Add dialog and role-card tests covering all configured roles, modal content, disabled/checked behavior, cancel behavior, duplicate-click protection, and exact OAuth intent preservation; rely on the Base UI Dialog primitive for Escape and focus recovery.
- [x] 2.6 Verify Slice 2 with `pnpm vitest run src/__tests__/features/legal/legal-acknowledgement-dialog.test.tsx src/__tests__/features/portals/portal-login-flow.test.tsx` and `pnpm lint`.

Acceptance criteria:

- Every role-specific Continue action opens the acknowledgement dialog before OAuth.
- OAuth cannot start while acknowledgement is unchecked.
- The selected role is preserved exactly through the OAuth starter.
- The modal is keyboard accessible and remains usable at mobile widths.

Proposed commit: `feat(auth): gate role sign-in with legal acknowledgement`

## 3. Signed Acknowledgement Ticket And Callback Enforcement

- [x] 3.1 Create `src/features/legal/services/legal-acknowledgement-ticket.ts` with server-only HMAC signing/verification, strict payload validation, short expiry, current legal-version checks, timing-safe comparison, and secure cookie options based on existing repository crypto patterns.
- [x] 3.2 Add `src/app/api/auth/legal-acknowledgement/route.ts` to validate the acknowledgement request and issue the intent/version-bound short-lived httpOnly ticket without accepting client data as authorization.
- [x] 3.3 Update the legal acknowledgement dialog OAuth continuation to request and require a successful ticket response before calling Supabase `signInWithOAuth`.
- [x] 3.4 Update `src/app/api/auth/callback/route.ts` to verify and clear the legal ticket before account creation/linking and destination resolution while preserving all existing callback failure and authorization behavior.
- [x] 3.5 Add callback and ticket tests for valid, malformed, missing, expired, stale-version, invalid-signature, cleared, and intent-mismatched tickets, plus role mismatch, invalid domain, and pre-provisioning regression cases.
- [x] 3.6 Verify Slice 3 with `pnpm vitest run src/__tests__/app/auth-callback-route.test.ts src/__tests__/features/legal/legal-acknowledgement-ticket.test.ts src/__tests__/app/legal-acknowledgement-route.test.ts`, `pnpm lint`, and `pnpm build`.

Acceptance criteria:

- Supported OAuth callback flows require a valid acknowledgement ticket.
- Tickets contain minimal non-sensitive data, expire quickly, are secure cookies, and are intent/version bound.
- Invalid tickets cannot create or link domain accounts.
- Existing stored-role, domain, provisioning, onboarding, inactive-account, and destination rules remain authoritative.
- Development and dedicated-demo authentication do not use the Google OAuth ticket path.

Proposed commit: `fix(auth): enforce legal acknowledgement at oauth callback`

## 4. End-To-End Accessibility And Release Verification

- [x] 4.1 Run focused legal, dialog, portal, ticket, and callback tests together and fix regressions without changing unrelated authentication behavior.
- [x] 4.2 Run `pnpm test`, `pnpm lint`, and `pnpm build`; record any pre-existing failures separately from change regressions.
- [x] 4.3 Exercise `/privacy`, `/terms`, `/portal/staff`, and `/portal/respondents` in a browser at desktop, tablet, narrow mobile, keyboard-only, and zoomed text conditions.
- [x] 4.4 Verify dialog focus entry/trap/return, checkbox labelling, disabled action behavior, error recovery, section-anchor navigation, heading hierarchy, contrast, absence of horizontal overflow, and acknowledgement-before-actions ordering at desktop and mobile widths.
- [ ] 4.5 Confirm legal draft/approval metadata and SEO indexing policy with the institutional owner before production deployment; do not replace unresolved values with invented content.

Acceptance criteria:

- Required repository verification commands pass.
- Browser checks confirm the legal pages and acknowledgement flow are accessible and responsive.
- Production publication status is explicit and approved legal metadata is not silently fabricated.

Proposed commit: `test(legal): verify public legal and oauth acknowledgement flows`

## Follow-Up Boundary

- [ ] 5.1 If ACD requires durable per-account acceptance evidence, open a separate change for a `LegalAcceptance` Prisma model, migration, retention policy, versioning rules, callback write path, and privacy review; do not add it opportunistically to this change.
