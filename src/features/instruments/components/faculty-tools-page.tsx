"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Edit, FileText, Send, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { showToast } from "@/components/ui/toast";
import {
  deleteFacultyTemplateAction,
  duplicateFacultyTemplateAction,
} from "@/lib/actions/faculty-template-actions";
import type { FacultyPublishedEvaluationItem } from "@/features/evaluations/types";
import { FacultyPublishedEvaluations } from "@/features/evaluations/components/faculty-published-evaluations";
import type { FacultyTemplateItem } from "../services/list-faculty-templates";
import { EvaluationToolsTabs, updateToolsUrl, type EvaluationToolsTab } from "./evaluation-tools-tabs";
import { TemplateCollection, type TemplateCollectionItem } from "./template-collection";
import { ToolsViewSelector, type ToolsViewMode } from "./tools-view-selector";

type FacultyToolsPageProps = {
  evaluations: FacultyPublishedEvaluationItem[];
  program: { code: string; id: string; name: string };
  templates: FacultyTemplateItem[];
  initialTab?: EvaluationToolsTab;
  initialView?: ToolsViewMode;
};

function templateOrigin(
  template: FacultyTemplateItem
): Pick<TemplateCollectionItem, "origin" | "originLabel"> {
  if (template.facultyOwnerId) return { origin: "faculty-copy", originLabel: "My copy" };
  if (template.programCode) return { origin: "program-owned", originLabel: "Program-owned" };
  return { origin: "institutional", originLabel: "Institutional baseline" };
}

function toTemplateItem(template: FacultyTemplateItem): TemplateCollectionItem {
  const origin = templateOrigin(template);

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    templateType: template.templateType,
    statusLabel: template.is_active ? "Active" : "Inactive",
    statusActive: template.is_active,
    origin: origin.origin,
    originLabel: origin.originLabel,
    secondaryMeta: template.programCode ?? undefined,
    facultyAccessible: template.is_faculty_accessible,
    versionCount: template.versionCount,
    canPublish: Boolean(template.facultyOwnerId),
  };
}

export function FacultyToolsPage({
  evaluations,
  program,
  templates,
  initialTab = "templates",
  initialView = "card",
}: FacultyToolsPageProps) {
  const router = useRouter();
  const [view, setView] = useState<ToolsViewMode>(initialView);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TemplateCollectionItem | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function selectView(nextView: ToolsViewMode) {
    setView(nextView);
    updateToolsUrl({ view: nextView });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteFacultyTemplateAction(deleteTarget.id);

      if (!result.success) {
        setDialogError(result.error);
        return;
      }

      setDeleteTarget(null);
      setDialogError(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-heading-xl text-text-primary">Evaluation Tools</h1>
        <p className="text-muted-foreground text-sm">
          Manage templates and published evaluations for{" "}
          <span className="text-link font-semibold">
            {program.code} - {program.name}
          </span>
          .
        </p>
      </div>

      <EvaluationToolsTabs
        initialTab={initialTab}
        viewControl={
          <ToolsViewSelector
            label="Evaluation tools"
            value={view}
            onValueChange={selectView}
          />
        }
        templates={
          <TemplateCollection
            view={view}
            sections={[
              {
                items: templates.map(toTemplateItem),
                renderFooterActions: (item) => <FacultyTemplateActions item={item} />,
                renderOverflowMenu: (item) =>
                  item.origin === "faculty-copy" ? (
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
                  ) : null,
              },
            ]}
            empty={
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="text-muted-foreground mx-auto mb-4 size-10" />
                  <p className="text-muted-foreground text-sm">
                    No templates with faculty access are available yet. Contact your Program Head
                    to enable faculty access on evaluation templates.
                  </p>
                </CardContent>
              </Card>
            }
          />
        }
        published={<FacultyPublishedEvaluations evaluations={evaluations} view={view} />}
      />

      {/* Delete Confirmation AlertDialog */}
      {deleteTarget && (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && isPending) return;
            if (!open) {
              setDeleteTarget(null);
              setDialogError(null);
            }
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

function FacultyTemplateActions({ item }: { item: TemplateCollectionItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateFacultyTemplateAction(item.id);

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
        render={<Link href={`/faculty/tools/${item.id}/edit`} />}
      >
        <Edit className="size-3.5" data-icon="inline-start" />
        Edit
      </Button>
      <Button variant="outline" size="sm" disabled={isPending} onClick={handleDuplicate}>
        <Copy className="size-3.5" data-icon="inline-start" />
        Duplicate
      </Button>
      {item.canPublish && (
        <Button
          size="sm"
          render={<Link href={`/faculty/cilo-evaluations/new?templateId=${item.id}`} />}
        >
          <Send className="size-3.5" data-icon="inline-start" />
          Publish
        </Button>
      )}
    </>
  );
}
