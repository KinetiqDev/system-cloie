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
import { Edit, FileUp, GripVertical, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deletePLOAction,
  reorderPLOsAction,
  restorePLOAction,
} from "@/lib/actions/program-head-outcome-actions";
import { showToast } from "@/components/ui/toast";
import { PLOFormDialog } from "./plo-form-dialog";
import { PLOImportDialog } from "./plo-import-dialog";
import type { ProgramPLOItem } from "../services/manage-program-head-outcomes";
import { buildProgramHeadOutcomeMappingPath } from "@/lib/constants/program-head-routes";
import { cn } from "@/lib/utils";

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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border-border flex items-start gap-2 rounded-xl border p-4 shadow-sm",
        "motion-safe:transition-shadow motion-safe:duration-200",
        isDragging ? "relative z-10 opacity-90 shadow-lg" : "motion-safe:hover:shadow-md"
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 cursor-grab touch-manipulation touch-none items-center justify-center active:cursor-grabbing pointer-coarse:size-11"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                {plo._count.cilo_mappings} {plo._count.cilo_mappings === 1 ? "CILO" : "CILOs"}{" "}
                mapped
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground shrink-0">
                No mappings
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${plo.code}`}
              title="Edit"
              onClick={() => onEdit(plo)}
            >
              <Edit className="size-4" aria-hidden="true" />
            </Button>
            {plo.is_active ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Archive ${plo.code}`}
                title="Delete"
                onClick={() => onDelete(plo)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Restore ${plo.code}`}
                title="Restore"
                onClick={() => onRestore(plo)}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-body-md text-muted-foreground mt-2 leading-relaxed text-pretty break-words">
          {plo.description}
        </p>
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
  const unmappedCount = totalPLOs - withMappings;
  const mappingStats = [
    { label: "Total PLOs", value: totalPLOs, valueClassName: "text-foreground" },
    { label: "Mapped to CILOs", value: withMappings, valueClassName: "text-success" },
    ...(unmappedCount > 0
      ? [{ label: "Unmapped", value: unmappedCount, valueClassName: "text-muted-foreground" }]
      : []),
  ];
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-xl text-foreground text-pretty">Program Learning Outcomes</h1>
          <p className="text-body-sm text-muted-foreground mt-1">{program.name}</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            render={<Link href={buildProgramHeadOutcomeMappingPath(program.id)} />}
            variant="outline"
            className="w-full justify-center sm:w-auto"
          >
            <ListChecks className="size-4" aria-hidden="true" />
            CILO Mappings
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center sm:w-auto"
            onClick={() => setImportDialogOpen(true)}
          >
            <FileUp className="size-4" aria-hidden="true" />
            Import CSV
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full justify-center sm:w-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add PLO
          </Button>
        </div>
      </div>

      {totalPLOs > 0 && (
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              mappingStats.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"
            )}
          >
            {mappingStats.map((stat) => (
              <Card key={stat.label} size="sm">
                <CardHeader>
                  <CardTitle className="text-title-sm">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={cn("font-heading text-heading-xl tabular-nums", stat.valueClassName)}
                  >
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">Drag rows to reorder</p>
        </div>
      )}

      {reorderError && (
        <Alert variant="destructive">
          <AlertDescription>{reorderError}</AlertDescription>
        </Alert>
      )}
      {orderedPLOs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="size-6" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No Program Learning Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add your first PLO to start tracking program outcomes.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add PLO
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <FileUp className="size-4" aria-hidden="true" />
            Import CSV
          </Button>
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedPLOs.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
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

      <PLOFormDialog
        mode="create"
        programId={program.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <PLOImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        program={program}
      />

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
              <strong className="text-foreground">{deletingPLO?.code}</strong>? This action cannot
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
              {isPending ? "Archiving…" : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              Restore <strong className="text-foreground">{restoringPLO?.code}</strong> to the
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
              {isPending ? "Restoring…" : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
