# Add PWA Install Button

## Why

System CLOIE is already installable as a PWA (manifest ships at `src/app/manifest.ts`), but installability is invisible: users must find the browser's own install affordance (Chrome address-bar icon or menu item), which most never notice. Adding an explicit install button on the landing page turns a latent capability into a discoverable one, which matters because AGENTS.md treats the installed PWA as a first-class product surface.

## What Changes

- Add a small client component, `InstallAppButton`, rendered in the landing page header (`src/app/page.tsx`) as a quiet secondary button labeled **"Install app"**.
- The button appears only on compatible devices, driven by the browser's own eligibility signal:
  - It listens for `beforeinstallprompt` and renders only after that event fires (Chromium browsers where installability criteria are met). The event never fires on Safari, Firefox, or when already installed — no user-agent sniffing.
  - It stays hidden while running as an installed app (`display-mode: standalone` media query).
- Clicking the button calls `prompt()` on the stashed event (satisfies Chrome's user-gesture requirement), then handles the outcome: accepted → button hides and a toast confirms "System CLOIE installed"; dismissed → button hides until a later visit.
- No service worker, no offline behavior, no new dependencies. Chrome 108+ no longer requires a service worker for installability, so this does not reopen ADR 0006 (offline/service-worker work remains deferred).

## Capabilities

### New Capabilities

- `pwa-install`: install affordance on the landing page — eligibility detection via `beforeinstallprompt`, prompt flow with user-gesture handling, installed-state suppression, and dismissal behavior.

### Modified Capabilities

None.

## Impact

- **Code**: new `src/features/portals/components/install-app-button.tsx` (with export via `src/features/portals/index.ts`); one header edit in `src/app/page.tsx`. Page stays a server component; the button is the only client boundary added.
- **APIs**: none (client-side browser events only).
- **Dependencies**: none.
- **Data**: no Prisma model, SQL migration, or Supabase type changes.
- **Authorization / privacy**: unchanged. The button performs no data access.
- **Caching**: unchanged.
- **Deployment**: unchanged; `beforeinstallprompt` fires on `localhost` (secure context), so behavior is verifiable in dev.
- **Tests**: Vitest + Testing Library component test with a mocked `beforeinstallprompt` event; no E2E coverage until Playwright is set up.
