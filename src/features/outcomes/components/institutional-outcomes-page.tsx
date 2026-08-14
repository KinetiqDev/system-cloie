"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowDown, ArrowUp, BookOpen, Edit, Plus, RotateCcw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toast";
import {
  commitInstitutionalOutcomeAction,
  prepareArchiveInstitutionalOutcomeAction,
  prepareReorderInstitutionalOutcomesAction,
  prepareRestoreInstitutionalOutcomeAction,
} from "@/lib/actions/institutional-outcome-actions";
import type { OutcomeWriteReview } from "../services/manage-outcome-writes";
import type { InstitutionalOutcomeItem } from "../services/manage-institutional-outcomes";
import { InstitutionalOutcomeFormDialog } from "./institutional-outcome-form-dialog";

type InstitutionalOutcomesPageProps = { outcomes: InstitutionalOutcomeItem[] };
type Operation = "archive" | "restore" | "reorder" | null;

export function InstitutionalOutcomesPage({
  outcomes: initialOutcomes,
}: InstitutionalOutcomesPageProps) {
  const router = useRouter();
  const [outcomes, setOutcomes] = useState(initialOutcomes);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InstitutionalOutcomeItem | null>(null);
  const [archiving, setArchiving] = useState<InstitutionalOutcomeItem | null>(null);
  const [review, setReview] = useState<OutcomeWriteReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [isPending, startTransition] = useTransition();

  function finish(message: string) {
    setError(null);
    setReview(null);
    showToast(message);
    router.refresh();
  }

  function prepareArchive() {
    if (!archiving) return;
    setOperation("archive");
    startTransition(async () => {
      try {
        const result = await prepareArchiveInstitutionalOutcomeAction(archiving.id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setReview(result.review);
      } catch {
        setError("The archive review could not be prepared. Try again.");
      } finally {
        setOperation(null);
      }
    });
  }

  function restore(outcome: InstitutionalOutcomeItem) {
    setOperation("restore");
    startTransition(async () => {
      try {
        const result = await prepareRestoreInstitutionalOutcomeAction(outcome.id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setReview(result.review);
      } catch {
        setError("The restore review could not be prepared. Try again.");
      } finally {
        setOperation(null);
      }
    });
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= outcomes.length) return;
    const reordered = [...outcomes];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setOutcomes(reordered);
    setError(null);
    setOperation("reorder");
    startTransition(async () => {
      try {
        const result = await prepareReorderInstitutionalOutcomesAction(
          reordered.map((outcome) => outcome.id)
        );
        if (!result.success) {
          setError(result.error);
          setOutcomes(initialOutcomes);
          return;
        }
        setReview(result.review);
      } catch {
        setError("The order review could not be prepared. Try again.");
        setOutcomes(initialOutcomes);
      } finally {
        setOperation(null);
      }
    });
  }

  function confirmReview() {
    if (!review) return;
    startTransition(async () => {
      try {
        const result = await commitInstitutionalOutcomeAction(review, true);
        if (!result.success) {
          setError(result.error);
          setReview(null);
          return;
        }
        setArchiving(null);
        finish(
          review.input.action === "archive"
            ? "Institutional Outcome archived."
            : review.input.action === "restore"
              ? "Institutional Outcome restored."
              : "Institutional Outcome order saved."
        );
      } catch {
        setError("The Institutional Outcome could not be saved. Try again.");
        setReview(null);
      }
    });
  }

  const busy = isPending || operation !== null;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-text-primary text-3xl font-bold tracking-tight lg:text-4xl">
            Learning Outcomes
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Manage the institution-wide outcomes common to every Academic Program. Archived outcomes
            remain visible for history but are unavailable for future mapping.
          </p>
        </div>
        <Button className="min-h-11 shrink-0 gap-2" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          Add Outcome
        </Button>
      </header>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                router.refresh();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {outcomes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Institutional Outcomes yet</EmptyTitle>
            <EmptyDescription>
              Add the first outcome to begin the college-wide catalog.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="min-h-11 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Add Outcome
          </Button>
        </Empty>
      ) : (
        <section aria-label="Institutional Outcomes" className="flex flex-col gap-3">
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              {outcomes.length} {outcomes.length === 1 ? "outcome" : "outcomes"}
            </span>
            <span className="hidden sm:inline">Use the arrow buttons to change display order.</span>
          </div>
          {outcomes.map((outcome, index) => (
            <OutcomeRow
              key={outcome.id}
              outcome={outcome}
              index={index}
              total={outcomes.length}
              onEdit={setEditing}
              onArchive={setArchiving}
              onRestore={restore}
              onMove={move}
              disabled={busy}
            />
          ))}
        </section>
      )}
      <InstitutionalOutcomeFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing && (
        <InstitutionalOutcomeFormDialog
          mode="edit"
          outcome={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
      <AlertDialog
        open={!!archiving && !review}
        onOpenChange={(open) => {
          if (!open && !isPending) setArchiving(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Review Archive</AlertDialogTitle>
            <AlertDialogDescription>
              Review the exact archive change for{" "}
              <strong className="text-foreground">{archiving?.code}</strong> before confirming. It
              will remain visible in this catalog but cannot be used for future mapping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={operation === "archive"}
              onClick={prepareArchive}
            >
              {operation === "archive" ? "Preparing..." : "Review Changes"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {review && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !isPending) {
              setReview(null);
              setArchiving(null);
            }
          }}
        >
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Institutional Outcome Change</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm this exact before-and-after change. The save is atomic and rejects stale
                reviews.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ReviewChange review={review} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button loading={isPending} onClick={confirmReview}>
                Confirm Changes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function OutcomeRow({
  outcome,
  index,
  total,
  onEdit,
  onArchive,
  onRestore,
  onMove,
  disabled,
}: {
  outcome: InstitutionalOutcomeItem;
  index: number;
  total: number;
  onEdit: (outcome: InstitutionalOutcomeItem) => void;
  onArchive: (outcome: InstitutionalOutcomeItem) => void;
  onRestore: (outcome: InstitutionalOutcomeItem) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  disabled: boolean;
}) {
  return (
    <article className="bg-card border-border rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-1" aria-label={`Reorder ${outcome.code}`}>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Move ${outcome.code} up`}
            disabled={disabled || index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label={`Move ${outcome.code} down`}
            disabled={disabled || index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="font-semibold">
              {outcome.code}
            </Badge>
            <Badge variant={outcome.is_active ? "success" : "outline"}>
              {outcome.is_active ? "Active" : "Archived"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 leading-relaxed">{outcome.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {outcome.is_active ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={`Edit ${outcome.code}`}
                disabled={disabled}
                onClick={() => onEdit(outcome)}
              >
                <Edit />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-danger min-h-11 min-w-11"
                aria-label={`Archive ${outcome.code}`}
                disabled={disabled}
                onClick={() => onArchive(outcome)}
              >
                <Archive />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-2"
              disabled={disabled}
              onClick={() => onRestore(outcome)}
            >
              <RotateCcw data-icon="inline-start" />
              Restore
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ReviewChange({ review }: { review: OutcomeWriteReview }) {
  const before = review.before;
  const after = review.after;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ReviewColumn label="Before" value={before} />
      <ReviewColumn label="After" value={after} />
    </div>
  );
}

function ReviewColumn({ label, value }: { label: string; value: unknown }) {
  const record = value && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  return (
    <section className="bg-muted border-border rounded-lg border p-4" aria-label={label}>
      <h3 className="font-medium">{label}</h3>
      {Array.isArray(value) ? (
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {value.map((item, index) => {
            const row = item as Record<string, unknown>;
            return (
              <li key={`${String(row.id ?? row.code ?? index)}:${index}`} className="border-border rounded-md border p-2">
                <span className="font-medium">{String(row.code ?? row.id ?? `Item ${index + 1}`)}</span>
                {"description" in row && <p className="text-muted-foreground mt-1">{String(row.description)}</p>}
                {"order" in row && <p className="text-muted-foreground mt-1">Display order: {String(row.order)}</p>}
                {"is_active" in row && <p className="text-muted-foreground mt-1">State: {row.is_active ? "Active" : "Archived"}</p>}
              </li>
            );
          })}
        </ol>
      ) : record ? (
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          {"code" in record && <div><dt className="text-muted-foreground">Code</dt><dd>{String(record.code)}</dd></div>}
          {"description" in record && <div><dt className="text-muted-foreground">Statement</dt><dd>{String(record.description)}</dd></div>}
          {"order" in record && <div><dt className="text-muted-foreground">Display order</dt><dd>{String(record.order)}</dd></div>}
          {"is_active" in record && <div><dt className="text-muted-foreground">State</dt><dd>{record.is_active ? "Active" : "Archived"}</dd></div>}
        </dl>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">No existing record.</p>
      )}
    </section>
  );
}

export function InstitutionalOutcomesLoading() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading institutional outcomes"
    >
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
