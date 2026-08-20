"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CourseAlignmentReview,
  CourseAlignment,
} from "@/features/outcomes/services/manage-course-alignment";
import {
  ManifestationAlignmentContent,
  type ManifestationDraftState,
} from "@/features/outcomes/components/manifestation-alignment-content";
import { manifestationLabel } from "@/features/outcomes/components/manifestation-picker";
import type { CILOMappingManifestation } from "@prisma/client";

declare global {
  interface Window {
    navigation?: {
      currentEntry?: { index: number } | null;
    };
  }
}

type Props = {
  alignment: CourseAlignment;
  eyebrow?: string;
  emptyStateAction?: { href: string; label: string };
  prepareAction: (
    input: unknown
  ) => Promise<
    { success: true; review: CourseAlignmentReview } | { success: false; error: string }
  >;
  commitAction: (
    review: unknown,
    confirmed: boolean
  ) => Promise<
    | { success: true; changed: number; freshnessToken: string }
    | { success: false; error: string }
  >;
  saveDraftAction?: (
    input: unknown
  ) => Promise<
    | { success: true; changed: number; freshnessToken: string }
    | { success: false; error: string }
  >;
};

const HISTORY_GUARD_KEY = "cloie-course-alignment-dirty-entry";

function isHistoryGuardEntry(marker: string): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === "object" && state !== null && Reflect.get(state, HISTORY_GUARD_KEY) === marker
  );
}

function indexAlignmentTargets(alignment: CourseAlignment) {
  return {
    activeTargetIds: new Set(alignment.targets.map((target) => target.id)),
    targetById: new Map(
      [...alignment.targets, ...alignment.unavailableTargets].map((target) => [target.id, target])
    ),
  };
}

function currentHistoryEntryIndex(): number | undefined {
  return window.navigation?.currentEntry?.index;
}

function useDirtyAlignmentNavigationGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const confirmDiscard = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0) return;

      const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(
        Boolean
      );
      if (hasModifier || link.target || link.origin !== window.location.origin) return;
      if (window.confirm("Discard staged alignment changes?")) return;

      event.preventDefault();
      event.stopPropagation();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    const editorHistoryIndex = currentHistoryEntryIndex();
    const editorHistoryState = window.history.state;
    const historyMarker = `${Date.now()}-${Math.random()}`;
    window.history.replaceState(
      { ...editorHistoryState, [HISTORY_GUARD_KEY]: historyMarker },
      "",
      window.location.href
    );

    let revertingHistoryNavigation = false;
    const confirmHistoryNavigation = () => {
      if (revertingHistoryNavigation) {
        if (!isHistoryGuardEntry(historyMarker)) {
          window.history.go(1);
          return;
        }
        revertingHistoryNavigation = false;
        return;
      }
      if (window.confirm("Discard staged alignment changes?")) return;

      const currentHistoryIndex = currentHistoryEntryIndex();
      const stepsBackToEditor =
        editorHistoryIndex === undefined || currentHistoryIndex === undefined
          ? 1
          : editorHistoryIndex - currentHistoryIndex;
      if (stepsBackToEditor === 0) return;

      revertingHistoryNavigation = true;
      window.history.go(stepsBackToEditor);
    };

    window.addEventListener("popstate", confirmHistoryNavigation);
    document.addEventListener("click", confirmDiscard, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("click", confirmDiscard, true);
      window.removeEventListener("popstate", confirmHistoryNavigation);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (isHistoryGuardEntry(historyMarker)) {
        window.history.replaceState(editorHistoryState, "", window.location.href);
      }
    };
  }, [isDirty]);
}

function cellsFromAlignment(
  alignment: CourseAlignment,
  activeTargetIds: Set<string>
): ManifestationDraftState {
  return Object.fromEntries(
    alignment.cilos.map((cilo) => [
      cilo.id,
      Object.fromEntries(
        cilo.mappings
          .filter(
            (mapping) => mapping.manifestation !== null && activeTargetIds.has(mapping.targetId)
          )
          .map((mapping) => [mapping.targetId, mapping.manifestation])
      ),
    ])
  ) as ManifestationDraftState;
}

function desiredFromDraft(
  alignment: CourseAlignment,
  draft: ManifestationDraftState
): Array<{
  ciloId: string;
  mappings: Array<{ targetId: string; manifestation: CILOMappingManifestation }>;
}> {
  return alignment.cilos.map((cilo) => ({
    ciloId: cilo.id,
    mappings: alignment.targets.flatMap((target) => {
      const manifestation = draft[cilo.id]?.[target.id];
      return manifestation === undefined ? [] : [{ targetId: target.id, manifestation }];
    }),
  }));
}

