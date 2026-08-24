"use client";

import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { ToolsViewMode } from "./tools-view-selector";

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
  /** Omitted when the source cannot report a version count (e.g. baselines). */
  versionCount?: number;
  /** Whether the role may publish this template (renders the Publish action). */
  canPublish?: boolean;
};

type TemplateSection = {
  heading?: string;
  items: TemplateCollectionItem[];
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
// Collection
// ---------------------------------------------------------------------------

export function TemplateCollection({ view, sections, empty }: TemplateCollectionProps) {
  const filledSections = sections.filter((section) => section.items.length > 0);

  if (filledSections.length === 0) return <>{empty}</>;

  return (
    <div className={view === "card" ? "space-y-8" : "space-y-6"}>
      {filledSections.map((section) => (
        <section key={section.heading ?? "templates"} className="space-y-4">
          {section.heading && (
            <h3 className="text-label-sm text-muted-foreground tracking-wider uppercase">
              {section.heading}
            </h3>
          )}
          {view === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <TemplateCard
                  key={item.id}
                  item={item}
                  renderFooterActions={section.renderFooterActions}
                  renderOverflowMenu={section.renderOverflowMenu}
                />
              ))}
            </div>
          ) : (
            <TemplateTable
              items={section.items}
              renderFooterActions={section.renderFooterActions}
              renderOverflowMenu={section.renderOverflowMenu}
              sectionHeading={section.heading}
            />
          )}
        </section>
      ))}
    </div>
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
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base font-bold">{item.name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={item.statusActive ? "success" : "outline"}>{item.statusLabel}</Badge>
            {renderOverflowMenu && <OverflowMenu>{renderOverflowMenu(item)}</OverflowMenu>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
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

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function TemplateTable({
  items,
  renderFooterActions,
  renderOverflowMenu,
  sectionHeading,
}: {
  items: TemplateCollectionItem[];
  renderFooterActions: (item: TemplateCollectionItem) => ReactNode;
  renderOverflowMenu?: (item: TemplateCollectionItem) => ReactNode;
  sectionHeading?: string;
}) {
  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table aria-label={sectionHeading ?? "Evaluation templates"} className="min-w-[44rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Versions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              <TableCell>
                <span className="block font-medium">{item.name}</span>
                {item.description && (
                  <span className="text-muted-foreground line-clamp-1 block max-w-[36rem]">
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
                  {renderOverflowMenu && <OverflowMenu>{renderOverflowMenu(item)}</OverflowMenu>}
                </div>
              </TableCell>
            </TableRow>
          ))}
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
