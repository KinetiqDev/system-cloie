"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildProgramHeadEditToolPath,
  buildProgramHeadNewCiloEvaluationPath,
  buildProgramHeadNewToolPath,
  buildProgramHeadPublishToolPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import { Copy, Eye, Pencil, Plus, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showToast } from "@/components/ui/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { ProgramHeadDeploymentItem } from "@/features/evaluations/services/list-program-head-deployments";
import {
  PublishedDeploymentsCollection,
  type PublishedDeploymentItem,
  type PublishedStatusFilter,
} from "@/features/evaluations/components/published-deployments-collection";
import { CloseEvaluationDialog } from "@/features/evaluations/components/close-evaluation-dialog";
import { ReopenEvaluationDialog } from "@/features/evaluations/components/reopen-evaluation-dialog";
import {
  closeCentralDeploymentAction,
  reopenCentralDeploymentAction,
} from "@/lib/actions/central-deployment-actions";
import {
  distinctPeriodOptions,
  distinctTargetOptions,
  filterPublishedEvaluations,
  formatTargetStakeholder,
  hasActivePublishedFilters,
} from "@/features/evaluations/components/filter-published-evaluations";
import { ProgramHeadPublishedFilterBar } from "@/features/evaluations/components/program-head-published-filter-bar";
import {
  DEFAULT_PUBLISHED_FILTERS,
  normalizePublishedQuery,
  updatePublishedFiltersUrl,
  type PublishedEvaluationFilters,
} from "./tools-view-state";
import {
  deleteTemplateAction,
  duplicateTemplateAction,
  toggleTemplateActiveAction,
} from "@/lib/actions/program-head-template-actions";
import { cn } from "@/lib/utils";
import type { ProgramHeadTemplateItem } from "@/features/instruments/services/manage-program-head-templates";
import type { InstitutionalBaselineItem } from "@/features/instruments/services/list-institutional-baselines";
import {
  EvaluationToolsTabs,
  updateToolsUrl,
  type EvaluationToolsTab,
} from "./evaluation-tools-tabs";
import { TemplateCollection, type TemplateCollectionItem } from "./template-collection";
import { ToolsViewSelector, type ToolsViewMode } from "./tools-view-selector";

type ProgramHeadToolsPageProps = {
  templates: ProgramHeadTemplateItem[];
  deployments: ProgramHeadDeploymentItem[];
  baselines: InstitutionalBaselineItem[];
  program: { id: string; code: string; name: string };
  initialTab?: EvaluationToolsTab;
  initialView?: ToolsViewMode;
  initialPublishedFilters?: PublishedEvaluationFilters;
};

function toTemplateItem(template: ProgramHeadTemplateItem): TemplateCollectionItem {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    templateType: template.template_type,
    statusLabel: template.is_active ? "Active" : "Inactive",
    statusActive: template.is_active,
    origin: "program-owned",
    originLabel: "Program-owned",
    facultyAccessible: template.is_faculty_accessible,
    versionCount: template._count.versions,
    canPublish: true,
  };
}

function toBaselineItem(baseline: InstitutionalBaselineItem): TemplateCollectionItem {
  return {
    id: baseline.id,
    name: baseline.name,
    description: baseline.description,
    templateType: baseline.template_type,
    statusLabel: baseline.is_active ? "Active" : "Inactive",
    statusActive: baseline.is_active,
    origin: "institutional",
    originLabel: "Institutional baseline",
    facultyAccessible: baseline.is_faculty_accessible,
  };
}

