"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildProgramHeadEditToolPath,
  buildProgramHeadNewToolPath,
  buildProgramHeadPublishToolPath,
  buildProgramHeadToolsPath,
} from "@/lib/constants/program-head-routes";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProgramHeadDeploymentItem } from "@/features/evaluations/services/list-program-head-deployments";
import type { ProgramHeadTemplateItem } from "@/features/instruments/services/manage-program-head-templates";
import type { InstitutionalBaselineItem } from "@/features/instruments/services/list-institutional-baselines";
import { closeCentralDeploymentAction } from "@/lib/actions/central-deployment-actions";
import {
  deleteTemplateAction,
  duplicateTemplateAction,
  toggleTemplateActiveAction,
} from "@/lib/actions/program-head-template-actions";

type ProgramHeadToolsPageProps = {
  templates: ProgramHeadTemplateItem[];
  deployments: ProgramHeadDeploymentItem[];
  baselines: InstitutionalBaselineItem[];
  program: { id: string; code: string; name: string };
};

function formatDate(date: Date | string | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStakeholder(stakeholder: string): string {
  return stakeholder
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Returns accessible Tailwind bg+text classes for each target stakeholder. */
function getTargetStakeholderBadgeClass(stakeholder: string): string {
  switch (stakeholder) {
    case "STUDENT":
      return "bg-emerald-100 text-emerald-700";
    case "ALUMNI":
      return "bg-amber-100 text-amber-800";
    case "INDUSTRY_PARTNER":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function ProgramHeadToolsPage({
  templates,
  deployments,
  baselines,
  program,
}: ProgramHeadToolsPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get("tab") === "published" ? "published" : "templates";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tight">Evaluation Tools</h1>
          <p className="font-body text-on-surface-variant mt-2 text-sm">
            Manage templates and published deployments for{" "}
            <span className="font-semibold">{program.name}</span>.
          </p>
        </div>
      </div>

      <Tabs value={defaultTab} onValueChange={(v) => router.push(buildProgramHeadToolsPath(program.id, v as "templates" | "published"))} className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="h-auto gap-4">
            <TabsTrigger value="templates" className="px-1 py-2.5 text-sm">
              Templates
            </TabsTrigger>
            <TabsTrigger value="published" className="px-1 py-2.5 text-sm">
              Published
            </TabsTrigger>
          </TabsList>

          <Button
            render={<Link href={buildProgramHeadNewToolPath(program.id)} />}
            className="bg-primary font-label text-on-primary hover:bg-primary-hover shrink-0 font-semibold"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Create New Template
          </Button>
        </div>

        <TabsContent value="templates" className="pt-6">
           <TemplatesGrid templates={templates} baselines={baselines} programId={program.id} />
        </TabsContent>

        <TabsContent value="published" className="pt-6">
           <PublishedDeploymentsTable deployments={deployments} programId={program.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplatesGrid({
  templates,
  baselines,
  programId,
}: {
  templates: ProgramHeadTemplateItem[];
  baselines: InstitutionalBaselineItem[];
  programId: string;
}) {
  const hasContent = templates.length > 0 || baselines.length > 0;

  if (!hasContent) {
    return (
      <div className="border-outline-variant rounded-xl border-2 border-dashed py-16 text-center">
        <p className="font-body text-on-surface-variant">
          No templates found. Create your first template or import from institutional baselines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Program Templates */}
      {templates.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-label text-text-secondary text-xs font-semibold tracking-[0.05em] uppercase">
            Program Templates
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
             {templates.map((template) => (
               <TemplateCard key={template.id} template={template} programId={programId} />
            ))}
          </div>
        </div>
      )}

      {/* Institutional Baselines */}
      {baselines.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-label text-text-secondary text-xs font-semibold tracking-[0.05em] uppercase">
            Institutional Baselines (Copy to Customize)
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
             {baselines.map((baseline) => (
               <BaselineCard key={baseline.id} baseline={baseline} programId={programId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, programId }: { template: ProgramHeadTemplateItem; programId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isProgramWide = template.template_type === "PROGRAM_WIDE";

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
       const result = await duplicateTemplateAction(programId, template.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
       const result = await toggleTemplateActiveAction(programId, template.id, !template.is_active);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    setError(null);
    startTransition(async () => {
       const result = await deleteTemplateAction(programId, template.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setShowDeleteDialog(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="group bg-surface-container-lowest relative flex flex-col rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`font-label inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
              template.is_active
                ? "bg-success/15 text-success"
                : "border-border text-text-muted border bg-transparent"
            }`}
          >
            {template.is_active ? "Active" : "Inactive"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-text-muted hover:bg-surface-muted hover:text-text-primary inline-flex size-7 items-center justify-center rounded-md transition-colors">
              <MoreVertical className="size-4" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem disabled={isPending} onClick={handleToggleActive}>
                {template.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isPending}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-headline text-on-surface text-lg font-semibold">{template.name}</h3>
        <p className="font-body text-on-surface-variant mt-1 line-clamp-2 text-sm">
          {template.description ?? "No description."}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-label text-on-surface-variant text-xs font-semibold tracking-[0.05em] uppercase">
            Program-owned - {template._count.versions} version(s)
          </span>
          <Badge variant="outline" className="text-xs">
            {isProgramWide ? "Program-wide" : "Course-bound"}
          </Badge>
          {template.is_faculty_accessible && (
            <Badge variant="outline" className="text-xs">
              Faculty Access
            </Badge>
          )}
        </div>

        {error && <p className="text-error mt-2 text-xs font-medium">{error}</p>}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={isPending}
             render={<Link href={buildProgramHeadEditToolPath(programId, template.id)} />}
          >
            <Pencil className="size-3.5" data-icon="inline-start" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={isPending}
            onClick={handleDuplicate}
          >
            <Copy className="size-3.5" data-icon="inline-start" />
            Duplicate
          </Button>
          <Button
            size="sm"
            className="bg-primary text-on-primary hover:bg-primary-hover flex-1"
            disabled={isPending || !isProgramWide}
            render={
              isProgramWide ? (
                 <Link href={buildProgramHeadPublishToolPath(programId, template.id)} />
              ) : undefined
            }
          >
            <Send className="size-3.5" data-icon="inline-start" />
            Publish
          </Button>
        </div>
      </div>

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{template.name}</span>?{" "}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleConfirmDelete}>
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BaselineCard({ baseline, programId }: { baseline: InstitutionalBaselineItem; programId: string }) {
  const isProgramWide = baseline.template_type === "PROGRAM_WIDE";

  return (
    <div className="bg-surface group border-outline-variant hover:border-outline relative flex flex-col overflow-hidden rounded-xl border transition-all">
      {/* Header */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-body text-on-surface line-clamp-2 text-base font-semibold">
              {baseline.name}
            </h3>
          </div>
          <Badge variant="outline" className="shrink-0">
            Institutional
          </Badge>
        </div>
        <p className="font-body text-on-surface-variant line-clamp-2 text-sm">
          {baseline.description || "No description"}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Badge variant={isProgramWide ? "default" : "outline"}>
          {isProgramWide ? "Program-wide" : "Course-bound"}
        </Badge>
        {baseline.is_faculty_accessible && <Badge variant="outline">Faculty Accessible</Badge>}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center justify-end gap-2 border-t p-4">
        <Button
          variant="outline"
          size="sm"
           render={<Link href={buildProgramHeadEditToolPath(programId, baseline.id)} />}
        >
          <Pencil className="mr-1 size-3.5" />
          Edit & Copy
        </Button>
      </div>
    </div>
  );
}

type DeploymentStatusFilter = "ALL" | "ACTIVE" | "SCHEDULED" | "CLOSED" | "ARCHIVED";

const PAGE_SIZE = 10;

function PublishedDeploymentsTable({ deployments, programId }: { deployments: ProgramHeadDeploymentItem[]; programId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<DeploymentStatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [localDeployments, setLocalDeployments] = useState(deployments);

  // Update local deployments when props change
  if (JSON.stringify(deployments) !== JSON.stringify(localDeployments)) {
    setLocalDeployments(deployments);
  }

  const filteredDeployments = localDeployments.filter((d) => {
    if (statusFilter === "ALL") return d.status !== "ARCHIVED";
    return d.status === statusFilter;
  });

  // ---- Pagination -----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredDeployments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDeployments = filteredDeployments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleFilterChange(value: DeploymentStatusFilter) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function buildPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleClose(deploymentId: string) {
    startTransition(async () => {
       const result = await closeCentralDeploymentAction(programId, deploymentId);
      if (!result.success) {
        return;
      }
      // Optimistic update
      setLocalDeployments((prev) =>
        prev.map((d) => (d.id === deploymentId ? { ...d, status: "CLOSED" } : d))
      );
      router.refresh();
    });
  }

  const filterButtons: { label: string; value: DeploymentStatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Closed", value: "CLOSED" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  if (localDeployments.length === 0) {
    return (
      <div className="border-outline-variant rounded-xl border-2 border-dashed py-16 text-center">
        <p className="font-body text-on-surface-variant">No published tools yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={statusFilter === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Table Header */}
      <div className="bg-muted text-muted-foreground hidden rounded-lg px-4 py-2 text-xs font-semibold tracking-wider uppercase md:grid md:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto]">
        <span className="w-8" />
        <span>Published Form</span>
        <span>Target</span>
        <span>Academic Period</span>
        <span>Status</span>
        <span>Responses</span>
        <span>Published</span>
        <span className="w-8" />
      </div>

      {/* Table Rows */}
      <div className="space-y-2">
        {filteredDeployments.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No {statusFilter.toLowerCase()} deployments found.
            </p>
          </div>
        ) : (
          paginatedDeployments.map((deployment) => (
            <DeploymentAccordionRow
              key={deployment.id}
              deployment={deployment}
              isExpanded={expandedRows.has(deployment.id)}
              onToggle={() => toggleRow(deployment.id)}
              onClose={() => handleClose(deployment.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ←
          </Button>
          {buildPageNumbers().map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="text-muted-foreground px-2 text-sm">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === safePage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            →
          </Button>
        </div>
      )}

      {/* Result count */}
      <p className="text-muted-foreground text-center text-xs pt-2">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredDeployments.length)} of {filteredDeployments.length} deployment
        {filteredDeployments.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function DeploymentAccordionRow({
  deployment,
  isExpanded,
  onToggle,
  onClose,
}: {
  deployment: ProgramHeadDeploymentItem;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const canClose = deployment.status === "ACTIVE" || deployment.status === "SCHEDULED";

  const responseRate =
    deployment.assignmentCount > 0
      ? (deployment.responseCount / deployment.assignmentCount) * 100
      : 0;

  return (
    <div className="bg-card rounded-lg border">
      {/* Main Row */}
      <div
        className={`hover:bg-muted/50 grid cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors md:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto] ${
          isPending ? "opacity-60" : ""
        }`}
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <div className="flex w-8 items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </div>

        {/* Deployment Name */}
        <div>
          <p className="font-semibold">{deployment.templateName}</p>
        </div>

        {/* Target */}
        <div>
          <Badge className={`text-xs ${getTargetStakeholderBadgeClass(deployment.target_stakeholder)}`}>
            {formatStakeholder(deployment.target_stakeholder)}
          </Badge>
        </div>

        {/* Academic Period */}
        <div className="text-muted-foreground text-sm">
          {deployment.termInstanceLabel ?? "—"}
        </div>

        {/* Status */}
        <div>
          <Badge
            variant={
              deployment.status === "ACTIVE"
                ? "default"
                : "outline"
            }
            className="text-xs"
          >
            {deployment.status.charAt(0) + deployment.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Responses */}
        <div className="text-muted-foreground text-sm">
          {deployment.responseCount}/{deployment.assignmentCount}
        </div>

        {/* Published Date */}
        <div className="text-muted-foreground text-sm">{formatDate(deployment.created_at)}</div>

        {/* Actions */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              render={
                <button type="button" className="hover:bg-muted inline-flex size-8 cursor-pointer items-center justify-center rounded-md">
                  <MoreVertical className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onToggle()}>
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              {canClose && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(onClose);
                    }}
                  >
                    <XCircle className="mr-2 size-4" />
                    Close Deployment
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-4 py-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Column 1: Deployment Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Deployment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Program</span>
                  <span>
                    {deployment.programCode} - {deployment.programName}
                  </span>
                </div>
                {deployment.majorName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Major</span>
                    <span>{deployment.majorName}</span>
                  </div>
                )}
                {deployment.yearLevelName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year Level</span>
                    <span>{deployment.yearLevelName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <span>{formatStakeholder(deployment.target_stakeholder)}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Response Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Response Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Assignments</span>
                  <span className="font-medium">{deployment.assignmentCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Responses</span>
                  <span className="font-medium">{deployment.responseCount}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Response Rate</span>
                    <span>{responseRate.toFixed(0)}%</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${responseRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{formatDate(deployment.created_at)}</span>
                </div>
                {deployment.activation_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activation</span>
                    <span>{formatDate(deployment.activation_at)}</span>
                  </div>
                )}
                {deployment.deadline_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span>{formatDate(deployment.deadline_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
