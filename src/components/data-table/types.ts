/**
 * The vocabulary every table's column filters are built from.
 *
 * A surface declares its own facets rather than sharing pre-built ones. That
 * repetition is deliberate: `src/components/**` may not import from
 * `src/features/**` (see the feature-boundary architecture test), so a shared
 * "Academic Period facet" factory is not available to the surfaces that need
 * one. What is shared is the contract below — the shape, the control, the
 * chips — while each feature keeps ownership of its own option sources and
 * labels. The one surface that filters over its own items in memory composes
 * the helpers in its own feature directory instead.
 */

/** One selectable narrowing value inside a column filter. */
type FacetOption = {
  /** Value written to the owning list's state. */
  id: string;
  label: string;
  /** Secondary line under the label, e.g. a course title or an email. */
  detail?: string;
  /** Short markers beside the label, e.g. Program codes on a Faculty option. */
  badges?: string[];
};

type FacetDefBase = {
  /** Stable key for the facet within its list. */
  id: string;
  /** Names the facet for assistive technology and for its filter chip. */
  label: string;
  /** Value in force, or null when the facet narrows nothing. */
  value: string | null;
  onChange: (value: string | null) => void;
  /**
   * Whether the facet currently narrows the list. Defaults to `value !== null`.
   * A facet whose value is also the list's own default (the active Academic
   * Period, for example) holds a value without being an applied filter.
   */
  isApplied?: boolean;
  /** Unavailable state for a facet the current scope cannot present. */
  disabled?: boolean;
  /** Why the facet is unavailable, shown in place of its controls. */
  disabledReason?: string;
};

/** A single-choice list of values, optionally searchable when it is long. */
export type OptionFacetDef = FacetDefBase & {
  kind?: "options";
  options: FacetOption[];
  /** Label of the row that clears the facet, e.g. "All programs". */
  allLabel: string;
  /** Shows a search box over the option list. Defaults on for 12+ options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Overrides the option label used by the facet's removal chip. */
  formatValue?: (value: string) => string;
};

/** A single on/off refinement, e.g. "Only classes with no active members". */
type ToggleFacetDef = FacetDefBase & {
  kind: "toggle";
  /** Value written while the toggle is on. */
  onValue: string;
  /** Label of the toggle itself; `label` stays the facet's chip name. */
  toggleLabel: string;
};

export type FacetDef = OptionFacetDef | ToggleFacetDef;

/** Whether the facet currently narrows its list. */
export function facetIsApplied(facet: FacetDef): boolean {
  return facet.isApplied ?? facet.value !== null;
}

/** The value side of a facet's label, without repeating the facet name. */
export function facetValueLabel(facet: FacetDef): string {
  if (facet.kind === "toggle") return facet.toggleLabel;
  if (facet.value === null) return facet.allLabel;
  const option = facet.options.find((entry) => entry.id === facet.value);
  return option?.label ?? facet.formatValue?.(facet.value) ?? facet.value;
}

/** How a facet reads in the toolbar's applied-filter chips. */
export function facetChipLabel(facet: FacetDef): string {
  return facet.kind === "toggle" ? facet.label : `${facet.label}: ${facetValueLabel(facet)}`;
}
