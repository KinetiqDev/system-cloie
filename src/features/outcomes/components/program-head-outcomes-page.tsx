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
import { deletePLOAction, reorderPLOsAction, restorePLOAction } from "@/lib/actions/program-head-outcome-actions";
import { showToast } from "@/components/ui/toast";
import { PLOFormDialog } from "./plo-form-dialog";
import type { ProgramPLOItem } from "../services/manage-program-head-outcomes";
import { buildProgramHeadOutcomeMappingPath } from "@/lib/constants/program-head-routes";

type ProgramHeadOutcomesPageProps = {
  plos: ProgramPLOItem[];
  program: { id: string; code: string; name: string };
};

function SortablePLORow({
  plo,
  onEdit,
  onDelete,
  onRestore,
}: {
  plo: ProgramPLOItem;
  onEdit: (plo: ProgramPLOItem) => void;
  onDelete: (plo: ProgramPLOItem) => void;
  onRestore: (plo: ProgramPLOItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plo.id,
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
            {plo.code}
          </Badge>
          {!plo.is_active && (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              Archived
            </Badge>
          )}
          {plo._count.cilo_mappings > 0 ? (
            <Badge variant="success" className="shrink-0">
              {plo._count.cilo_mappings} {plo._count.cilo_mappings === 1 ? "CILO" : "CILOs"} mapped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              No mappings
            </Badge>
          )}
        </div>
        <p className="text-body-md text-muted-foreground leading-relaxed">{plo.description}</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Edit ${plo.code}`}
          title="Edit"
          onClick={() => onEdit(plo)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {plo.is_active ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive min-h-11 min-w-11"
            aria-label={`Archive ${plo.code}`}
            title="Delete"
            onClick={() => onDelete(plo)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Restore ${plo.code}`}
            title="Restore"
            onClick={() => onRestore(plo)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProgramHeadOutcomesPage({
  plos: initialPLOs,
  program,
}: ProgramHeadOutcomesPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedPLOs, setOrderedPLOs] = useState<ProgramPLOItem[]>(initialPLOs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPLO, setEditingPLO] = useState<ProgramPLOItem | null>(null);
  const [deletingPLO, setDeletingPLO] = useState<ProgramPLOItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringPLO, setRestoringPLO] = useState<ProgramPLOItem | null>(null);
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
    setOrderedPLOs(initialPLOs);
  }, [initialPLOs]);

  const totalPLOs = orderedPLOs.length;
  const withMappings = orderedPLOs.filter((plo) => plo._count.cilo_mappings > 0).length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedPLOs.findIndex((g) => g.id === active.id);
      const newIndex = orderedPLOs.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(orderedPLOs, oldIndex, newIndex);
      const generation = ++reorderGenerationRef.current;
      setOrderedPLOs(reordered);
      setReorderError(null);

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const result = await reorderPLOsAction(
              program.id,
              reordered.map((g) => g.id)
            );
            if (!result.success && reorderGenerationRef.current === generation) {
              setReorderError(result.error);
              router.refresh();
            }
          } catch {
            if (reorderGenerationRef.current === generation) {
              setReorderError("Program Learning Outcome order could not be saved. Try again.");
              router.refresh();
            }
          }
        });
      }, 600);
    },
    [orderedPLOs, program.id, router]
  );

  function handleDelete(plo: ProgramPLOItem) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePLOAction(program.id, plo.id);

      if (!result.success) {
        setDeleteError(result.error);
        showToast(result.error, "error");
        return;
      }

      setDeletingPLO(null);
      showToast("Program Learning Outcome archived.", "success");
      router.refresh();
    });
  }

  function handleRestore(plo: ProgramPLOItem) {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restorePLOAction(program.id, plo.id);

      if (!result.success) {
        setRestoreError(result.error);
        showToast(result.error, "error");
        return;
      }

      setRestoringPLO(null);
      showToast("Program Learning Outcome restored.", "success");
      router.refresh();
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-text-primary text-3xl font-bold tracking-tight lg:text-4xl">
            Program Learning Outcomes
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
            Add PLO
          </Button>
        </div>
      </div>

      {/* Inline Stats */}
      {totalPLOs > 0 && (
        <div className="border-border bg-muted mb-6 flex items-center gap-6 rounded-lg border px-5 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-text-primary text-2xl font-bold">{totalPLOs}</span>
            <span className="text-muted-foreground text-sm">Total PLOs</span>
          </div>
          <div className="bg-border h-5 w-px" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-success text-2xl font-bold">{withMappings}</span>
            <span className="text-muted-foreground text-sm">Mapped to CILOs</span>
          </div>
          {totalPLOs - withMappings > 0 && (
            <>
              <div className="bg-border h-5 w-px" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-muted-foreground text-2xl font-bold">
                  {totalPLOs - withMappings}
                </span>
                <span className="text-muted-foreground text-sm">Unmapped</span>
              </div>
            </>
          )}
          <p className="text-muted-foreground ml-auto hidden text-xs sm:block">Drag rows to reorder</p>
        </div>
      )}

      {/* PLO List */}
      {reorderError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{reorderError}</AlertDescription>
        </Alert>
      )}
      {orderedPLOs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No Program Learning Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add your first PLO to start tracking program outcomes.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add PLO
          </Button>
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedPLOs.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedPLOs.map((plo) => (
                <SortablePLORow
                  key={plo.id}
                  plo={plo}
                  onEdit={setEditingPLO}
                  onDelete={(g) => {
                    setDeleteError(null);
                    setDeletingPLO(g);
                  }}
                  onRestore={(g) => {
                    setRestoreError(null);
                    setRestoringPLO(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Dialog */}
      <PLOFormDialog
        mode="create"
        programId={program.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {editingPLO && (
        <PLOFormDialog
          mode="edit"
          programId={program.id}
          plo={editingPLO}
          open={!!editingPLO}
          onOpenChange={(open) => {
            if (!open) setEditingPLO(null);
          }}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!deletingPLO}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPLO(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Program Learning Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-text-primary">{deletingPLO?.code}</strong>? This action cannot
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
                setDeletingPLO(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => deletingPLO && handleDelete(deletingPLO)}
            >
              {isPending ? "Archiving..." : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoringPLO}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringPLO(null);
            setRestoreError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Program Learning Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong className="text-text-primary">{restoringPLO?.code}</strong> to the
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
                setRestoringPLO(null);
                setRestoreError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button loading={isPending} onClick={() => restoringPLO && handleRestore(restoringPLO)}>
              {isPending ? "Restoring..." : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
