## Context

System CLOIE is a Next.js 16 App Router application with Server Components as the default, a modular feature layout, Supabase Google OAuth, Prisma-backed account roles, and shadcn/ui base-nova components backed by `@base-ui/react`. The public role selection portal is the Identity and Access entry point. Each role card currently starts OAuth directly and carries the selected role only in the callback `intent` query parameter.

The repository contains draft Privacy Notice and Terms of Use Markdown references under `docs/privacy-and-ToS/`, but `/privacy` and `/terms` have no pages. The Markdown files contain both long-form legal content and concise login-modal summaries. They are content references only and must not become an application runtime dependency.

The change crosses the public legal surface and the Identity and Access entry flow, but it does not change the single-role account invariant or the existing server-side account authorization model.

## Goals / Non-Goals

**Goals:**

- Render native, public, readable Privacy Notice and Terms of Use pages at `/privacy` and `/terms`.
- Keep legal content hand-authored as typed application data and independent from Markdown loading or parsing.
- Provide shared document metadata, table of contents, stable section anchors, responsive layout, cross-links, and legal footer navigation.
- Show a concise legal acknowledgement dialog only after a user activates a role-specific Google authentication action.
- Require acknowledgement before the supported UI starts OAuth.
- Enforce the acknowledgement at the callback boundary with a signed, short-lived, intent-bound ticket, while retaining the existing server-side role and account-state checks.
- Preserve the selected role exactly through the existing OAuth intent contract.
- Keep development and dedicated-demo authentication paths outside the Google OAuth acknowledgement flow.
- Support keyboard navigation, focus management, mobile reading, visible draft status, and static SEO metadata.

**Non-Goals:**

- No durable legal-acceptance database record, Prisma model, SQL migration, or generated Supabase type change.
- No replacement of Supabase Auth, Google OAuth, `src/proxy.ts`, or the callback destination service.
- No change to role authorization, program scope, onboarding gates, role mismatch handling, or the one-role-per-account invariant.
- No Markdown parser, MDX pipeline, filesystem content loader, or runtime import of files under `docs/privacy-and-ToS/`.
- No redesign of authenticated application navigation or unrelated public page refactor.
- No remembered acknowledgement in `localStorage` or a long-lived browser preference.

## Decisions

### 1. Use a dedicated legal feature with typed content

Create `src/features/legal/` with typed document content and shared render components. `src/features/legal/content.ts` will contain the Privacy Notice and Terms of Use summaries and full sections as native objects. The content will be transcribed and reviewed from the Markdown references, but the application will not import or parse those files.

Why:

- Satisfies the native React/Next.js requirement.
- Allows stable section IDs, metadata, lists, tables, and cross-document links.
- Keeps legal content reusable between full pages and the acknowledgement dialog.
- Makes accidental runtime dependence on repository documentation easy to detect in tests and code review.

Alternative considered: importing Markdown through a loader or parsing it at build time. Rejected because the requirement explicitly makes the Markdown references non-renderable application inputs and because legal content needs explicit control over semantic HTML and unresolved approval placeholders.

### 2. Use a separate legal route layout

Add `src/app/(legal)/layout.tsx` rather than reusing `src/app/(public)/layout.tsx`. The current public layout is a centered login-style shell and is unsuitable for long-form documents. The legal route group keeps the public routes isolated, while `LegalPageShell` provides the shared header, public navigation, document content frame, and footer while preserving the URL paths `/privacy` and `/terms`.

Both route pages remain Server Components and export static `metadata` values. They will not call `cookies()`, `headers()`, `resolveAuthSession()`, or other request-time APIs.

Alternative considered: placing the legal pages inside the existing public layout. Rejected because it would impose login-page centering and background behavior on long documents and would couple public legal content to auth-oriented presentation.

### 3. Use a two-column desktop document layout and one-column mobile layout

The shared legal shell will use:

- a full-width CLOIE header and public navigation;
- a document header containing title, approval status, version, effective date, and last-updated metadata;
  - a desktop table of contents in a sticky side column;
  - a constrained long-form content column targeting readable line length;
  - a persistent mobile "On this page" trigger fixed above the safe area;
  - a mobile Base UI Drawer containing the scrollable table of contents;
  - a footer with Privacy Notice, Terms of Use, and portal links.

Use existing semantic design tokens and typography utilities. Use `Card` only for bounded metadata or summary surfaces where hierarchy is useful; do not wrap the entire document in a card. Use `Separator` for document-region boundaries. Use native `overflow-x-auto` for wide legal tables rather than adding `ScrollArea` solely for the pages.

Alternative considered: rendering the document as a stack of cards. Rejected because card repetition would fragment a legal document and reduce scanability. Alternative considered: a normal-flow mobile table of contents. Rejected after mobile review because it disappears during deep reading; the fixed trigger keeps navigation reachable without making the full legal page a Client Component. Only the drawer trigger/content owns client state, while the document routes and content remain Server Components.

### 4. Keep the acknowledgement dialog as a narrow Client Component boundary

Create `src/features/legal/components/legal-acknowledgement-dialog.tsx` with `"use client"`. The dialog owns only local interaction state:

