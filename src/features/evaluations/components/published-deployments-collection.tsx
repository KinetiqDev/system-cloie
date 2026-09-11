"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import type { DeploymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ToolsViewMode } from "@/features/instruments/components/tools-view-selector";
import { getStatusVariant } from "./evaluation-status";

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

export type PublishedDeploymentItem = {
  id: string;
  name: string;
  /** Course summary for Course-bound evaluations, e.g. "CS 101 · Software Engineering". */
  courseLabel?: string | null;
  /** Preformatted Target Stakeholder label, e.g. "Students". */
  targetLabel?: string | null;
  periodLabel: string | null;
  status: DeploymentStatus;
  responseCount: number;
  totalCount: number;
  publishedDate: Date | null;
  canClose: boolean;
};

type PublishedDeploymentsCollectionProps = {
  view: ToolsViewMode;
  items: PublishedDeploymentItem[];
  /** Rendered when there are no deployments at all. */
  empty: ReactNode;
  /**
   * Rendered when deployments exist but the active filters match none.
   * Falls back to `empty` when omitted.
   */
  filteredEmpty?: ReactNode;
  /** Controlled status filter. Omit to keep the collection uncontrolled. */
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (filter: StatusFilter) => void;
  /** Detail panel shown when a list row expands. */
  renderExpanded?: (item: PublishedDeploymentItem) => ReactNode;
  /** Role-specific dropdown items. `ctx.view` lets callers hide list-only actions
   *  and `ctx.toggle` expands/collapses the row for the "View Details" action. */
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
  /** Role-specific inline card actions. When provided, card footers render these
   *  buttons directly instead of the overflow menu; list rows keep the menu. */
  renderCardActions?: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
  /** Optional aria label for the results list; defaults to "Published evaluations". */
  label?: string;
};

export type { PublishedStatusFilter } from "../types";

type StatusFilter = import("../types").PublishedStatusFilter;

const STATUS_FILTERS: StatusFilter[] = ["ALL", "ACTIVE", "SCHEDULED", "CLOSED", "ARCHIVED"];

const PAGE_SIZE = 10;

