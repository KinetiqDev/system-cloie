# Design: PWA Install Button

## Context

System CLOIE's manifest (`src/app/manifest.ts`) already makes the app installable: `name`, `start_url: "/"`, `display: standalone`, and 192/512/maskable icons all ship. What is missing is discoverability — install happens only through browser chrome (Chrome's address-bar icon or menu), which users rarely find.

Chrome 108+ removed the service-worker requirement from installability criteria, so `beforeinstallprompt` fires on a manifest+icons alone. ADR 0006 defers all service-worker and offline work; this change adds neither, so the ADR is not reopened.

The landing page (`src/app/page.tsx`) is a Server Component. Its header is a `justify-between` row with content only on the left — the right side is empty space, an uncontested spot for a secondary action. The page's primary CTAs are the two portal choice cards; the install button must stay visually subordinate to them.

## Goals / Non-Goals

**Goals:**

- Show an "Install app" button on the landing page only where install can actually happen.
- Drive the install flow through the browser's own `beforeinstallprompt` / `prompt()` API with correct user-gesture handling.
- Keep the landing page a Server Component; confine `use client` to the button island.
- Hide the button in all states where it is meaningless: incompatible browsers, already installed, after dismissal.

**Non-Goals:**

- iOS/iPadOS Safari support. Safari has no install prompt API (installation is manual via Share → Add to Home Screen). Showing an instruction sheet there is a future enhancement, not part of this change.
- Service worker, offline caching, or update prompts — ADR 0006 remains deferred.
- Changing `start_url`, manifest content, or the installed app's launch behavior.
- Any analytics or instrumentation around installs.

## Decisions

### 1. Eligibility via the event, not detection libraries

The button listens for `beforeinstallprompt` and renders only after it fires. The event is the browser's authoritative installability signal; it never fires on Safari/Firefox or when already installed. No UA sniffing, no `navigator.userAgent` checks, no new dependency.

*Alternatives considered:* `useEffect` checks of `window.matchMedia('(display-mode: standalone)')` alone — insufficient, it tells you "installed" but not "installable"; UA-sniffing libraries (e.g., `pwa-install-handler` patterns) — fragile and wrong by construction.

### 2. Component location: portals feature

New file `src/features/portals/components/install-app-button.tsx`, exported from `src/features/portals/index.ts`, mounted in the landing header. The portals feature already owns the landing page UI (`PortalChoiceCard`, `HeroCard`), and the landing page is the only consumer. A new top-level feature directory for one 80-line component is over-structure.

### 3. Client boundary: one island, page stays server-rendered

`"use client"` on `InstallAppButton` only. The component is pure browser-API glue (event listeners, state, `window`), which is exactly what the architecture reserves client boundaries for. `src/app/page.tsx` remains a Server Component; serialization is unaffected.

### 4. Event stashing and prompt-on-click

The component stores the latest `BeforeInstallPromptEvent` in React state, calls `preventDefault()` on it (suppresses Chrome's automatic UI, preventing double prompts), and invokes `stashed.prompt()` inside the click handler. Calling `prompt()` synchronously within the click gesture satisfies Chrome's user-activation requirement — this is the standard pattern and the reason the event must be stashed rather than prompted on arrival.

### 5. Suppression matrix

Rendered only when ALL hold:

- a `BeforeInstallPromptEvent` has been captured, AND
- `matchMedia('(display-mode: standalone)')` does not match, AND
- no `appinstalled` event has fired this session, AND
- the previous prompt outcome (if any) was not `dismissed`.

`appinstalled` and `dismissed` both clear the stashed event from state, unmounting the button. On dismissal the browser throttles refires, so re-showing the button within the same visit would produce dead clicks; hiding until the next visit (fresh mount) is the honest behavior. The `standalone` media check covers subsequent launches of the installed app, where `beforeinstallprompt` never fires anyway.

### 6. Presentation

Button variant `outline` (secondary visual weight — the portal cards are the page's primary CTAs), lucide `Download` icon, label "Install app", `aria-label="Install System CLOIE app"`. The Button primitive already provides ≥44px touch targets at `size="default"`/`md`, visible focus rings, and press feedback. Appearance is event-driven, so there is no flash of dead UI; the header row height is unchanged when the button mounts, so no layout shift concerns.

### 7. Confirmation feedback

On `userChoice.outcome === "accepted"` (or the subsequent `appinstalled` event), call the existing `showToast("System CLOIE installed", "success")` helper from `src/components/ui/toast.tsx`. `ToastProvider` is already mounted in the root layout, so no provider wiring is needed.

### 8. Testing strategy

Vitest + Testing Library component test in the portals feature, mocking `beforeinstallprompt` / `appinstalled` dispatch and `matchMedia`:

- button hidden before the event, visible after;
- click calls `prompt()` on the stashed event;
- accepted outcome shows the toast and hides the button;
- dismissed outcome hides the button;
- standalone mode renders nothing.

No E2E (Playwright is not yet set up). Dev verification is possible in Chrome on `localhost` because localhost is a secure context and fires `beforeinstallprompt`.

## Risks / Trade-offs

- **[Chrome may throttle refires after dismissal]** → Accepted; the button simply does not render again until a fresh visit. Matches the spec's dismissal requirement.
- **[`beforeinstallprompt` timing varies]** → The event can fire before or after React hydrates; the listener is registered in `useEffect` on mount, and Chrome re-fires the event while the page is open when criteria change, so a missed first paint is self-healing.
- **[Non-Chromium users get no affordance]** → Intentional scope cut (Non-Goals). iOS instruction sheet is the upgrade path if stakeholder demand appears.
- **[`prompt()` can be called only once per stashed event]** → State clears on every outcome, so no stale event can be re-prompted.
- **[Dev-only envs and the demo deployment]** → No special-casing needed; the button is inert UI. If it never fires, it never renders.

## Migration Plan

None required — no data, schema, config, or dependency changes. Rollback is deleting the component and reverting the header edit.

## Open Questions

None.