- open/closed state;
- acknowledgement checkbox state;
- ticket/OAuth submission state;
- recoverable error state.

The role card supplies serializable role display data and the validated OAuth intent. The dialog renders the shared summary content and calls a supplied continuation function only after the acknowledgement ticket is issued.

The full legal pages and content remain Server Components. The legal summary data passed into the dialog must be serializable and must not contain server-only objects.

Why:

- Keeps hydration and client bundle scope narrow.
- Reuses the same summary copy and links as the full documents.
- Preserves the role card as the owner of the selected role while isolating modal state.

### 5. Enforce acknowledgement with a signed short-lived ticket

The dialog will call a same-origin endpoint before starting OAuth:

```text
POST /api/auth/legal-acknowledgement
body: { intent, privacyVersion, termsVersion }
```

The server endpoint will:

- validate the request shape and intent against the known role-intent contract;
- compare the submitted versions with the current application legal versions;
- issue a signed, short-lived, httpOnly cookie containing only the intent, versions, issued-at, and expiry data;
- use `SameSite=Lax`, `Secure` outside development, and a narrow auth-flow path where compatible with the callback;
- never trust the client-provided role for authorization.

The OAuth starter will then use the same validated intent slug in:

```text
/api/auth/callback?intent=<intent>
```

The callback will verify the ticket before continuing with the existing Supabase code exchange and account-resolution flow. It will reject missing, malformed, expired, invalidly signed, stale-version, or intent-mismatched tickets. It will clear the ticket after a callback attempt so the browser does not retain it.

The ticket is a short-lived browser-flow gate, not a durable acceptance record and not an authorization claim. It does not contain email, Google IDs, role permissions, profile data, or legal content. No client-side query parameter can substitute for the ticket.

Use the existing HMAC/timing-safe patterns from `src/features/auth/services/demo-auth.ts` as implementation guidance, but keep legal-ticket configuration and cookie names separate from demo authentication.

Why:

- Client-only disabling is useful UX but does not protect the callback from direct OAuth initiation.
- A database record is unnecessary for a pre-auth browser-flow gate and would introduce schema, retention, and identity-timing complexity.
- The callback remains the authoritative place for authenticated role and account-state validation.

Alternative considered: client-only checkbox gating. Rejected as the primary design because it is bypassable and does not provide callback-level enforcement. Alternative considered: durable `LegalAcceptance` storage. Deferred because the current requirement does not establish an audit-retention obligation and the user identity does not exist before OAuth.

### 6. Centralize role intent serialization

Add a small role-intent service or constants module under `src/features/auth/services/` to centralize conversion between `SystemRole`/role-card configuration and callback intent slugs. It must preserve the current values accepted by `src/app/api/auth/callback/route.ts`, including the canonical `industry-partner` form and any existing underscore compatibility that tests require.

The callback will continue to validate the intent and compare it to the stored `UserRole`. The helper reduces the risk that the modal integration creates a slug that the callback silently rejects.

### 7. Treat unresolved legal fields as visible draft status

The source references contain placeholders for effective dates, institutional contacts, retention periods, hosting details, and other approval inputs. The typed content will represent these as explicit pending values or status metadata. The page header and modal will identify the documents as drafts pending institutional approval until approved content is supplied.

No legal fact, contact detail, retention period, or approval status will be invented during implementation.

### 8. Keep role-less `/login` out of the new OAuth path

`/login` is currently an auth-error recovery page and calls `GoogleSignInButton` without an intent. The role selection portal is the canonical public entry point. The design will preserve `/login` as an error recovery route and route users back to role selection rather than introducing a role-less acknowledgement/OAuth flow. If the existing button remains temporarily for compatibility, it must not undermine the selected-role requirement.

### 9. No caching or durable storage

Legal content is static application content and may be statically rendered by Next.js. No persistent cache is introduced.

| Data                         | Cache key               | Scope                                 | Lifetime                           | Tags | Authorization boundary              | Stale behavior               |
| ---------------------------- | ----------------------- | ------------------------------------- | ---------------------------------- | ---- | ----------------------------------- | ---------------------------- |
| Legal document content       | build output            | public, versioned application content | deployment lifetime                | none | public                              | updated on deployment        |
| Legal acknowledgement ticket | httpOnly browser cookie | one browser auth attempt              | short expiry, target 10-15 minutes | none | same-origin callback plus signature | reject when stale or invalid |

Sessions, account roles, authorization decisions, profiles, responses, and other private data remain uncached.

## Auth Flow

```text
User                 Role card/dialog        Acknowledgement API       Supabase/Google       Callback
 |                         |                       |                       |                    |
 |-- select role --------->|                       |                       |                    |
 |                         |-- open dialog ------->|                       |                    |
 |-- check + continue ---->|                       |                       |                    |
 |                         |-- POST intent/version ---------------------->|                    |
 |                         |<-- Set-Cookie ticket ------------------------|                    |
 |                         |-- signInWithOAuth(intent) ------------------->|                    |
 |                         |                       |                       |-- authenticate ---->|
 |                         |                       |                       |                    |
 |                         |                       |                       |<-- code redirect ---|
 |                         |                       |                       |                    |
 |                         |                       |                       |                    |-- verify ticket
 |                         |                       |                       |                    |-- exchange code
 |                         |                       |                       |                    |-- resolve role/state
 |                         |                       |                       |                    |-- clear ticket
 |                         |                       |                       |                    |-- redirect destination
```