type AlignmentContentProps = {
  alignment: CourseAlignment;
  draft: ManifestationDraftState;
  disabled: boolean;
  emptyStateAction: { href: string; label: string };
  onChangeCell: (
    ciloId: string,
    targetId: string,
    manifestation: CILOMappingManifestation | null
  ) => void;
};

function AlignmentContent({
  alignment,
  draft,
  disabled,
  emptyStateAction,
  onChangeCell,
}: AlignmentContentProps) {
  if (alignment.cilos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListChecks className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No active CILOs</EmptyTitle>
          <EmptyDescription>
            Add a Course Intended Learning Outcome before aligning this Course.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" render={<Link href={emptyStateAction.href} />}>
          {emptyStateAction.label}
        </Button>
      </Empty>
    );
  }

  return (
    <>
      {alignment.course.scope === "GENERAL_EDUCATION" && (
        <Alert>
          <AlertDescription>
            This is a General Education Course. Mapping changes apply to every active assignment using
            this shared Course, not just one section.
          </AlertDescription>
        </Alert>
      )}
      <ManifestationAlignmentContent
        alignment={alignment}
        draft={draft}
        disabled={disabled}
        onChangeCell={onChangeCell}
      />
    </>
  );
}

type AlignmentDialogsProps = {
  alignment: CourseAlignment;
  review: CourseAlignmentReview | null;
  discardConfirmation: boolean;
  pending: boolean;
  onCloseReview: () => void;
  onCommitReview: () => void;
  onDiscardConfirmationChange: (open: boolean) => void;
  onDiscardDraft: () => void;
};

function AlignmentDialogs({
  alignment,
  review,
  discardConfirmation,
  pending,
  onCloseReview,
  onCommitReview,
  onDiscardConfirmationChange,
  onDiscardDraft,
}: AlignmentDialogsProps) {
  const { activeTargetIds, targetById } = indexAlignmentTargets(alignment);
  return (
    <>
      <AlertDialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open && !pending) onCloseReview();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review Course alignment changes</AlertDialogTitle>
            <AlertDialogDescription>
              {alignment.course.scope === "GENERAL_EDUCATION"
                ? "These changes apply to every active teaching assignment using this shared General Education Course. Confirm the complete before and after mapping."
                : "These changes apply to every active teaching assignment for this Program-specific Course. Confirm the complete before and after mapping."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto text-body-sm">
            {review &&
              renderReviewLines({
                alignment,
                review,
                targetById,
                activeTargetIds,
              })}
          </div>
          <AlertDialogFooter>
            <Button type="button" onClick={onCommitReview} disabled={pending}>
              {pending ? "Saving..." : "Confirm and save"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={discardConfirmation} onOpenChange={onDiscardConfirmationChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard staged alignment changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The staged mapping changes have not been saved. Discarding them restores the last
              saved Course alignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep mapping</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscardDraft}>Discard draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildReviewLines({
  alignment,
  review,
  targetById,
  activeTargetIds,
}: {
  alignment: CourseAlignment;
  review: CourseAlignmentReview;
  targetById: Map<string, { code: string } | undefined>;
  activeTargetIds: Set<string>;
}) {
  const linesByCilo = new Map<string, string[]>();
  const archivedLinesByCilo = new Map<string, string[]>();

  function append(ciloId: string, line: string) {
    const lines = linesByCilo.get(ciloId) ?? [];
    lines.push(line);
    linesByCilo.set(ciloId, lines);
  }

  function additionLine(addition: CourseAlignmentReview["additions"][number]) {
    append(
      addition.ciloId,
      `${targetById.get(addition.targetId)?.code ?? addition.targetId}: Set to ${manifestationLabel(addition.manifestation)}`
    );
  }

  function updateLine(update: CourseAlignmentReview["updates"][number]) {
    append(
      update.ciloId,
      `${targetById.get(update.targetId)?.code ?? update.targetId}: ${manifestationLabel(update.from)} \u2192 ${manifestationLabel(update.to)}`
    );
  }

  function removalLine(removal: CourseAlignmentReview["removals"][number]) {
    const before = review.before.find((item) => item.ciloId === removal.ciloId);
    const beforeManifestation = before?.mappings.find(
      (mapping) => mapping.targetId === removal.targetId
    )?.manifestation;
    append(
      removal.ciloId,
      `${targetById.get(removal.targetId)?.code ?? removal.targetId}: ${manifestationLabel(beforeManifestation)} \u2192 Unanswered`
    );
  }

  function archivedLine(cilo: CourseAlignment["cilos"][number]) {
    const lines = cilo.mappings
      .filter((mapping) => !activeTargetIds.has(mapping.targetId))
      .map(
        (mapping) =>
          `${targetById.get(mapping.targetId)?.code ?? mapping.targetId} (archived): ${manifestationLabel(mapping.manifestation)}`
      );
    if (lines.length > 0) {
      archivedLinesByCilo.set(cilo.id, lines);
    }
  }

  review.additions.forEach(additionLine);
  review.updates.forEach(updateLine);
  review.removals.forEach(removalLine);
  alignment.cilos.forEach(archivedLine);
  return { linesByCilo, archivedLinesByCilo };
}

function renderReviewLines({
  alignment,
  review,
  targetById,
  activeTargetIds,
}: {
  alignment: CourseAlignment;
  review: CourseAlignmentReview;
  targetById: Map<string, { code: string } | undefined>;
  activeTargetIds: Set<string>;
}) {
  const { linesByCilo, archivedLinesByCilo } = buildReviewLines({
    alignment,
    review,
    targetById,
    activeTargetIds,
  });
  const ciloIds = [...new Set([...linesByCilo.keys(), ...archivedLinesByCilo.keys()])];
  return ciloIds.map((ciloId) => {
    const ciloIndex = alignment.cilos.findIndex((cilo) => cilo.id === ciloId);
    const lines = linesByCilo.get(ciloId) ?? [];
    const archivedLines = archivedLinesByCilo.get(ciloId) ?? [];
    return (
      <div key={ciloId} className="flex flex-col gap-1">
        <p className="font-medium">CILO {ciloIndex + 1}</p>
        <ul className="flex flex-col gap-0.5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          {archivedLines.map((line) => (
            <li key={line} className="text-muted-foreground">
              {line} — read-only
            </li>
          ))}
        </ul>
      </div>
    );
  });
}