function useMobileCollectionLayout(): boolean {
  const getSnapshot = () =>
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
  const subscribe = (onStoreChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const media = window.matchMedia("(max-width: 767px)");
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function formatDate(date: Date | null): string {
  if (!date) return "--";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(status: DeploymentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export function PublishedDeploymentsCollection({
  view,
  items,
  empty,
  filteredEmpty,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  renderExpanded,
  renderMenuItems,
  renderCardActions,
  label = "Published evaluations",
}: PublishedDeploymentsCollectionProps) {
  const isMobile = useMobileCollectionLayout();
  const [internalStatusFilter, setInternalStatusFilter] = useState<StatusFilter>("ALL");
  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = items.filter((item) => {
    if (statusFilter === "ALL") return item.status !== "ARCHIVED";
    return item.status === statusFilter;
  });
  const statusCounts = Object.fromEntries(
    STATUS_FILTERS.map((filter) => [
      filter,
      items.filter((item) =>
        filter === "ALL" ? item.status !== "ARCHIVED" : item.status === filter
      ).length,
    ])
  ) as Record<StatusFilter, number>;

  const hasCourseColumn = items.some((item) => Boolean(item.courseLabel));
  const hasTargetColumn = items.some((item) => Boolean(item.targetLabel));
  const columnCount = 7 + (hasCourseColumn ? 1 : 0) + (hasTargetColumn ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  function handleFilterChange(filter: StatusFilter) {
    if (controlledStatusFilter === undefined) setInternalStatusFilter(filter);
    onStatusFilterChange?.(filter);
    setCurrentPage(1);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-4">
      <div
        aria-label="Filter by deployment status"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="toolbar"
      >
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "default" : "outline"}
            size="sm"
            aria-pressed={statusFilter === filter}
            className="shrink-0"
            aria-label={filter === "ALL" ? "All" : statusLabel(filter)}
            onClick={() => handleFilterChange(filter)}
          >
            {filter === "ALL" ? "All" : statusLabel(filter)}
            <span aria-hidden="true" className="tabular-nums opacity-70">
              {statusCounts[filter]}
            </span>
          </Button>
        ))}
      </div>
      {filteredItems.length === 0 ? (
        (filteredEmpty ?? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {statusFilter === "ALL"
                ? "No deployments match the selected filter."
                : `No ${statusLabel(statusFilter).toLowerCase()} deployments found.`}
            </p>
          </div>
        ))
      ) : isMobile ? (
        <PublishedCompactList
          items={paginatedItems}
          label={label}
          hasCourse={hasCourseColumn}
          hasTarget={hasTargetColumn}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
          renderExpanded={renderExpanded}
          renderMenuItems={renderMenuItems}
        />
      ) : view === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedItems.map((item) => (
            <PublishedCard
              key={item.id}
              item={item}
              hasCourse={hasCourseColumn}
              renderMenuItems={renderMenuItems}
              renderCardActions={renderCardActions}
            />
          ))}
        </div>
      ) : (
        <PublishedTable
          items={paginatedItems}
          label={label}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
          hasCourse={hasCourseColumn}
          hasTarget={hasTargetColumn}
          columnCount={columnCount}
          renderExpanded={renderExpanded}
          renderMenuItems={renderMenuItems}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="justify-center pt-4"
        />
      )}

      {/* Result count */}
      <p className="text-muted-foreground pt-2 text-center text-xs">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} deployment
        {filteredItems.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function OverflowMenu({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors pointer-coarse:size-11"
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <Badge variant={getStatusVariant(status)} className="text-xs">
      {statusLabel(status)}
    </Badge>
  );
}

function TargetBadge({ label }: { label: string }) {
  return (
    <Badge className="bg-brand-accent-soft text-brand-accent dark:text-brand-accent-highlight text-xs">
      {label}
    </Badge>
  );
}

function ResponsesSummary({
  responseCount,
  totalCount,
}: {
  responseCount: number;
  totalCount: number;
}) {
  const width = totalCount > 0 ? (responseCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Responses</span>
        <span className="font-medium tabular-nums">
          {responseCount} / {totalCount}
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card view
// ---------------------------------------------------------------------------

function PublishedCard({
  item,
  hasCourse,
  renderMenuItems,
  renderCardActions,
}: {
  item: PublishedDeploymentItem;
  hasCourse: boolean;
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
  renderCardActions?: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
}) {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base font-bold">{item.name}</CardTitle>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasCourse && item.courseLabel && (
          <p className="text-muted-foreground line-clamp-1 text-sm">{item.courseLabel}</p>
        )}
        {item.targetLabel && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Target</span>
            <TargetBadge label={item.targetLabel} />
          </div>
        )}
        {item.periodLabel && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Academic Period</span>
            <span className="text-sm">{item.periodLabel}</span>
          </div>
        )}
        <ResponsesSummary responseCount={item.responseCount} totalCount={item.totalCount} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Published</span>
          <span className="text-sm tabular-nums">{formatDate(item.publishedDate)}</span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto justify-end">
        {renderCardActions ? (
          <div className="flex flex-wrap justify-end gap-2">
            {renderCardActions(item, { view: "card", expanded: false, toggle: () => {} })}
          </div>
        ) : (
          <OverflowMenu>
            {renderMenuItems(item, { view: "card", expanded: false, toggle: () => {} })}
          </OverflowMenu>
        )}
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function PublishedTable({
  items,
  label,
  expandedIds,
  onToggle,
  hasCourse,
  hasTarget,
  columnCount,
  renderExpanded,
  renderMenuItems,
}: {
  items: PublishedDeploymentItem[];
  label: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  hasCourse: boolean;
  hasTarget: boolean;
  columnCount: number;
  renderExpanded?: (item: PublishedDeploymentItem) => ReactNode;
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border">
      <Table aria-label={label} className="min-w-[56rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            {hasCourse && <TableHead>Course</TableHead>}
            {hasTarget && <TableHead>Target</TableHead>}
            <TableHead>Academic Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responses</TableHead>
            <TableHead>Published</TableHead>
            <TableHead className="w-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <PublishedRow
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                onToggle={() => onToggle(item.id)}
                hasCourse={hasCourse}
                hasTarget={hasTarget}
                columnCount={columnCount}
                renderExpanded={renderExpanded}
                renderMenuItems={renderMenuItems}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Render-only column/toggle branching pinned by the disclosure contract tests; extraction would split one table row across files.
// fallow-ignore-next-line complexity
function PublishedRow({
  item,
  isExpanded,
  onToggle,
  hasCourse,
  hasTarget,
  columnCount,
  renderExpanded,
  renderMenuItems,
}: {
  item: PublishedDeploymentItem;
  isExpanded: boolean;
  onToggle: () => void;
  hasCourse: boolean;
  hasTarget: boolean;
  columnCount: number;
  renderExpanded?: (item: PublishedDeploymentItem) => ReactNode;
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.name}`}
            aria-expanded={isExpanded}
            aria-controls={`deployment-details-${item.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <span className="block">{item.name}</span>
        </TableCell>
        {hasCourse && (
          <TableCell>
            <span className="text-muted-foreground line-clamp-1 block max-w-[16rem] text-sm">
              {item.courseLabel ?? "—"}
            </span>
          </TableCell>
        )}
        {hasTarget && (
          <TableCell>{item.targetLabel ? <TargetBadge label={item.targetLabel} /> : "—"}</TableCell>
        )}
        <TableCell className="text-muted-foreground text-sm">{item.periodLabel ?? "—"}</TableCell>
        <TableCell>
          <StatusBadge status={item.status} />
        </TableCell>
        <TableCell className="text-sm">
          <ResponsesSummary responseCount={item.responseCount} totalCount={item.totalCount} />
        </TableCell>
        <TableCell className="text-muted-foreground text-sm tabular-nums">
          {formatDate(item.publishedDate)}
        </TableCell>
        <TableCell className="p-2">
          <div className="flex justify-end">
            <OverflowMenu>
              {renderMenuItems(item, { view: "list", expanded: isExpanded, toggle: onToggle })}
            </OverflowMenu>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && renderExpanded && (
        <TableRow id={`deployment-details-${item.id}`} className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={columnCount} className="p-4">
            {renderExpanded(item)}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PublishedCompactList({
  className,
  items,
  label,
  hasCourse,
  hasTarget,
  expandedIds,
  onToggle,
  renderExpanded,
  renderMenuItems,
}: {
  className?: string;
  items: PublishedDeploymentItem[];
  label: string;
  hasCourse: boolean;
  hasTarget: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  renderExpanded?: (item: PublishedDeploymentItem) => ReactNode;
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
}) {
  return (
    <div className={`bg-card overflow-hidden rounded-lg border ${className ?? ""}`}>
      <ul aria-label={label} className="divide-y">
        {items.map((item) => (
          <PublishedListRow
            key={item.id}
            item={item}
            hasCourse={hasCourse}
            hasTarget={hasTarget}
            expandedIds={expandedIds}
            onToggle={onToggle}
            renderExpanded={renderExpanded}
            renderMenuItems={renderMenuItems}
          />
        ))}
      </ul>
    </div>
  );
}

/** Expand/collapse disclosure for one compact mobile row. */
function CompactRowDisclosure({
  item,
  isExpanded,
  onToggle,
}: {
  item: PublishedDeploymentItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.name}`}
      aria-expanded={isExpanded}
      aria-controls={`deployment-details-${item.id}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(item.id);
      }}
    >
      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
    </Button>
  );
}

/** Course and target labels, response counts, and period for one compact row. */
function CompactRowMeta({
  item,
  hasCourse,
  hasTarget,
}: {
  item: PublishedDeploymentItem;
  hasCourse: boolean;
  hasTarget: boolean;
}) {
  const showCourse = hasCourse && Boolean(item.courseLabel);
  const showTarget = hasTarget && Boolean(item.targetLabel);

  return (
    <>
      {showCourse || showTarget ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {showCourse ? (
            <span className="text-muted-foreground text-xs">{item.courseLabel}</span>
          ) : null}
          {showTarget ? (
            <span className="text-muted-foreground text-xs">{item.targetLabel}</span>
          ) : null}
        </div>
      ) : null}
      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
        <span className="shrink-0 tabular-nums">
          {item.responseCount}/{item.totalCount} responses
        </span>
        {item.periodLabel ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">{item.periodLabel}</span>
          </>
        ) : null}
      </div>
    </>
  );
}