The callback must verify the legal ticket before creating or linking a domain account. Existing callback failure behavior remains authoritative for code failures, role mismatch, invalid domain, pre-provisioning, and destination resolution.

## File Plan

### Create

- `src/app/(legal)/layout.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/app/(legal)/terms/page.tsx`
- `src/features/legal/types.ts`
- `src/features/legal/content.ts`
- `src/features/legal/index.ts`
- `src/features/legal/components/legal-page-shell.tsx`
- `src/features/legal/components/legal-page-header.tsx`
- `src/features/legal/components/legal-document-nav.tsx`
- `src/features/legal/components/mobile-legal-document-nav.tsx`
- `src/features/legal/components/legal-document-content.tsx`
- `src/features/legal/components/legal-section.tsx`
- `src/features/legal/components/legal-acknowledgement-dialog.tsx`
- `src/features/legal/components/legal-footer.tsx`
- `src/features/legal/components/mobile-legal-document-nav.tsx`
- `src/features/legal/acknowledgement-content.ts`
- `src/features/legal/legal-versions.ts`
- `src/features/legal/services/legal-acknowledgement-ticket.ts`
- `src/app/api/auth/legal-acknowledgement/route.ts`
- `src/features/auth/services/role-intent.ts`
- focused legal, portal, and auth callback tests under `src/__tests__/`

### Modify

- `src/features/portals/components/role-selection-card.tsx`
- `src/features/auth/components/google-signin-button.tsx` if retained by the error route
- `src/app/(public)/login/page.tsx`
- `src/app/page.tsx` or the shared public shell to expose legal links
- `src/features/portals/components/portal-shell.tsx`
- `src/app/api/auth/callback/route.ts`
- existing role-card and callback tests

### Do not modify

- `src/types/supabase-database.ts` by hand
- `docs/privacy-and-ToS/*.md`
- demo/dev authentication boundary behavior
- Prisma schema or Supabase migrations for this baseline change

## Risks / Trade-offs

- [Risk] The legal references contain unresolved institutional placeholders. -> Keep pending values visible, add draft status, and require content approval before treating the pages as final production legal notices.
- [Risk] A cookie ticket can be stolen and replayed during its short lifetime. -> Keep the ticket short-lived, httpOnly, secure in production, same-site, intent/version bound, minimal in payload, and clear it at callback. Durable replay prevention requires a separate server-side store and is out of scope.
- [Risk] OAuth may be initiated after the ticket endpoint succeeds but before the browser completes the redirect. -> Keep the ticket endpoint same-origin, handle network errors without starting OAuth, and allow a recoverable retry from the modal.
- [Risk] Role slug drift can break callback routing. -> Centralize serialization and test all seven configured role cards against the callback contract.
- [Risk] A modal can become unusable on small screens or with zoom. -> Keep actions outside the scroll region, cap only the summary area, test keyboard and mobile viewport behavior, and avoid rendering full documents inside the modal.
- [Risk] Public legal pages could accidentally become dynamic or hydrate unnecessarily. -> Keep route pages and document rendering server-side, use static metadata, and isolate only the acknowledgement dialog as a Client Component.
- [Risk] A client-controlled acknowledgement could be mistaken for authorization. -> Treat the ticket only as a pre-OAuth gate; retain callback-side account lookup, role mismatch, domain, provisioning, onboarding, and inactive-account checks.

## Migration Plan

1. Add typed legal content and shared Server Component legal pages.
2. Add legal navigation links and route/content tests; verify both routes are public and static-compatible.
3. Add the acknowledgement dialog and integrate it with every role-specific portal card.
4. Add the signed ticket endpoint and callback verification before enabling the new OAuth continuation path.
5. Update callback, role-intent, dialog, and portal regression tests.
6. Run focused tests, `pnpm test`, `pnpm lint`, and `pnpm build`.
7. Perform browser keyboard/mobile/accessibility checks and review draft approval metadata before deployment.

Rollback:

- Revert the legal UI and ticket integration together if the auth flow is blocked.
- Because no schema or persistent data change is introduced, rollback does not require a database migration or data repair.
- If a deployment has issued short-lived tickets, they expire naturally; changing the server ticket secret can invalidate outstanding tickets if emergency invalidation is required.

## Open Questions

- Will ACD provide approved effective dates, official contact details, retention periods, hosting regions, and approval status before production publication?
- Should the public legal pages be indexed by search engines while the references remain draft documents, or should route metadata set `robots: { index: false }` until approval?
- Does the institution require a durable per-account legal acceptance record? If yes, create a separate schema change rather than expanding this pre-auth ticket design.
- Should the modal's full-document links use normal same-tab navigation, or is a new-tab workflow required by user testing?
- Should the callback reject all OAuth attempts without a legal ticket, including existing users returning through `/login`, or should `/login` be fully redirected to the role portal first?