// fallow-ignore-next-line complexity
export function CourseAlignmentEditor({
  alignment,
  eyebrow = "Faculty Course alignment",
  emptyStateAction = { href: "/faculty/cilos", label: "Manage CILOs" },
  prepareAction,
  commitAction,
  saveDraftAction,
}: Props) {
  const isProgramSpecific = alignment.course.scope === "PROGRAM_SPECIFIC";
  const { activeTargetIds } = indexAlignmentTargets(alignment);
  const initialCells = cellsFromAlignment(alignment, activeTargetIds);
  const [draft, setDraft] = useState(initialCells);
  const [savedCells, setSavedCells] = useState(initialCells);
  const [review, setReview] = useState<CourseAlignmentReview | null>(null);
  const [discardConfirmation, setDiscardConfirmation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [freshnessToken, setFreshnessToken] = useState(alignment.freshnessToken);

  const isDirty = alignment.cilos.some(
    (cilo) => JSON.stringify(draft[cilo.id] ?? {}) !== JSON.stringify(savedCells[cilo.id] ?? {})
  );
  const manifestationChangeCount = alignment.cilos.reduce((total, cilo) => {
    const current = draft[cilo.id] ?? {};
    const saved = savedCells[cilo.id] ?? {};
    return (
      total +
      alignment.targets.filter(
        (target) => (current[target.id] ?? null) !== (saved[target.id] ?? null)
      ).length
    );
  }, 0);
  const mappingComplete = isProgramSpecific
    ? alignment.targets.length > 0 &&
      alignment.cilos.every((cilo) =>
        alignment.targets.every((target) => draft[cilo.id]?.[target.id] !== undefined)
      )
    : alignment.targets.length > 0 &&
      alignment.cilos.every((cilo) =>
        alignment.targets.some((target) => draft[cilo.id]?.[target.id] !== undefined)
      );
  const readiness =
    alignment.cilos.length === 0
      ? "missing-cilos"
      : mappingComplete
        ? "ready"
        : "incomplete-mapping";
  const editingLocked = pending || review !== null;
  const needsReload = error?.includes("Reload and review") ?? false;

  const changeCell = (
    ciloId: string,
    targetId: string,
    manifestation: CILOMappingManifestation | null
  ) => {
    setDraft((current) => {
      const cells = { ...(current[ciloId] ?? {}) };
      if (manifestation === null) delete cells[targetId];
      else cells[targetId] = manifestation;
      return { ...current, [ciloId]: cells };
    });
    setSuccess(null);
  };

  const prepareReview = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await prepareAction({
        courseId: alignment.course.id,
        desired: desiredFromDraft(alignment, draft),
        freshnessToken,
      });
      if (result.success) setReview(result.review);
      else setError(result.error);
    } catch {
      setError("Could not prepare the alignment review.");
    } finally {
      setPending(false);
    }
  };

  const saveProgress = async () => {
    if (!saveDraftAction) return;
    setPending(true);
    setError(null);
    try {
      const result = await saveDraftAction({
        courseId: alignment.course.id,
        cells: desiredFromDraft(alignment, draft),
        freshnessToken,
      });
      if (result.success) {
        setSavedCells(draft);
        setFreshnessToken(result.freshnessToken);
        setSuccess(`${result.changed} mapping change${result.changed === 1 ? "" : "s"} saved.`);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Could not save the alignment draft.");
    } finally {
      setPending(false);
    }
  };

  const commitReview = async () => {
    if (!review) return;
    const reviewToCommit = review;
    setPending(true);
    setError(null);
    try {
      const result = await commitAction(reviewToCommit, true);
      setReview(null);
      if (result.success) {
        const committedState = Object.fromEntries(
          reviewToCommit.after.map((item) => [
            item.ciloId,
            Object.fromEntries(
              item.mappings.flatMap((mapping) =>
                mapping.manifestation === null
                  ? []
                  : [[mapping.targetId, mapping.manifestation] as const]
              )
            ),
          ])
        ) as ManifestationDraftState;
        setDraft(committedState);
        setSavedCells(committedState);
        setFreshnessToken(result.freshnessToken);
        setSuccess(`${result.changed} mapping change${result.changed === 1 ? "" : "s"} saved.`);
      } else {
        setError(result.error);
      }
    } catch {
      setReview(null);
      setError("Could not save the Course alignment. Review the latest draft and retry.");
    } finally {
      setPending(false);
    }
  };

  const discardDraft = () => {
    setDraft(savedCells);
    setDiscardConfirmation(false);
    setSuccess(null);
    setError(null);
  };

  useDirtyAlignmentNavigationGuard(isDirty);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-body-sm">{eyebrow}</p>
          <h1 className="text-heading-lg">
            {alignment.course.code}: {alignment.course.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-body-sm">
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? "Classify each CILO against at least one active Institutional Outcome from the college-wide catalog."
              : `Classify each CILO against every active Program Learning Outcome owned by ${alignment.course.program?.code ?? "the program"}.`}
          </p>
        </div>
        <Badge variant={readiness === "ready" ? "default" : "outline"}>
          {readiness === "ready"
            ? "Ready"
            : readiness === "missing-cilos"
              ? "Missing CILOs"
              : "Incomplete mapping"}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={needsReload ? () => window.location.reload() : prepareReview}
              disabled={needsReload ? false : !isDirty || editingLocked}
            >
              {needsReload ? "Reload alignment" : "Retry review"}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" role="status">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <AlignmentContent
        alignment={alignment}
        draft={draft}
        disabled={editingLocked}
        emptyStateAction={emptyStateAction}
        onChangeCell={changeCell}
      />

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDiscardConfirmation(true)}
          disabled={!isDirty || editingLocked}
        >
          <RotateCcw data-icon="inline-start" />
          Discard changes
        </Button>
        {saveDraftAction && (
          <Button
            type="button"
            variant="outline"
            onClick={saveProgress}
            disabled={!isDirty || editingLocked}
          >
            <Save data-icon="inline-start" />
            {pending ? "Saving..." : "Save progress"}
          </Button>
        )}
        <Button
          type="button"
          onClick={prepareReview}
          disabled={
            !isDirty || editingLocked || alignment.cilos.length === 0 || !mappingComplete
          }
        >
          <Save data-icon="inline-start" />
          {pending
            ? "Preparing review..."
            : `Review ${manifestationChangeCount} change${manifestationChangeCount === 1 ? "" : "s"}`}
        </Button>
      </div>

      <AlignmentDialogs
        alignment={alignment}
        review={review}
        discardConfirmation={discardConfirmation}
        pending={pending}
        onCloseReview={() => setReview(null)}
        onCommitReview={commitReview}
        onDiscardConfirmationChange={setDiscardConfirmation}
        onDiscardDraft={discardDraft}
      />
    </div>
  );
}
