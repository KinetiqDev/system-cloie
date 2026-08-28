"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildProgramHeadEditToolPath,
  buildProgramHeadNewCiloEvaluationPath,
  buildProgramHeadNewToolPath,
  buildProgramHeadPublishToolPath,
} from "@/lib/constants/program-head-routes";
import { Copy, Eye, Pencil, Plus, Send, Trash2, XCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { ProgramHeadDeploymentItem } from "@/features/evaluations/services/list-program-head-deployments";
import {
  PublishedDeploymentsCollection,
  type PublishedDeploymentItem,
} from "@/features/evaluations/components/published-deployments-collection";
import { CloseEvaluationDialog } from "@/features/evaluations/components/close-evaluation-dialog";
import { closeCentralDeploymentAction } from "@/lib/actions/central-deployment-actions";
import {
  deleteTemplateAction,
  duplicateTemplateAction,
  toggleTemplateActiveAction,
} from "@/lib/actions/program-head-template-actions";
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
  return (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={buildProgramHeadEditToolPath(programId, item.id)} />}
    >
      <Pencil className="size-3.5" data-icon="inline-start" />
      Edit &amp; Copy
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Published deployments (Program Head capabilities)
// ---------------------------------------------------------------------------

function ProgramHeadPublishedDeployments({
  deployments,
  programId,
  view,
}: {
  deployments: ProgramHeadDeploymentItem[];
  programId: string;
  view: ToolsViewMode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);
  const [optimisticDeployments, updateDeployment] = useOptimistic(
    deployments,
    (currentDeployments, closedDeploymentId: string) =>
      currentDeployments.map((deployment) =>
        deployment.id === closedDeploymentId
          ? { ...deployment, status: "CLOSED" as const }
          : deployment
      )
  );

  function handleClose(deploymentId: string) {
    startTransition(async () => {
      updateDeployment(deploymentId);
      const result = await closeCentralDeploymentAction(programId, deploymentId);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  const byId = new Map(optimisticDeployments.map((d) => [d.id, d]));

  const items: PublishedDeploymentItem[] = optimisticDeployments.map((deployment) => ({
    id: deployment.id,
    name: deployment.templateName,
    targetLabel: formatStakeholder(deployment.target_stakeholder),
    periodLabel: deployment.termInstanceLabel,
    status: deployment.status,
    responseCount: deployment.responseCount,
    totalCount: deployment.assignmentCount,
    publishedDate: deployment.created_at,
    canClose: deployment.status === "ACTIVE" || deployment.status === "SCHEDULED",
  }));

  return (
    <>
      <PublishedDeploymentsCollection
        view={view}
        items={items}
        label="Published deployments"
        empty={
          <div className="border-border rounded-xl border-2 border-dashed py-16 text-center">
            <p className="text-muted-foreground">No published tools yet.</p>
          </div>
        }
        renderExpanded={(item) => {
          const deployment = byId.get(item.id);
          if (!deployment) return null;
          return <DeploymentExpandedDetails deployment={deployment} />;
        }}
        renderMenuItems={(item, ctx) => (
          <>
            {ctx.view === "list" && (
              <DropdownMenuItem onClick={ctx.toggle}>
                <Eye className="mr-2 size-4" />
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
          </>
        )}
        renderCardActions={(item) => (
          <>
            <Button variant="outline" size="sm" onClick={() => setDetailId(item.id)}>
              <Eye data-icon="inline-start" />
              View Details
            </Button>
            {item.canClose && (
              <Button variant="destructive" size="sm" onClick={() => setCloseTargetId(item.id)}>
                <XCircle data-icon="inline-start" />
                Close Deployment
              </Button>
            )}
          </>
        )}
      />

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detailId ? (byId.get(detailId)?.templateName ?? "") : ""}</DialogTitle>
            <DialogDescription>Deployment details</DialogDescription>
          </DialogHeader>
          {detailId && byId.get(detailId) && (
            <DeploymentExpandedDetails deployment={byId.get(detailId)!} />
          )}
        </DialogContent>
      </Dialog>

      <CloseEvaluationDialog
        entityLabel="Deployment"
        deploymentName={closeTargetId ? (byId.get(closeTargetId)?.templateName ?? "") : ""}
        open={closeTargetId !== null}
        onOpenChange={(open) => !open && setCloseTargetId(null)}
        onConfirm={() => {
          if (closeTargetId) {
            handleClose(closeTargetId);
            setCloseTargetId(null);
          }
        }}
        isPending={isPending}
      />
    </>
  );
}

function DeploymentExpandedDetails({ deployment }: { deployment: ProgramHeadDeploymentItem }) {
  const responseRate =
    deployment.assignmentCount > 0
      ? (deployment.responseCount / deployment.assignmentCount) * 100
      : 0;

  return (
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
  );
}