function PublishedListRow({
  item,
  hasCourse,
  hasTarget,
  expandedIds,
  onToggle,
  renderExpanded,
  renderMenuItems,
}: {
  item: PublishedDeploymentItem;
  hasCourse: boolean;
  hasTarget: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  renderExpanded?: (item: PublishedDeploymentItem) => ReactNode;
  renderMenuItems: (
    item: PublishedDeploymentItem,
    ctx: { view: ToolsViewMode; expanded: boolean; toggle: () => void }
  ) => ReactNode;
}) {
  const isExpanded = expandedIds.has(item.id);
  const listCtx = {
    view: "list" as ToolsViewMode,
    expanded: isExpanded,
    toggle: () => onToggle(item.id),
  };

  return (
    <li>
      <div className="flex items-center gap-2 px-2 py-3 sm:px-3">
        <CompactRowDisclosure item={item} isExpanded={isExpanded} onToggle={onToggle} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm leading-snug font-semibold">{item.name}</span>
            <StatusBadge status={item.status} />
          </div>
          <CompactRowMeta item={item} hasCourse={hasCourse} hasTarget={hasTarget} />
        </div>
        <OverflowMenu>{renderMenuItems(item, listCtx)}</OverflowMenu>
      </div>
      {isExpanded && renderExpanded ? (
        <div id={`deployment-details-${item.id}`} className="bg-muted/30 border-y px-3 py-3">
          {renderExpanded(item)}
        </div>
      ) : null}
    </li>
  );
}
