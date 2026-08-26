// fallow-ignore-next-line code-duplication
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  archiveILOAction,
  reorderILOsAction,
  restoreILOAction,
} from "@/lib/actions/gen-ed-outcome-actions";
import { buildGenEdOutcomeMappingPath } from "@/lib/constants/gen-ed-routes";
import { ILOFormDialog } from "./ilo-form-dialog";
import type { InstitutionalOutcomeItem } from "../services/manage-gen-ed-outcomes";

// fallow-ignore-next-line code-duplication
// fallow-ignore-next-line complexity
function SortableILORow({
  ilo,
  onEdit,
  onArchive,
  onRestore,
}: {
  ilo: InstitutionalOutcomeItem;
  onEdit: (ilo: InstitutionalOutcomeItem) => void;
  onArchive: (ilo: InstitutionalOutcomeItem) => void;
  onRestore: (ilo: InstitutionalOutcomeItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    // fallow-ignore-next-line code-duplication
    // fallow-ignore-next-line code-duplication
    id: ilo.id,
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
      <button
        className="text-muted-foreground hover:text-foreground mt-0.5 inline-flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="shrink-0 font-semibold">
            {ilo.code}
          </Badge>
          {!ilo.is_active && (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              Archived
            </Badge>
          )}
          {ilo._count.cilo_institutional_outcome_mappings > 0 ? (
            <Badge variant="success" className="shrink-0">
              {ilo._count.cilo_institutional_outcome_mappings}{" "}
              {ilo._count.cilo_institutional_outcome_mappings === 1 ? "CILO" : "CILOs"} mapped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              No mappings
            </Badge>
          )}
        </div>
        <p className="text-body-md text-muted-foreground leading-relaxed">{ilo.description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={`Edit ${ilo.code}`}
          title="Edit"
          onClick={() => onEdit(ilo)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {ilo.is_active ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive min-h-11 min-w-11"
            aria-label={`Archive ${ilo.code}`}
            title="Archive"
            onClick={() => onArchive(ilo)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Restore ${ilo.code}`}
            title="Restore"
            onClick={() => onRestore(ilo)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// fallow-ignore-next-line code-duplication
// fallow-ignore-next-line complexity
export function GenEdOutcomesPage({ ilos: initialILOs }: { ilos: InstitutionalOutcomeItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderedILOs, setOrderedILOs] = useState<InstitutionalOutcomeItem[]>(initialILOs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingILO, setEditingILO] = useState<InstitutionalOutcomeItem | null>(null);
  // fallow-ignore-next-line code-duplication
  const [archivingILO, setArchivingILO] = useState<InstitutionalOutcomeItem | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  // fallow-ignore-next-line code-duplication
  const [restoringILO, setRestoringILO] = useState<InstitutionalOutcomeItem | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderGenerationRef = useRef(0);
  const latestOrderedIdsRef = useRef<string[] | null>(null);

  useEffect(
    () => () => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    },
    []
  );

  useEffect(() => {
    // Reconcile optimistic drag state after router.refresh() returns authoritative server props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrderedILOs(initialILOs);
    // fallow-ignore-next-line code-duplication
  }, [initialILOs]);

  const totalILOs = orderedILOs.length;
  const withMappings = orderedILOs.filter(
    // fallow-ignore-next-line code-duplication
    (ilo) => ilo._count.cilo_institutional_outcome_mappings > 0
  ).length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedILOs.findIndex((g) => g.id === active.id);
      const newIndex = orderedILOs.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(orderedILOs, oldIndex, newIndex);
      const generation = ++reorderGenerationRef.current;
      latestOrderedIdsRef.current = reordered.map((g) => g.id);
      setOrderedILOs(reordered);
      // fallow-ignore-next-line code-duplication
      setReorderError(null);

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        // fallow-ignore-next-line complexity
        startTransition(async () => {
          const orderedIdsAtDispatch = latestOrderedIdsRef.current ?? reordered.map((g) => g.id);
          // fallow-ignore-next-line complexity
          async function attempt(ids: string[], retries = 1): Promise<void> {
            try {
              // fallow-ignore-next-line code-duplication
              const result = await reorderILOsAction(ids);
              if (result.success) {
                if (reorderGenerationRef.current === generation) router.refresh();
                else {
                  // A newer drag was queued while this save was in flight: save the latest order.
                  const latest = latestOrderedIdsRef.current;
                  if (latest) {
                    const r2 = await reorderILOsAction(latest);
                    if (!r2.success) {
                      setReorderError(r2.error);
                    }
                    router.refresh();
                  }
                }
                return;
              }
              if (reorderGenerationRef.current !== generation) {
                // Superseded by newer drag: save latest instead of showing stale error.
                const latest = latestOrderedIdsRef.current;
                if (latest) {
                  const r2 = await reorderILOsAction(latest);
                  if (!r2.success) setReorderError(r2.error);
                  router.refresh();
                }
                return;
              }
              const isStale = result.error.includes("Outcome changed");
              if (isStale && retries > 0) {
                router.refresh();
                await new Promise((r) => setTimeout(r, 250));
                if (reorderGenerationRef.current !== generation) return;
                const latest = latestOrderedIdsRef.current ?? ids;
                return attempt(latest, retries - 1);
              }
              setReorderError(result.error);
              router.refresh();
            } catch {
              if (reorderGenerationRef.current !== generation) return;
              setReorderError("Institutional Outcome order could not be saved.");
              router.refresh();
            }
          }
          await attempt(orderedIdsAtDispatch);
        });
      }, 600);
    },
    [orderedILOs, router]
  );

  function handleArchive(ilo: InstitutionalOutcomeItem) {
    setArchiveError(null);
    startTransition(async () => {
      const result = await archiveILOAction(ilo.id);
      if (!result.success) {
        setArchiveError(result.error);
        return;
      }
      setArchivingILO(null);
      router.refresh();
    });
  }

  function handleRestore(ilo: InstitutionalOutcomeItem) {
    setRestoreError(null);
    startTransition(async () => {
      const result = await restoreILOAction(ilo.id);
      if (!result.success) {
        setRestoreError(result.error);
        return;
      }
      setRestoringILO(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-text-primary text-3xl font-bold tracking-tight lg:text-4xl">
            Institutional Learning Outcomes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            College-wide · General Education CILOs (e.g., GEMATH, GEGS) map here
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            render={<Link href={buildGenEdOutcomeMappingPath()} />}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ListChecks className="h-4 w-4" />
            CILO Mappings
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add ILO
          </Button>
        </div>
      </div>

      {totalILOs > 0 && (
        <div className="border-border bg-muted mb-6 flex items-center gap-6 rounded-lg border px-5 py-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-foreground/70 text-sm">Total ILOs</span>
          </div>
          <div className="bg-border h-5 w-px" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-success text-2xl font-bold">{withMappings}</span>
            <span className="text-foreground/70 text-sm">Mapped to CILOs</span>
          </div>
          {totalILOs - withMappings > 0 && (
            <>
              <div className="bg-border h-5 w-px" />
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-muted-foreground text-2xl font-bold">
                  {totalILOs - withMappings}
                </span>
                <span className="text-foreground/70 text-sm">Unmapped</span>
              </div>
            </>
          )}
          <p className="text-foreground/60 ml-auto hidden text-xs sm:block">Drag rows to reorder</p>
        </div>
      )}

      {reorderError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{reorderError}</AlertDescription>
        </Alert>
        // fallow-ignore-next-line code-duplication
      )}
      {/* fallow-ignore-next-line code-duplication */}
      {orderedILOs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No Institutional Learning Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add your first Institutional Learning Outcome to the college-wide catalog —
              college-wide.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add ILO
          </Button>
        </Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedILOs.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {orderedILOs.map((ilo) => (
                <SortableILORow
                  key={ilo.id}
                  ilo={ilo}
                  onEdit={setEditingILO}
                  onArchive={(g) => {
                    setArchiveError(null);
                    setArchivingILO(g);
                  }}
                  onRestore={(g) => {
                    setRestoreError(null);
                    setRestoringILO(g);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ILOFormDialog mode="create" open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {editingILO && (
        <ILOFormDialog
          mode="edit"
          ilo={editingILO}
          open={!!editingILO}
          onOpenChange={(open) => {
            if (!open) setEditingILO(null);
          }}
        />
      )}

      <AlertDialog
        open={!!archivingILO}
        onOpenChange={(open) => {
          if (!open) {
            setArchivingILO(null);
            setArchiveError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Institutional Learning Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong className="text-text-primary">{archivingILO?.code}</strong>? This action
              cannot be undone from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {archiveError && (
            <Alert variant="destructive">
              <AlertDescription>{archiveError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => {
                setArchivingILO(null);
                setArchiveError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={() => archivingILO && handleArchive(archivingILO)}
            >
              {isPending ? "Archiving..." : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!restoringILO}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringILO(null);
            setRestoreError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Institutional Learning Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong className="text-text-primary">{restoringILO?.code}</strong> to the
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
                setRestoringILO(null);
                setRestoreError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button loading={isPending} onClick={() => restoringILO && handleRestore(restoringILO)}>
              {isPending ? "Restoring..." : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
