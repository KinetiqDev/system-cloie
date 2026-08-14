"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
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
import { Edit, GripVertical, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { deleteGOAction, reorderGOsAction, restoreGOAction } from "@/lib/actions/program-head-outcome-actions";
import { GOFormDialog } from "./go-form-dialog";
import type { ProgramGOItem } from "../services/manage-program-head-outcomes";
import { buildProgramHeadOutcomeMappingPath } from "@/lib/constants/program-head-routes";

type ProgramHeadOutcomesPageProps = {
  gos: ProgramGOItem[];
  program: { id: string; code: string; name: string };
};

function SortableGORow({
  go,
  onEdit,
  onDelete,
  onRestore,
}: {
  go: ProgramGOItem;
  onEdit: (go: ProgramGOItem) => void;
  onDelete: (go: ProgramGOItem) => void;
  onRestore: (go: ProgramGOItem) => void;
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
      className={`bg-card border-border flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-shadow ${
        isDragging ? "opacity-90 shadow-lg" : "hover:shadow-md"
      }`}
    >
      {/* Drag Handle */}
      <button
        className="text-muted-foreground hover:text-foreground mt-0.5 inline-flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
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
          {!go.is_active && (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              Archived
            </Badge>
          )}
          {go._count.cilo_mappings > 0 ? (
            <Badge variant="success" className="shrink-0">
              {go._count.cilo_mappings} {go._count.cilo_mappings === 1 ? "CILO" : "CILOs"} mapped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              No mappings
            </Badge>
          )}
        </div>
        <p className="text-body-md text-muted-foreground leading-relaxed">{go.description}</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Edit ${go.code}`}
          title="Edit"
          onClick={() => onEdit(go)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {go.is_active ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive min-h-11 min-w-11"
            aria-label={`Archive ${go.code}`}
            title="Delete"
            onClick={() => onDelete(go)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Restore ${go.code}`}
            title="Restore"
            onClick={() => onRestore(go)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProgramHeadOutcomesPage({
  gos: initialGOs,
  program,
}: ProgramHeadOutcomesPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedGOs, setOrderedGOs] = useState<ProgramGOItem[]>(initialGOs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGO, setEditingGO] = useState<ProgramGOItem | null>(null);
  const [deletingGO, setDeletingGO] = useState<ProgramGOItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringGO, setRestoringGO] = useState<ProgramGOItem | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderGenerationRef = useRef(0);

  useEffect(
    () => () => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    },
    []
  );

  useEffect(() => {
    // Reconcile optimistic drag state after router.refresh() returns authoritative server props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrderedGOs(initialGOs);
  }, [initialGOs]);

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

      const oldIndex = orderedGOs.findIndex((g) => g.id === active.id);
      const newIndex = orderedGOs.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(orderedGOs, oldIndex, newIndex);
      const generation = ++reorderGenerationRef.current;
      setOrderedGOs(reordered);
      setReorderError(null);

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const result = await reorderGOsAction(
              program.id,
              reordered.map((g) => g.id)
            );
            if (!result.success && reorderGenerationRef.current === generation) {
              setReorderError(result.error);
              router.refresh();
            }
          } catch {
            if (reorderGenerationRef.current === generation) {
              setReorderError("Graduate Outcome order could not be saved. Try again.");
              router.refresh();
            }
          }
        });
      }, 600);
    },
    [orderedGOs, program.id, router]
  );

  function handleDelete(go: ProgramGOItem) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteGOAction(program.id, go.id);

      if (!result.success) {
        setDeleteError(result.error);
        return;
      }

      setDeletingGO(null);
      router.refresh();
    });
  }

  function handleRestore(go: ProgramGOItem) {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restoreGOAction(program.id, go.id);

      if (!result.success) {
        setRestoreError(result.error);
        return;
      }

      setRestoringGO(null);
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
          <p className="text-muted-foreground mt-1 text-sm">{program.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            render={<Link href={buildProgramHeadOutcomeMappingPath(program.id)} />}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ListChecks className="h-4 w-4" />
            CILO Mappings
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add GO
          </Button>
        </div>
      </div>

      {/* Inline Stats */}
      {totalGOs > 0 && (
        <div className="border-border bg-muted mb-6 flex items-center gap-6 rounded-lg border px-5 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-text-primary text-2xl font-bold">{totalGOs}</span>
            <span className="text-muted-foreground text-sm">Total GOs</span>
          </div>
          <div className="bg-border h-5 w-px" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-success text-2xl font-bold">{withMappings}</span>
            <span className="text-muted-foreground text-sm">Mapped to CILOs</span>
          </div>
          {totalGOs - withMappings > 0 && (
            <>
              <div className="bg-border h-5 w-px" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-muted-foreground text-2xl font-bold">
                  {totalGOs - withMappings}
                </span>
                <span className="text-muted-foreground text-sm">Unmapped</span>
              </div>
            </>
          )}
          <p className="text-muted-foreground ml-auto hidden text-xs sm:block">Drag rows to reorder</p>
        </div>
      )}

      {/* GO List */}
      {reorderError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{reorderError}</AlertDescription>
        </Alert>
      )}
      {orderedGOs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No Graduate Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add your first GO to start tracking program outcomes.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add GO
          </Button>
        </Empty>
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
                  onRestore={(g) => {
                    setRestoreError(null);
                    setRestoringGO(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Dialog */}
      <GOFormDialog
        mode="create"
        programId={program.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingGO && (
        <GOFormDialog
          mode="edit"
          programId={program.id}
          go={editingGO}
          open={!!editingGO}
          onOpenChange={(open) => {
            if (!open) setEditingGO(null);
          }}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!deletingGO}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingGO(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Graduate Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-text-primary">{deletingGO?.code}</strong>? This action cannot
              be undone from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => {
                setDeletingGO(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => deletingGO && handleDelete(deletingGO)}
            >
              {isPending ? "Archiving..." : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoringGO}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringGO(null);
            setRestoreError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Graduate Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong className="text-text-primary">{restoringGO?.code}</strong> to the
              active catalog? It becomes available for Course alignment again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {restoreError && (
            <Alert variant="destructive">
              <AlertDescription>{restoreError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => {
                setRestoringGO(null);
                setRestoreError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button loading={isPending} onClick={() => restoringGO && handleRestore(restoringGO)}>
              {isPending ? "Restoring..." : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
