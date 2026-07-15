"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripVertical, ListChecks, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteGOAction, reorderGOsAction } from "@/lib/actions/program-head-outcome-actions";
import { GOFormDialog } from "./go-form-dialog";
import type { ProgramGOItem } from "../services/manage-program-head-outcomes";

type ProgramHeadOutcomesPageProps = {
  gos: ProgramGOItem[];
  program: { id: string; code: string; name: string };
};

function SortableGORow({
  go,
  onEdit,
  onDelete,
}: {
  go: ProgramGOItem;
  onEdit: (go: ProgramGOItem) => void;
  onDelete: (go: ProgramGOItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: go.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-surface border-border flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-shadow ${
        isDragging ? "shadow-lg opacity-90" : "hover:shadow-md"
      }`}
    >
      {/* Drag Handle */}
      <button
        className="text-text-muted hover:text-text-secondary mt-0.5 cursor-grab touch-none p-1 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="shrink-0 font-semibold">
            {go.code}
          </Badge>
          {go._count.cilo_mappings > 0 ? (
            <Badge
              variant="outline"
              className="border-success/40 bg-success/10 text-success shrink-0 text-xs"
            >
              {go._count.cilo_mappings} {go._count.cilo_mappings === 1 ? "CILO" : "CILOs"} mapped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-text-muted shrink-0 text-xs">
              No mappings
            </Badge>
          )}
        </div>
        <p className="text-body-md text-text-secondary leading-relaxed">{go.description}</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-text-muted hover:text-text-primary h-8 w-8"
          title="Edit"
          onClick={() => onEdit(go)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-text-muted hover:text-danger h-8 w-8"
          title="Delete"
          onClick={() => onDelete(go)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ProgramHeadOutcomesPage({ gos: initialGOs, program }: ProgramHeadOutcomesPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedGOs, setOrderedGOs] = useState<ProgramGOItem[]>(initialGOs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGO, setEditingGO] = useState<ProgramGOItem | null>(null);
  const [deletingGO, setDeletingGO] = useState<ProgramGOItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalGOs = orderedGOs.length;
  const withMappings = orderedGOs.filter((go) => go._count.cilo_mappings > 0).length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedGOs((prev) => {
        const oldIndex = prev.findIndex((g) => g.id === active.id);
        const newIndex = prev.findIndex((g) => g.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);

        if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
        reorderTimerRef.current = setTimeout(() => {
          reorderGOsAction(reordered.map((g) => g.id));
        }, 600);

        return reordered;
      });
    },
    []
  );

  function handleDelete(go: ProgramGOItem) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteGOAction(go.id);

      if (!result.success) {
        setDeleteError(result.error);
        return;
      }

      setDeletingGO(null);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-text-primary text-3xl font-bold tracking-tight lg:text-4xl">
            Graduate Outcomes
          </h1>
          <p className="text-text-muted mt-1 text-sm">{program.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/program-head/outcomes/mapping">
            <Button variant="outline" size="sm" className="gap-2">
              <ListChecks className="h-4 w-4" />
              CILO Mappings
            </Button>
          </Link>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add GO
          </Button>
        </div>
      </div>

      {/* Inline Stats */}
      {totalGOs > 0 && (
        <div className="border-border bg-surface-alt mb-6 flex items-center gap-6 rounded-lg border px-5 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-text-primary text-2xl font-bold">{totalGOs}</span>
            <span className="text-text-muted text-sm">Total GOs</span>
          </div>
          <div className="bg-border h-5 w-px" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-success text-2xl font-bold">{withMappings}</span>
            <span className="text-text-muted text-sm">Mapped to CILOs</span>
          </div>
          {totalGOs - withMappings > 0 && (
            <>
              <div className="bg-border h-5 w-px" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-text-muted text-2xl font-bold">
                  {totalGOs - withMappings}
                </span>
                <span className="text-text-muted text-sm">Unmapped</span>
              </div>
            </>
          )}
          <p className="text-text-muted ml-auto hidden text-xs sm:block">
            Drag rows to reorder
          </p>
        </div>
      )}

      {/* GO List */}
      {orderedGOs.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="bg-surface-alt mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <ListChecks className="text-text-muted h-6 w-6" />
          </div>
          <p className="text-text-primary font-semibold">No Graduate Outcomes yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Add your first GO to start tracking program outcomes.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add GO
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedGOs.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedGOs.map((go) => (
                <SortableGORow
                  key={go.id}
                  go={go}
                  onEdit={setEditingGO}
                  onDelete={(g) => {
                    setDeleteError(null);
                    setDeletingGO(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Dialog */}
      <GOFormDialog mode="create" open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Edit Dialog */}
      {editingGO && (
        <GOFormDialog
          mode="edit"
          go={editingGO}
          open={!!editingGO}
          onOpenChange={(open) => {
            if (!open) setEditingGO(null);
          }}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={!!deletingGO}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingGO(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Graduate Outcome</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-text-primary">{deletingGO?.code}</strong>? This action cannot
              be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-danger-soft text-danger rounded-md p-3 text-sm">{deleteError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeletingGO(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => deletingGO && handleDelete(deletingGO)}
            >
              {isPending ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
