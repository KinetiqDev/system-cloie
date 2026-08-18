# Tasks: Add PWA Install Button

One vertical slice: the install button is a self-contained landing-page affordance with no data, schema, or config dependencies.

## 1. Install Button Component

- [x] 1.1 Create `src/features/portals/components/install-app-button.tsx` — `"use client"` component implementing the design's suppression matrix: capture `beforeinstallprompt` with `preventDefault()` + stash latest event in state; hide when `display-mode: standalone` matches; hide and clear state on `appinstalled`; on click call `stashed.prompt()`, then handle `userChoice` (accepted → `showToast("System CLOIE installed", "success")`; dismissed → clear state). Use `Button` `variant="outline"` with lucide `Download` icon, label "Install app", `aria-label="Install System CLOIE app"`.
- [x] 1.2 Export `InstallAppButton` from `src/features/portals/index.ts`.
- [x] 1.3 Mount `<InstallAppButton />` in the landing page header (`src/app/page.tsx`), inside the header's right-side `div` so it sits opposite the logo block. Page remains a Server Component.

## 2. Tests

- [x] 2.1 Add Vitest + Testing Library test in `src/features/portals/components/` covering: no render before `beforeinstallprompt`; render after dispatch; click calls `prompt()` on the stashed event; accepted outcome shows the toast and hides the button; dismissed outcome hides the button; standalone `matchMedia` renders nothing.

## 3. Verification

- [x] 3.1 Run `pnpm vitest run` on the new test file, then `pnpm lint`.
- [x] 3.2 Run `pnpm build` to confirm the new client boundary compiles cleanly.
- [x] 3.3 Manual check in Chrome at desktop and mobile viewport widths on `pnpm dev` (localhost is a secure context): button appears in the header on an installable browser, header layout stays intact, button is absent in an already-installed standalone window. If possible, complete an install and confirm the "System CLOIE installed" toast and post-install suppression.
