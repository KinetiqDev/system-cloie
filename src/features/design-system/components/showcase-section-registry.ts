import type { ComponentType } from "react";
import { ComponentStateMatrix } from "./component-state-matrix";
import { DataShowcase } from "./data-showcase";
import { FeedbackAndStateShowcase } from "./feedback-and-state-showcase";
import { FormControlsShowcase } from "./form-controls-showcase";
import { OverlayAndFeedbackShowcase } from "./overlay-and-feedback-showcase";
import { TableSelectionShowcase } from "./table-selection-showcase";
import { TokenReference } from "./token-reference";

export interface ShowcaseSectionEntry {
  id: string;
  title: string;
  description: string;
  component: ComponentType;
}

/**
 * Single ordered composition seam for the Design System Showcase.
 *
 * Later dependency-ordered slices append their own entries here (chart
 * reference, role-aware navigation, responsive behavior, appearance parity)
 * without reopening the route page.
 */
export const SHOWCASE_SECTIONS: readonly ShowcaseSectionEntry[] = [
  {
    id: "foundations",
    title: "Foundations",
    description:
      "Semantic tokens resolved from the production token contract: surface, text, status, radius, elevation, and the approved type scale.",
    component: TokenReference,
  },
  {
    id: "actions",
    title: "Actions and states",
    description:
      "The required state matrix — default, hover, focus, pressed, selected, disabled, loading, error, and success — on real action and control primitives.",
    component: ComponentStateMatrix,
  },
  {
    id: "controls-and-validation",
    title: "Controls and validation",
    description:
      "A local reference form with visible labels, adjacent helper and error copy, programmatic invalid state, and checked controls in primary.",
    component: FormControlsShowcase,
  },
  {
    id: "data",
    title: "Cards, KPIs, tables, tabs, badges, and progress",
    description:
      "Canonical card compositions, KPI figures, contained tables, pill and line tabs, status badges, and text-bearing progress.",
    component: DataShowcase,
  },
  {
    id: "table-selection",
    title: "Table selection",
    description:
      "Selectable table rows using local static state only — selection is reference state and performs no database mutation.",
    component: TableSelectionShowcase,
  },
  {
    id: "feedback",
    title: "Feedback, loading, empty, error, and offline reference",
    description:
      "Status alerts and badges with text and icon support, structural loading, actionable empty states, a recovery error card, and the static offline reference.",
    component: FeedbackAndStateShowcase,
  },
  {
    id: "overlays",
    title: "Overlays and feedback",
    description:
      "Dialog, alert dialog, sheet, drawer, popover, dropdown menu, tooltip, and the single toast contract with semantic scrim and focus behavior.",
    component: OverlayAndFeedbackShowcase,
  },
];
