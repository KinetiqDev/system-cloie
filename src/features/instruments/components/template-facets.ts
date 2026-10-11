import type { FacetDef } from "@/components/data-table/types";
import type { TemplateCollectionItem } from "./template-collection";

export type TemplateFacetColumn = "type" | "status" | "source";

export type TemplateFilters = {
  query: string;
  type: string | null;
  status: string | null;
  source: string | null;
};

export const DEFAULT_TEMPLATE_FILTERS: TemplateFilters = {
  query: "",
  type: null,
  status: null,
  source: null,
};

type TemplateFacets = {
  /** The facets that hang off a column heading. */
  byColumn: Record<TemplateFacetColumn, FacetDef[]>;
  /** Every facet the list offers, so applied ones can show as removable chips. */
  all: FacetDef[];
};

const TEMPLATE_TYPE_LABELS: Record<TemplateCollectionItem["templateType"], string> = {
  PROGRAM_WIDE: "Program-wide",
  COURSE_BOUND: "Course-bound",
};

const TEMPLATE_STATUS_LABELS = ["Active", "Inactive"] as const;

/**
 * Every narrowing control the Evaluation-template lists offer, expressed once
 * as facets so the column headings, the toolbar chips and the mobile sheet can
 * never drift apart. Options are derived from the items on screen, so a value
 * that no longer exists simply stops being offered.
 *
 * Name search is deliberately absent here: it belongs to the toolbar, because
 * it spans the name, the bound course and the description together.
 */
export function buildTemplateFacets(
  filters: TemplateFilters,
  update: <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) => void,
  items: readonly TemplateCollectionItem[],
  instanceId: string
): TemplateFacets {
  const distinct = <T extends string>(values: Iterable<T>): T[] =>
    [...new Set(values)].sort((a, b) => a.localeCompare(b));

  const types = distinct(items.map((item) => item.templateType));
  const sources = distinct(items.map((item) => item.origin));
  // Status arrives as a free-text label; the two lifecycle labels are the only
  // values a template can carry, so match on them rather than on `statusActive`,
  // which a caller may word differently.
  const statuses = TEMPLATE_STATUS_LABELS.filter((label) =>
    items.some((item) => item.statusLabel === label)
  );

  const type: FacetDef = {
    id: `${instanceId}-type`,
    label: "Type",
    value: filters.type,
    onChange: (value) => update("type", value),
    allLabel: "All types",
    options: types.map((type) => ({ id: type, label: TEMPLATE_TYPE_LABELS[type] })),
  };

  const status: FacetDef = {
    id: `${instanceId}-status`,
    label: "Status",
    value: filters.status,
    onChange: (value) => update("status", value),
    allLabel: "All statuses",
    options: statuses.map((label) => ({ id: label, label })),
  };

  const source: FacetDef = {
    id: `${instanceId}-source`,
    label: "Source",
    value: filters.source,
    onChange: (value) => update("source", value),
    allLabel: "All sources",
    options: sources.map((source) => ({
      id: source,
      label: items.find((item) => item.origin === source)?.originLabel ?? source,
    })),
  };

  const byColumn: Record<TemplateFacetColumn, FacetDef[]> = {
    type: [type],
    status: [status],
    source: [source],
  };

  return { byColumn, all: Object.values(byColumn).flat() };
}

/** Name and bound-course text a toolbar search box scans. */
function matchesTemplateQuery(item: TemplateCollectionItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.name, item.description, item.boundCourseCode, item.boundCourseTitle]
    .filter((text): text is string => Boolean(text))
    .some((text) => text.toLowerCase().includes(needle));
}

/** Apply the caller-owned facets to one section's items. */
export function filterTemplates(
  items: readonly TemplateCollectionItem[],
  filters: TemplateFilters
): TemplateCollectionItem[] {
  return items.filter(
    (item) =>
      (filters.type === null || item.templateType === filters.type) &&
      (filters.source === null || item.origin === filters.source) &&
      (filters.status === null || item.statusLabel === filters.status) &&
      matchesTemplateQuery(item, filters.query)
  );
}
