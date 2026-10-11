"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, MoreVertical } from "lucide-react";

import { FilterableHead } from "@/components/data-table/filterable-head";
import { MobileFilterSheet, TableToolbar } from "@/components/data-table/table-toolbar";
import { facetIsApplied, type FacetDef } from "@/components/data-table/types";
import {
  buildTemplateFacets,
  DEFAULT_TEMPLATE_FILTERS,
  filterTemplates,
  type TemplateFacetColumn,
  type TemplateFilters,
} from "./template-facets";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ListCardViewMode as ToolsViewMode } from "@/components/layout/view-selector";

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

type TemplateOrigin = "program-owned" | "institutional" | "faculty-copy";

export type TemplateCollectionItem = {
  id: string;
  /** Optional template code for destructive-confirmation copy. */
  code?: string;
  name: string;
  description: string | null;
  templateType: "PROGRAM_WIDE" | "COURSE_BOUND";
  statusLabel: string;
  statusActive: boolean;
  origin: TemplateOrigin;
  /** Dot + text marker: the item's provenance, which drives which actions are permitted. */
  originLabel: string;
  /** Optional extra source detail, e.g. the owning Program code. */
  secondaryMeta?: string;
  facultyAccessible: boolean;
  /** Bound course display values; null when the template has no course selected. */
  boundCourseCode?: string | null;
  boundCourseTitle?: string | null;
  /** Omitted when the source cannot report a version count (e.g. baselines). */
  versionCount?: number;
  /** Whether the role may publish this template (renders the Publish action). */
  canPublish?: boolean;
};

type TemplateSection = {
  heading?: string;
  items: TemplateCollectionItem[];
  /**
   * Names this section's own filter state. Two sections on one page share the
   * column headings' vocabulary but never each other's selections.
   */
  filterKey: string;
  /** Role-specific action buttons (Edit, Duplicate, Publish, ...). */
  renderFooterActions: (item: TemplateCollectionItem) => ReactNode;
  /** Role-specific overflow menu items (Activate, Delete, ...). */
  renderOverflowMenu?: (item: TemplateCollectionItem) => ReactNode;
};

function templateTypeLabel(item: TemplateCollectionItem): string {
  return item.templateType === "PROGRAM_WIDE" ? "Program-wide" : "Course-bound";
}

type TemplateCollectionProps = {
  view: ToolsViewMode;
  sections: TemplateSection[];
  /** Rendered when no section contains items. */
  empty: ReactNode;
  /** List/Card view toggle or toolbar control rendered in the toolbar. */
  viewControl?: ReactNode;
};

// ---------------------------------------------------------------------------
// Origin marker
// ---------------------------------------------------------------------------

const ORIGIN_MARKER_CLASS: Record<TemplateOrigin, string> = {
  "program-owned": "bg-primary",
  institutional: "bg-brand-accent",
  "faculty-copy": "bg-muted-foreground",
};

