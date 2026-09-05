"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
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

type StatusFilter = "ALL" | DeploymentStatus;

const STATUS_FILTERS: StatusFilter[] = ["ALL", "ACTIVE", "SCHEDULED", "CLOSED", "ARCHIVED"];

const PAGE_SIZE = 10;

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
  renderExpanded,
  renderMenuItems,
  renderCardActions,
  label = "Published evaluations",
}: PublishedDeploymentsCollectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = items.filter((item) => {
    if (statusFilter === "ALL") return item.status !== "ARCHIVED";
    return item.status === statusFilter;
  });

  const hasCourseColumn = items.some((item) => Boolean(item.courseLabel));
  const hasTargetColumn = items.some((item) => Boolean(item.targetLabel));
  const columnCount = 7 + (hasCourseColumn ? 1 : 0) + (hasTargetColumn ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
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
      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(filter)}
          >
            {filter === "ALL" ? "All" : statusLabel(filter)}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground text-sm">
            {statusFilter === "ALL"
              ? "No deployments match the selected filter."
              : `No ${statusLabel(statusFilter).toLowerCase()} deployments found.`}
          </p>
        </div>
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
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
      >
        <MoreVertical className="size-4" />
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
    <div className="space-y-1">
      <span className="text-sm tabular-nums">
        {responseCount} / {totalCount}
      </span>
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
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
