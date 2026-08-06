# Design System

Design System defines the unified Light, Dark, and System visual contract, semantic design tokens, appearance resolution, protected visual showcase, and production-surface migration inventory for CLOIE.

## Language

**Semantic design token**:
A theme-resolved CSS variable role defined in `src/styles/tokens.css` (surface, text, border, interaction, status, visualization, elevation, metadata color) that replaces raw hex or palette values.
_Avoid_: Hardcoded hex color, component-local dark palette, raw Tailwind palette class when a semantic role exists

**Appearance preference**:
The visual mode selected by a user or resolved from the browser environment: `light`, `dark`, or `system`.
_Avoid_: Theme state, color mode without qualification

**Synchronous first-paint bootstrap**:
A small same-origin script (`public/appearance-bootstrap.js`) loaded synchronously in the root document `<head>` before application rendering to resolve stored preference and apply the `.dark` class to avoid visual flash.
_Avoid_: Hydration-only theme provider, inline script with `'unsafe-inline'`, dynamic nonce script

**Gated appearance selection**:
The server-owned release control (`CLOIE_APPEARANCE_ENABLED`) that gates Dark and System appearance selection in primary Production.
_Avoid_: Uncontrolled dark mode rollout, client-only feature flag, default-enabled appearance toggle

**Design System Showcase**:
A protected, read-only visual reference route (`/design-system`) under the authenticated application shell that renders production tokens and components with static fixture data across themes, viewports, and accessibility states.
_Avoid_: Public demo route, mutation playground, database-backed showcase

**Production-surface inventory**:
An audited catalog of all application UI surfaces, routes, layouts, and components mapping every file to exactly one migration owner or non-task disposition.
_Avoid_: Unowned UI component, ambiguous migration slice, silent fallbacks

## Invariants

1. **Rollout Gate**: Primary Production remains Light-only unless `CLOIE_APPEARANCE_ENABLED` is set to exact `"true"`. Unset, empty, or false forces Light before first paint.
2. **Showcase Protection**: The `/design-system` route is available only in `development` and valid dedicated demo environments, and fails closed with a not-found UI in primary Production or malformed demo settings per ADR 0010.
3. **Single Disposition Inventory**: Every auditable production surface file in `src/app`, `src/components`, and `src/features` has exactly one deterministic disposition (`task`, `already_compliant`, `redirect`, `not_found_placeholder`, `generated`, or `approved_exception`).
4. **Preserved Product & Privacy Invariants**: Visual token migration must never alter SystemRole authorization, account state, navigation information hierarchy, routing behavior, or aggregate-only analytics privacy contracts (commit `8e2582a`).
