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
import { OutcomeKpiGrid } from "./outcome-kpi-grid";
import {
  deletePOAction,
  reorderPOsAction,
  restorePOAction,
} from "@/lib/actions/program-head-outcome-actions";
import { showToast } from "@/components/ui/toast";
import { POFormDialog } from "./po-form-dialog";
import { POImportDialog } from "./po-import-dialog";
import type { ProgramPOItem } from "../services/manage-program-head-outcomes";
import { buildProgramHeadOutcomeMappingPath } from "@/lib/constants/program-head-routes";
import { cn } from "@/lib/utils";

type ProgramHeadOutcomesPageProps = {
  pos: ProgramPOItem[];
  program: { id: string; code: string; name: string };
};

function SortablePORow({
  po,
  onEdit,
  onDelete,
  onRestore,
}: {
  po: ProgramPOItem;
  onEdit: (po: ProgramPOItem) => void;
  onDelete: (po: ProgramPOItem) => void;
  onRestore: (po: ProgramPOItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: po.id,
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
              {po.code}
            </Badge>
            {!po.is_active && (
              <Badge variant="outline" className="text-muted-foreground shrink-0">
                Archived
              </Badge>
            )}
            {po._count.cilo_mappings > 0 ? (
              <Badge variant="success" className="shrink-0">
                {po._count.cilo_mappings} {po._count.cilo_mappings === 1 ? "CILO" : "CILOs"} mapped
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
              aria-label={`Edit ${po.code}`}
              title="Edit"
              onClick={() => onEdit(po)}
            >
              <Edit className="size-4" aria-hidden="true" />
            </Button>
            {po.is_active ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Archive ${po.code}`}
                title="Archive"
                onClick={() => onDelete(po)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Restore ${po.code}`}
                title="Restore"
                onClick={() => onRestore(po)}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-body-md text-muted-foreground mt-2 leading-relaxed text-pretty break-words">
          {po.description}
        </p>
      </div>
    </div>
  );
}

export function ProgramHeadOutcomesPage({
  pos: initialPOs,
  program,
}: ProgramHeadOutcomesPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedPOs, setOrderedPOs] = useState<ProgramPOItem[]>(initialPOs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<ProgramPOItem | null>(null);
  const [deletingPO, setDeletingPO] = useState<ProgramPOItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringPO, setRestoringPO] = useState<ProgramPOItem | null>(null);
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
    setOrderedPOs(initialPOs);
  }, [initialPOs]);

  const totalPOs = orderedPOs.length;
  const withMappings = orderedPOs.filter((po) => po._count.cilo_mappings > 0).length;
  const unmappedCount = totalPOs - withMappings;
  const mappingStats = [
    { label: "Total POs", value: totalPOs, tone: "default" as const },
    { label: "Mapped to CILOs", value: withMappings, tone: "success" as const },
    ...(unmappedCount > 0
      ? [{ label: "Unmapped", value: unmappedCount, tone: "muted" as const }]
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

      const oldIndex = orderedPOs.findIndex((g) => g.id === active.id);
      const newIndex = orderedPOs.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(orderedPOs, oldIndex, newIndex);
      const generation = ++reorderGenerationRef.current;
      setOrderedPOs(reordered);
      setReorderError(null);

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const result = await reorderPOsAction(
              program.id,
              reordered.map((g) => g.id)
            );
            if (!result.success && reorderGenerationRef.current === generation) {
              setReorderError(result.error);
              router.refresh();
            }
          } catch {
            if (reorderGenerationRef.current === generation) {
              setReorderError("Program Outcome order could not be saved. Try again.");
              router.refresh();
            }
          }
        });
      }, 600);
    },
    [orderedPOs, program.id, router]
  );

  function handleDelete(po: ProgramPOItem) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePOAction(program.id, po.id);

      if (!result.success) {
        setDeleteError(result.error);
        showToast(result.error, "error");
        return;
      }

      setDeletingPO(null);
      showToast("Program Outcome archived.", "success");
      router.refresh();
    });
  }

  function handleRestore(po: ProgramPOItem) {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restorePOAction(program.id, po.id);

      if (!result.success) {
        setRestoreError(result.error);
        showToast(result.error, "error");
        return;
      }

      setRestoringPO(null);
      showToast("Program Outcome restored.", "success");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-xl text-foreground text-pretty">Program Outcomes</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Define this Program&apos;s Program Outcomes and map them to Course Intended Learning
            Outcomes.
          </p>
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
            Add PO
          </Button>
        </div>
      </div>

      {totalPOs > 0 && (
        <div className="flex flex-col gap-2">
          <OutcomeKpiGrid items={mappingStats} />
          <p className="text-caption text-muted-foreground">Drag rows to reorder</p>
        </div>
      )}

      {reorderError && (
        <Alert variant="destructive">
          <AlertDescription>{reorderError}</AlertDescription>
        </Alert>
      )}
      {orderedPOs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="size-6" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No Program Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add your first PO to start tracking program outcomes.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add PO
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <FileUp className="size-4" aria-hidden="true" />
            Import CSV
          </Button>
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedPOs.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {orderedPOs.map((po) => (
                <SortablePORow
                  key={po.id}
                  po={po}
                  onEdit={setEditingPO}
                  onDelete={(g) => {
                    setDeleteError(null);
                    setDeletingPO(g);
                  }}
                  onRestore={(g) => {
                    setRestoreError(null);
                    setRestoringPO(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <POFormDialog
        mode="create"
        programId={program.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <POImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        program={program}
      />

      {editingPO && (
        <POFormDialog
          mode="edit"
          programId={program.id}
          po={editingPO}
          open={!!editingPO}
          onOpenChange={(open) => {
            if (!open) setEditingPO(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deletingPO}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPO(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Program Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-foreground">{deletingPO?.code}</strong>? This action cannot be
              undone from this screen.
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
                setDeletingPO(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => deletingPO && handleDelete(deletingPO)}
            >
              {isPending ? "Archiving…" : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!restoringPO}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringPO(null);
            setRestoreError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Program Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong className="text-foreground">{restoringPO?.code}</strong> to the active
              catalog? It becomes available for Course alignment again.
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
                setRestoringPO(null);
                setRestoreError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button loading={isPending} onClick={() => restoringPO && handleRestore(restoringPO)}>
              {isPending ? "Restoring…" : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
