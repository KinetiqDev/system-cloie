"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/components/ui/toast";
import {
  toggleAdminTemplateActiveAction,
  duplicateAdminTemplateAction,
  deleteAdminTemplateAction,
} from "@/lib/actions/admin-template-actions";
import { TemplateCollection, type TemplateCollectionItem } from "./template-collection";
import { ToolsViewSelector, type ToolsViewMode } from "./tools-view-selector";
import { updateToolsUrl } from "./evaluation-tools-tabs";

type TemplateActions = {
  onToggleActive: (
    id: string,
    is_active: boolean
  ) => Promise<{ success: true } | { success: false; error: string }>;
  onDuplicate: (id: string) => Promise<{ success: true } | { success: false; error: string }>;
  onDelete: (id: string) => Promise<{ success: true } | { success: false; error: string }>;
};

const DEFAULT_ACTIONS: TemplateActions = {
  onToggleActive: toggleAdminTemplateActiveAction,
  onDuplicate: duplicateAdminTemplateAction,
  onDelete: deleteAdminTemplateAction,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  template_type: "PROGRAM_WIDE" | "COURSE_BOUND";
  is_active: boolean;
  is_faculty_accessible: boolean;
  _count: { versions: number };
};

type ManagementToolsPageProps = {
  templates: TemplateItem[];
  basePath?: string;
  actions?: TemplateActions;
  initialView?: ToolsViewMode;
};

function toTemplateItem(template: TemplateItem): TemplateCollectionItem {
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    description: template.description,
    templateType: template.template_type,
    statusLabel: template.is_active ? "Active" : "Inactive",
    statusActive: template.is_active,
    origin: "institutional",
    originLabel: "Institutional baseline",
    facultyAccessible: template.is_faculty_accessible,
    versionCount: template._count.versions,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManagementToolsPage({
  templates,
  basePath = "/secretary/instruments",
  actions = DEFAULT_ACTIONS,
  initialView = "card",
}: ManagementToolsPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);
  const [view, setView] = useState<ToolsViewMode>(initialView);

  function selectView(nextView: ToolsViewMode) {
    setView(nextView);
    updateToolsUrl({ view: nextView });
  }

  function handleToggleActive(id: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await actions.onToggleActive(id, !currentActive);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await actions.onDuplicate(id);
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
      const result = await actions.onDelete(deleteTarget.id);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-heading-xl text-text-primary">Evaluation Tools</h1>
          <p className="text-muted-foreground text-sm">
            Manage institutional baseline evaluation templates. These templates can be adopted by
            program heads for their programs.
          </p>
        </div>
        <Button render={<Link href={`${basePath}/new`} />} className="shrink-0">
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <ToolsViewSelector label="Templates" value={view} onValueChange={selectView} />
      </div>

      {/* Templates Collection */}
      <TemplateCollection
        view={view}
        sections={[
          {
            items: templates.map(toTemplateItem),
            renderFooterActions: (item) => (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`${basePath}/${item.id}/edit`} />}
                >
                  <Pencil className="size-3.5" data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDuplicate(item.id)}
                >
                  <Copy className="size-3.5" data-icon="inline-start" />
                  Duplicate
                </Button>
              </>
            ),
            renderOverflowMenu: (item) => (
              <>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => handleToggleActive(item.id, item.statusActive)}
                >
                  {item.statusActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() =>
                    setDeleteTarget({ id: item.id, name: item.name, code: item.code ?? "" })
                  }
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </>
            ),
          },
        ]}
        empty={
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No baseline templates yet. Click &quot;Create Template&quot; to build your first
                evaluation tool.
              </p>
            </CardContent>
          </Card>
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
                <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.code})?
                This action cannot be undone and will remove all associated versions.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