function OriginMarker({ item }: { item: TemplateCollectionItem }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", ORIGIN_MARKER_CLASS[item.origin])}
      />
      <span className="text-xs">{item.originLabel}</span>
      {item.secondaryMeta && (
        <span className="text-muted-foreground text-xs">· {item.secondaryMeta}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Bound-course badge
// ---------------------------------------------------------------------------

function CourseBadge({ item }: { item: TemplateCollectionItem }) {
  if (item.boundCourseCode) {
    const fullLabel = item.boundCourseTitle
      ? `${item.boundCourseCode} — ${item.boundCourseTitle}`
      : item.boundCourseCode;
    return (
      <Badge
        variant="information"
        className="max-w-[10rem] text-xs"
        title={`Bound course: ${fullLabel}`}
        aria-label={`Bound course: ${fullLabel}`}
      >
        <BookOpen aria-hidden="true" />
        <span className="truncate">{item.boundCourseCode}</span>
      </Badge>
    );
  }

  if (item.origin !== "faculty-copy") return null;

  return (
    <Badge
      variant="warning"
      className="max-w-[12rem] text-xs"
      title="No course selected yet. Edit this template to choose a course."
      aria-label="No course selected yet. Edit this template to choose a course."
    >
      <BookOpen aria-hidden="true" />
      <span className="truncate">No course selected</span>
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export function TemplateCollection({
  view,
  sections,
  empty,
  viewControl,
}: TemplateCollectionProps) {
  const filledSections = sections.filter((section) => section.items.length > 0);
  const singleSection = filledSections.length === 1 ? filledSections[0] : null;
  // One page, one search. Two sections would otherwise show two identical
  // search boxes; the facets still narrow per section, because "Status: Active"
  // means something different for a Program template than for an institutional
  // baseline.
  const [query, setQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [sectionFilters, setSectionFilters] = useState<Record<string, TemplateFilters>>({});
  const pendingQuery = useRef<number | null>(null);
  const instanceId = useId();

  useEffect(() => {
    if (searchDraft === query) return;
    pendingQuery.current = window.setTimeout(() => {
      pendingQuery.current = null;
      setQuery(searchDraft);
    }, 300);
    return () => {
      if (pendingQuery.current !== null) window.clearTimeout(pendingQuery.current);
    };
  }, [searchDraft, query]);

  const filtersFor = (filterKey: string) => sectionFilters[filterKey] ?? DEFAULT_TEMPLATE_FILTERS;
  const setFiltersFor = (filterKey: string, next: TemplateFilters) =>
    setSectionFilters((current) => ({ ...current, [filterKey]: next }));

  const updateSingleSection = useCallback(
    <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) => {
      if (!singleSection) return;
      setFiltersFor(singleSection.filterKey, {
        ...filtersFor(singleSection.filterKey),
        [key]: value,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [singleSection, sectionFilters]
  );

  const singleSectionFacets = useMemo(() => {
    if (!singleSection) return [];
    return buildTemplateFacets(
      filtersFor(singleSection.filterKey),
      updateSingleSection,
      singleSection.items,
      singleSection.filterKey
    ).all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleSection, sectionFilters, updateSingleSection]);

  const totalVisible = filledSections.reduce(
    (sum, section) =>
      sum + filterTemplates(section.items, { ...filtersFor(section.filterKey), query }).length,
    0
  );
  const totalItems = filledSections.reduce((sum, section) => sum + section.items.length, 0);

  // Each section keeps its own facet state, so the chips carry a real updater
  // bound to their own section: the toolbar's X clears that section's filter
  // instead of calling a no-op. Clearing all of them restores the page's
  // opening state.
  const appliedChips: FacetDef[] = filledSections.flatMap((section) =>
    buildTemplateFacets(
      filtersFor(section.filterKey),
      (key, value) =>
        setFiltersFor(section.filterKey, { ...filtersFor(section.filterKey), [key]: value }),
      section.items,
      section.filterKey
    ).all.filter(facetIsApplied)
  );
  const clearAllFacets = () => {
    setSearchDraft("");
    setQuery("");
    setSectionFilters({});
  };

  if (filledSections.length === 0) return <>{empty}</>;

  return (
    <div className={view === "card" ? "space-y-8" : "space-y-6"}>
      <TableToolbar
        search={{
          id: `${instanceId}-search`,
          label: "Search templates",
          placeholder: "Search by name or course…",
          value: searchDraft,
          onChange: setSearchDraft,
        }}
        facets={appliedChips}
        onClearAll={clearAllFacets}
        resultSummary={
          <p className="text-muted-foreground text-xs tabular-nums">
            {totalVisible === totalItems ? (
              <span className="text-foreground font-medium">
                {totalItems} template{totalItems !== 1 ? "s" : ""}
              </span>
            ) : (
              <>
                <span className="text-foreground font-medium">{totalVisible}</span> of {totalItems}{" "}
                template{totalItems !== 1 ? "s" : ""}
              </>
            )}
          </p>
        }
      >
        {viewControl}
        {singleSection &&
          (view === "card" ? (
            <MobileFilterSheet
              facets={singleSectionFacets}
              activeCount={singleSectionFacets.filter(facetIsApplied).length}
              label="Filters"
              onClearAll={() => setFiltersFor(singleSection.filterKey, DEFAULT_TEMPLATE_FILTERS)}
              summary="Show results"
              triggerClassName="w-auto shrink-0"
            />
          ) : (
            <div className="md:hidden">
              <MobileFilterSheet
                facets={singleSectionFacets}
                activeCount={singleSectionFacets.filter(facetIsApplied).length}
                label="Filters"
                onClearAll={() => setFiltersFor(singleSection.filterKey, DEFAULT_TEMPLATE_FILTERS)}
                summary="Show results"
                triggerClassName="w-auto shrink-0"
              />
            </div>
          ))}
      </TableToolbar>
      {filledSections.map((section) => (
        <TemplateSectionView
          key={section.filterKey}
          view={view}
          section={section}
          query={query}
          filters={filtersFor(section.filterKey)}
          onFiltersChange={(next) => setFiltersFor(section.filterKey, next)}
          isSingleSection={filledSections.length === 1}
        />
      ))}
    </div>
  );
}

/**
 * One section's rows. The page owns search, because two sections on one page
 * must not present two identical boxes; the section owns its own facets, so
 * narrowing one section's Status never hides rows from its sibling.
 */
function TemplateSectionView({
  view,
  section,
  query,
  filters,
  onFiltersChange,
  isSingleSection = false,
}: {
  view: ToolsViewMode;
  section: TemplateSection;
  query: string;
  filters: TemplateFilters;
  onFiltersChange: (next: TemplateFilters) => void;
  isSingleSection?: boolean;
}) {
  const instanceId = useId();

  const update = useMemo(
    () =>
      <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) =>
        onFiltersChange({ ...filters, [key]: value }),
    [filters, onFiltersChange]
  );

  const enabledFacets = useMemo(() => ({ ...filters, query }), [filters, query]);
  const visibleItems = useMemo(
    () => filterTemplates(section.items, enabledFacets),
    [section.items, enabledFacets]
  );
  const facetDefs = useMemo(
    () => buildTemplateFacets(filters, update, section.items, instanceId),
    [filters, update, section.items, instanceId]
  );
  const clearFilters = () => onFiltersChange(DEFAULT_TEMPLATE_FILTERS);

  return (
    <section aria-label={section.heading} className="space-y-4">
      {section.heading && (
        <h2 className="text-heading-lg text-foreground text-pretty">{section.heading}</h2>
      )}
      {view === "card" && !isSingleSection ? (
        <div className="flex items-center justify-between gap-3">
          {section.heading ? null : (
            <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
              <span className="text-foreground font-medium">{visibleItems.length}</span> of{" "}
              {section.items.length}
            </p>
          )}
          <MobileFilterSheet
            facets={facetDefs.all}
            activeCount={facetDefs.all.filter(facetIsApplied).length}
            label="Filters"
            onClearAll={clearFilters}
            summary="Show results"
            triggerClassName="w-auto shrink-0"
          />
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <p className="text-muted-foreground text-sm">
            No {section.heading ? section.heading.toLowerCase() : "templates"} match these filters.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
            Clear these filters
          </Button>
        </div>
      ) : view === "card" ? (
        <>
          {/* Cards have no heading row to hang funnels on, so the section's
              facets open in the sheet above instead. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <TemplateCard
                key={item.id}
                item={item}
                renderFooterActions={section.renderFooterActions}
                renderOverflowMenu={section.renderOverflowMenu}
              />
            ))}
          </div>
        </>
      ) : (
        <TemplateTable
          items={visibleItems}
          renderFooterActions={section.renderFooterActions}
          renderOverflowMenu={section.renderOverflowMenu}
          sectionHeading={section.heading}
          facets={facetDefs.byColumn}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card view
// ---------------------------------------------------------------------------

function TemplateCard({
  item,
  renderFooterActions,
  renderOverflowMenu,
}: {
  item: TemplateCollectionItem;
  renderFooterActions: (item: TemplateCollectionItem) => ReactNode;
  renderOverflowMenu?: (item: TemplateCollectionItem) => ReactNode;
}) {
  const overflowMenu = renderOverflowMenu?.(item);

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base font-bold">{item.name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={item.statusActive ? "success" : "outline"}>{item.statusLabel}</Badge>
            {overflowMenu && <OverflowMenu>{overflowMenu}</OverflowMenu>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm" title={item.description}>
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CourseBadge item={item} />
          <OriginMarker item={item} />
          <Badge variant="outline" className="text-xs">
            {templateTypeLabel(item)}
          </Badge>
          {item.facultyAccessible && (
            <Badge variant="outline" className="text-xs">
              Faculty Access
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {item.versionCount !== undefined &&
            `${item.versionCount} version${item.versionCount !== 1 ? "s" : ""}`}
        </span>
        <div className="flex flex-wrap justify-end gap-2">{renderFooterActions(item)}</div>
      </CardFooter>
    </Card>
  );
}

function TemplateTable({
  items,
  renderFooterActions,
  renderOverflowMenu,
  sectionHeading,
  facets,
}: {
  items: TemplateCollectionItem[];
  renderFooterActions: (item: TemplateCollectionItem) => ReactNode;
  renderOverflowMenu?: (item: TemplateCollectionItem) => ReactNode;
  sectionHeading?: string;
  facets: Record<TemplateFacetColumn, FacetDef[]>;
}) {
  return (
    <div className="bg-card max-h-[70dvh] overflow-y-auto rounded-lg border sm:max-h-none sm:overflow-y-visible">
      <Table aria-label={sectionHeading ?? "Evaluation templates"} className="min-w-[44rem]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead>Name</TableHead>
            <FilterableHead label="Type" facets={facets.type} />
            <FilterableHead label="Status" facets={facets.status} />
            <FilterableHead label="Source" facets={facets.source} />
            <TableHead>Versions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const overflowMenu = renderOverflowMenu?.(item);

            return (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="align-top whitespace-normal">
                  <span className="block font-medium break-words whitespace-normal">
                    {item.name}
                  </span>
                  {(item.boundCourseCode || item.origin === "faculty-copy") && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CourseBadge item={item} />
                    </span>
                  )}
                  {item.description && (
                    <span
                      className="text-muted-foreground mt-1 line-clamp-2 max-w-[36rem] break-words whitespace-normal"
                      title={item.description}
                    >
                      {item.description}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {templateTypeLabel(item)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.statusActive ? "success" : "outline"} className="text-xs">
                    {item.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <OriginMarker item={item} />
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {item.versionCount !== undefined ? item.versionCount : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {renderFooterActions(item)}
                    {overflowMenu && <OverflowMenu>{overflowMenu}</OverflowMenu>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overflow menu (shared trigger/content shell)
// ---------------------------------------------------------------------------

function OverflowMenu({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors">
        <MoreVertical className="size-4" />
        <span className="sr-only">Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