export function ProgramHeadToolsPage({
  templates,
  deployments,
  baselines,
  program,
  initialTab = "templates",
  initialView = "card",
  initialPublishedFilters = DEFAULT_PUBLISHED_FILTERS,
}: ProgramHeadToolsPageProps) {
  const router = useRouter();
  const [view, setView] = useState<ToolsViewMode>(initialView);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TemplateCollectionItem | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function selectView(nextView: ToolsViewMode) {
    setView(nextView);
    updateToolsUrl({ view: nextView });
  }

  function handleToggleActive(item: TemplateCollectionItem) {
    startTransition(async () => {
      const result = await toggleTemplateActiveAction(program.id, item.id, !item.statusActive);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(program.id, deleteTarget.id);
      if (!result.success) {
        setDialogError(result.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-heading-xl text-text-primary">Evaluation Tools</h1>
        <p className="text-muted-foreground text-sm">
          Manage templates and published deployments for{" "}
          <span className="font-semibold">{program.name}</span>.
        </p>
      </div>

      <EvaluationToolsTabs
        initialTab={initialTab}
        action={
          <Button
            render={<Link href={buildProgramHeadNewToolPath(program.id)} />}
            className="shrink-0"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Create New Template
          </Button>
        }
        viewControl={
          <ToolsViewSelector label="Evaluation tools" value={view} onValueChange={selectView} />
        }
        templates={
          <TemplateCollection
            view={view}
            sections={[
              {
                heading: "Program Templates",
                items: templates.map(toTemplateItem),
                renderFooterActions: (item) => (
                  <ProgramHeadTemplateActions item={item} programId={program.id} />
                ),
                renderOverflowMenu: (item) => (
                  <>
                    <DropdownMenuItem disabled={isPending} onClick={() => handleToggleActive(item)}>
                      {item.statusActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => {
                        setDialogError(null);
                        setDeleteTarget(item);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ),
              },
              {
                heading: "Institutional Baselines",
                items: baselines.map(toBaselineItem),
                renderFooterActions: (item) => (
                  <BaselineActions item={item} programId={program.id} />
                ),
              },
            ]}
            empty={
              <div className="border-border rounded-xl border-2 border-dashed py-16 text-center">
                <p className="text-muted-foreground">
                  No templates found. Create your first template or import from institutional
                  baselines.
                </p>
              </div>
            }
          />
        }
        published={
          <ProgramHeadPublishedDeployments
            deployments={deployments}
            programId={program.id}
            view={view}
            initialFilters={initialPublishedFilters}
          />
        }
      />

      {/* Delete Confirmation AlertDialog */}
      {deleteTarget && (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && isPending) return;
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {dialogError && (
              <Alert variant="destructive">
                <AlertDescription>{dialogError}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleConfirmDelete} loading={isPending}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template actions (shared card anatomy, Program Head capabilities)
// ---------------------------------------------------------------------------

function ProgramHeadTemplateActions({
  item,
  programId,
}: {
  item: TemplateCollectionItem;
  programId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTemplateAction(programId, item.id);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={buildProgramHeadEditToolPath(programId, item.id)} />}
      >
        <Pencil className="size-3.5" data-icon="inline-start" />
        Edit
      </Button>
      <Button variant="outline" size="sm" disabled={isPending} onClick={handleDuplicate}>
        <Copy className="size-3.5" data-icon="inline-start" />
        Duplicate
      </Button>
      <Button
        size="sm"
        disabled={isPending}
        render={
          item.templateType === "PROGRAM_WIDE" ? (
            <Link href={buildProgramHeadPublishToolPath(programId, item.id)} />
          ) : (
            <Link href={buildProgramHeadNewCiloEvaluationPath(programId)} />
          )
        }
      >
        <Send className="size-3.5" data-icon="inline-start" />
        Publish
      </Button>
    </>
  );
}

function BaselineActions({ item, programId }: { item: TemplateCollectionItem; programId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTemplateAction(programId, item.id);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      showToast("Template duplicated successfully.");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={buildProgramHeadEditToolPath(programId, item.id)} />}
      >
        <Pencil className="size-3.5" data-icon="inline-start" />
        Edit &amp; Copy
      </Button>
      <Button variant="outline" size="sm" disabled={isPending} onClick={handleDuplicate}>
        <Copy className="size-3.5" data-icon="inline-start" />
        Duplicate
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Published deployments (Program Head capabilities)
// ---------------------------------------------------------------------------

function sanitizeProgramHeadFilters(
  initial: PublishedEvaluationFilters,
  deployments: ProgramHeadDeploymentItem[]
): PublishedEvaluationFilters {
  const periodIds = new Set(deployments.map((item) => item.termInstanceId));
  const targets = new Set<string>(deployments.map((item) => item.target_stakeholder));
  return {
    ...initial,
    query: normalizePublishedQuery(initial.query),
    periodId:
      initial.periodId !== null && periodIds.has(initial.periodId) ? initial.periodId : null,
    // Program-head rows carry no course facet; a stale `course` URL key must not filter.
    courseId: null,
    target: initial.target !== null && targets.has(initial.target) ? initial.target : null,
  };
}

function ProgramHeadPublishedDeployments({
  deployments,
  programId,
  view,
  initialFilters = DEFAULT_PUBLISHED_FILTERS,
}: {
  deployments: ProgramHeadDeploymentItem[];
  programId: string;
  view: ToolsViewMode;
  initialFilters?: PublishedEvaluationFilters;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [filters, setFilters] = useState(() =>
    sanitizeProgramHeadFilters(initialFilters, deployments)
  );
  const [optimisticDeployments, updateDeployment] = useOptimistic(
    deployments,
    (currentDeployments, update: { id: string; status: "CLOSED" | "ACTIVE" }) =>
      currentDeployments.map((deployment) =>
        deployment.id === update.id ? { ...deployment, status: update.status } : deployment
      )
  );

  function handleClose(deploymentId: string) {
    startTransition(async () => {
      updateDeployment({ id: deploymentId, status: "CLOSED" });
      const result = await closeCentralDeploymentAction(programId, deploymentId);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
      // Close the confirmation dialog only after the action settles, so a
      // failed close keeps the context available for retry.
      setCloseTargetId(null);
    });
  }

  function handleConfirmReopen(deadlineAt: Date) {
    if (!reopenTargetId) return;
    const deploymentId = reopenTargetId;
    startTransition(async () => {
      updateDeployment({ id: deploymentId, status: "ACTIVE" });
      const result = await reopenCentralDeploymentAction(programId, deploymentId, deadlineAt);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      showToast("Deployment reopened successfully.");
      setReopenTargetId(null);
      router.refresh();
    });
  }

  function handleFiltersChange(
    next: PublishedEvaluationFilters,
    navigation: "push" | "replace" = "push"
  ) {
    const normalized = { ...next, query: normalizePublishedQuery(next.query) };
    setFilters(normalized);
    updatePublishedFiltersUrl(normalized, navigation);
  }

  function handleStatusChange(status: PublishedStatusFilter) {
    handleFiltersChange({ ...filters, status });
  }

  const byId = new Map(optimisticDeployments.map((d) => [d.id, d]));

  const filterableDeployments = useMemo(
    () =>
      optimisticDeployments.map((deployment) => ({
        evaluationId: deployment.id,
        deploymentName: deployment.templateName,
        termInstanceId: deployment.termInstanceId,
        termInstanceLabel: deployment.termInstanceLabel,
        status: deployment.status,
        targetStakeholder: deployment.target_stakeholder,
      })),
    [optimisticDeployments]
  );
  const periodOptions = useMemo(
    () => distinctPeriodOptions(filterableDeployments),
    [filterableDeployments]
  );
  const targetOptions = useMemo(
    () => distinctTargetOptions(filterableDeployments),
    [filterableDeployments]
  );
  const visibleIds = useMemo(
    () =>
      new Set(
        filterPublishedEvaluations(filterableDeployments, filters).map((d) => d.evaluationId)
      ),
    [filterableDeployments, filters]
  );

  const items: PublishedDeploymentItem[] = optimisticDeployments
    .filter((deployment) => visibleIds.has(deployment.id))
    .map((deployment) => ({
      id: deployment.id,
      name: deployment.templateName,
      targetLabel: formatTargetStakeholder(deployment.target_stakeholder),
      periodLabel: deployment.termInstanceLabel,
      status: deployment.status,
      responseCount: deployment.responseCount,
      totalCount: deployment.assignmentCount,
      publishedDate: deployment.created_at,
      canClose: deployment.status === "ACTIVE" || deployment.status === "SCHEDULED",
    }));

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        {deployments.length > 0 && (
          <ProgramHeadPublishedFilterBar
            filters={filters}
            periods={periodOptions}
            targets={targetOptions}
            onFiltersChange={handleFiltersChange}
          />
        )}
        <PublishedDeploymentsCollection
          view={view}
          items={items}
          label="Published deployments"
          statusFilter={filters.status}
          onStatusFilterChange={handleStatusChange}
          empty={
            hasActivePublishedFilters(filters) ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
                <p className="text-muted-foreground text-sm">No deployments match these filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFiltersChange(DEFAULT_PUBLISHED_FILTERS)}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="border-border rounded-xl border-2 border-dashed py-16 text-center">
                <p className="text-muted-foreground">No published tools yet.</p>
              </div>
            )
          }
          renderExpanded={(item) => (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <dl className="grid min-w-0 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-caption">Target</dt>
                  <dd className="mt-1 font-medium">{item.targetLabel ?? "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-caption">Academic period</dt>
                  <dd className="mt-1 font-medium">{item.periodLabel ?? "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-caption">Responses</dt>
                  <dd className="mt-1 font-medium tabular-nums">
                    {item.responseCount} of {item.totalCount} submitted
                  </dd>
                </div>
              </dl>
              <Button
                render={
                  <Link
                    href={`${buildProgramHeadResponsesProgramWideDeploymentPath(programId, item.id)}?from=tools`}
                  />
                }
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-center"
              >
                <Eye data-icon="inline-start" aria-hidden="true" />
                View evaluation details
              </Button>
            </div>
          )}
          renderMenuItems={(item, ctx) => (
            <>
              {ctx.view === "list" && (
                <DropdownMenuItem
                  render={
                    <Link
                      href={`${buildProgramHeadResponsesProgramWideDeploymentPath(programId, item.id)}?from=tools`}
                    />
                  }
                >
                  <Eye data-icon="inline-start" aria-hidden="true" />
                  View Details
                </DropdownMenuItem>
              )}
              {item.canClose && (
                <>
                  {ctx.view === "list" && <DropdownMenuSeparator />}
                  <DropdownMenuItem variant="destructive" onClick={() => setCloseTargetId(item.id)}>
                    <XCircle className="mr-2 size-4" />
                    Close Deployment
                  </DropdownMenuItem>
                </>
              )}
              {item.status === "CLOSED" && (
                <>
                  {ctx.view === "list" && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => setReopenTargetId(item.id)}>
                    <RotateCcw className="mr-2 size-4" />
                    Reopen Deployment
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          renderCardActions={(item) => (
            <>
              <Link
                href={`${buildProgramHeadResponsesProgramWideDeploymentPath(programId, item.id)}?from=tools`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Eye data-icon="inline-start" aria-hidden="true" />
                View Details
              </Link>
              {item.canClose && (
                <Button variant="destructive" size="sm" onClick={() => setCloseTargetId(item.id)}>
                  <XCircle data-icon="inline-start" />
                  Close Deployment
                </Button>
              )}
              {item.status === "CLOSED" && (
                <Button variant="outline" size="sm" onClick={() => setReopenTargetId(item.id)}>
                  <RotateCcw data-icon="inline-start" />
                  Reopen Deployment
                </Button>
              )}
            </>
          )}
        />
      </div>

      <CloseEvaluationDialog
        entityLabel="Deployment"
        deploymentName={closeTargetId ? (byId.get(closeTargetId)?.templateName ?? "") : ""}
        open={closeTargetId !== null}
        onOpenChange={(open) => !open && setCloseTargetId(null)}
        onConfirm={() => {
          if (closeTargetId) handleClose(closeTargetId);
        }}
        isPending={isPending}
      />

      {reopenTargetId && (
        <ReopenEvaluationDialog
          deploymentName={byId.get(reopenTargetId)?.templateName ?? ""}
          open={reopenTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setReopenTargetId(null);
          }}
          onConfirm={handleConfirmReopen}
          isPending={isPending}
          entityLabel="Deployment"
          audienceLabel="existing assigned respondents"
        />
      )}
    </>
  );
}
