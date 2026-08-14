"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  FacultyCourseAlignment,
} from "@/features/outcomes/services/manage-faculty-course-alignment";

declare global {
  interface Window {
    navigation?: {
      currentEntry?: { index: number } | null;
    };
  }
}

type Props = {
  alignment: FacultyCourseAlignment;
  prepareAction: (
    input: unknown
  ) => Promise<
    { success: true; review: CourseAlignmentReview } | { success: false; error: string }
  >;
  commitAction: (
    review: unknown,
    confirmed: boolean
  ) => Promise<{ success: true; changed: number } | { success: false; error: string }>;
};

const HISTORY_GUARD_KEY = "cloie-course-alignment-dirty-entry";

function isHistoryGuardEntry(marker: string): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === "object" && state !== null && Reflect.get(state, HISTORY_GUARD_KEY) === marker
  );
}

function indexAlignmentTargets(alignment: FacultyCourseAlignment) {
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

type CiloMappingRowsProps = {
  alignment: FacultyCourseAlignment;
  draft: Record<string, string[]>;
  disabled: boolean;
  onToggleTarget: (ciloId: string, targetId: string) => void;
};
function CiloMappingRows({ alignment, draft, disabled, onToggleTarget }: CiloMappingRowsProps) {
  const [openCilo, setOpenCilo] = useState<string | null>(null);
  const [search, setSearch] = useState<Record<string, string>>({});
  const { activeTargetIds, targetById } = indexAlignmentTargets(alignment);
  const targetNoun =
    alignment.course.scope === "GENERAL_EDUCATION"
      ? "Institutional Outcome"
      : "Graduate Outcome";

  return (
    <div className="flex flex-col gap-4">
      {/* fallow-ignore-next-line complexity */}
      {alignment.cilos.map((cilo, index) => {
        const query = (search[cilo.id] ?? "").toLowerCase().trim();
        const targets = alignment.targets.filter(
          (target) => !query || `${target.code} ${target.description}`.toLowerCase().includes(query)
        );
        const selectedTargetIds = draft[cilo.id] ?? [];
        const activeSelectedCount = selectedTargetIds.filter((targetId) =>
          activeTargetIds.has(targetId)
        ).length;
        const unavailableSelectedCount = selectedTargetIds.length - activeSelectedCount;
        return (
          <Card key={cilo.id}>
            <CardHeader>
              <CardTitle className="text-title-md">CILO {index + 1}</CardTitle>
              <CardDescription>{cilo.description}</CardDescription>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {selectedTargetIds.length} {targetNoun}
                  {selectedTargetIds.length === 1 ? "" : "s"} mapped
                </p>
                <Badge variant={activeSelectedCount > 0 ? "default" : "outline"}>
                  {activeSelectedCount > 0 ? "Covered" : "Incomplete"}
                </Badge>
                {unavailableSelectedCount > 0 && (
                  <Badge variant="outline">Unavailable mapping</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-between"
                aria-expanded={openCilo === cilo.id}
                aria-controls={`cilo-targets-${cilo.id}`}
                onClick={() => setOpenCilo(openCilo === cilo.id ? null : cilo.id)}
                disabled={alignment.targets.length === 0 || disabled}
              >
                <span>
                  {openCilo === cilo.id ? `Hide ${targetNoun}s` : `Choose ${targetNoun}s`}
                </span>
                <ChevronDown data-icon="inline-end" />
              </Button>
              {openCilo === cilo.id && (
                <div id={`cilo-targets-${cilo.id}`} className="mt-3 flex flex-col gap-2">
                  <label htmlFor={`go-search-${cilo.id}`} className="text-sm font-medium">
                    Search {targetNoun}s
                  </label>
                  <Input
                    id={`go-search-${cilo.id}`}
                    value={search[cilo.id] ?? ""}
                    onChange={(event) =>
                      setSearch((current) => ({
                        ...current,
                        [cilo.id]: event.target.value,
                      }))
                    }
                    placeholder="Search by code or statement"
                    disabled={disabled}
                  />
                  <div
                    className="flex max-h-72 flex-col gap-1 overflow-y-auto"
                    role="group"
                    aria-label={`${targetNoun}s for CILO ${index + 1}`}
                  >
                    {targets.map((target) => {
                      const selected = selectedTargetIds.includes(target.id);
                      return (
                        <label
                          key={target.id}
                          className="border-border hover:bg-muted focus-within:ring-ring/50 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 focus-within:ring-3"
                        >
                          <Checkbox
                            checked={selected}
                            disabled={disabled}
                            onCheckedChange={() => onToggleTarget(cilo.id, target.id)}
                            aria-label={`${target.code}: ${target.description}`}
                          />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">{target.code}</span>
                            <span className="text-muted-foreground text-sm">
                              {target.description}
                            </span>
                          </span>
                          {selected && (
                            <Check className="text-primary mt-0.5 ml-auto" aria-hidden="true" />
                          )}
                        </label>
                      );
                    })}
                    {targets.length === 0 && (
                      <p className="text-muted-foreground p-3 text-sm">
                        No {targetNoun}s match this search.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedTargetIds.length > 0 && (
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label={`Mapped ${targetNoun}s for CILO ${index + 1}`}
                >
                  {selectedTargetIds.map((targetId) => {
                    const unavailable = !activeTargetIds.has(targetId);
                    return (
                      <div key={targetId} className="flex items-center gap-1">
                        <Badge variant="secondary">
                          {targetById.get(targetId)?.code ?? targetId}
                          {unavailable ? " (unavailable)" : ""}
                        </Badge>
                        {unavailable && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => onToggleTarget(cilo.id, targetId)}
                            disabled={disabled}
                            aria-label={`Remove unavailable ${targetById.get(targetId)?.code ?? targetId} mapping`}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type AlignmentContentProps = {
  alignment: FacultyCourseAlignment;
  draft: Record<string, string[]>;
  disabled: boolean;
  onToggleTarget: (ciloId: string, targetId: string) => void;
};

function AlignmentContent({ alignment, draft, disabled, onToggleTarget }: AlignmentContentProps) {
  if (alignment.cilos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active CILOs</CardTitle>
          <CardDescription>
            Add a Course Intended Learning Outcome before aligning this Course.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/faculty/cilos" />}>
            Manage CILOs
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {alignment.targets.length === 0 && (
        <Alert>
          <AlertDescription>
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? "No active Institutional Outcomes exist yet. CILOs remain visible, but selection is unavailable until the Secretary creates an active Institutional Outcome."
              : `${alignment.course.program?.code} has no active Graduate Outcomes. CILOs remain visible, but selection is unavailable until the Program Head creates an active Graduate Outcome.`}
          </AlertDescription>
        </Alert>
      )}
      {alignment.course.scope === "GENERAL_EDUCATION" && (
        <Alert>
          <AlertDescription>
            This is a General Education Course. Mapping changes apply to every active assignment
            using this shared Course, not just one section.
          </AlertDescription>
        </Alert>
      )}
      <CiloMappingRows
        alignment={alignment}
        draft={draft}
        disabled={disabled}
        onToggleTarget={onToggleTarget}
      />
    </>
  );
}

type AlignmentDialogsProps = {
  alignment: FacultyCourseAlignment;
  review: CourseAlignmentReview | null;
  discardConfirmation: boolean;
  pending: boolean;
  renderTargets: (targetIds: string[]) => string;
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
  renderTargets,
  onCloseReview,
  onCommitReview,
  onDiscardConfirmationChange,
  onDiscardDraft,
}: AlignmentDialogsProps) {
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
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto text-sm">
            {review?.before.map((before) => {
              const after = review.after.find((item) => item.ciloId === before.ciloId);
              const ciloIndex = alignment.cilos.findIndex((cilo) => cilo.id === before.ciloId);
              return (
                <div key={before.ciloId} className="flex flex-col gap-1">
                  <p className="font-medium">CILO {ciloIndex + 1}</p>
                  <p>
                    <span className="text-muted-foreground">Before: </span>
                    {renderTargets(before.targetIds)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">After: </span>
                    {renderTargets(after?.targetIds ?? [])}
                  </p>
                </div>
              );
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

// fallow-ignore-next-line complexity
export function FacultyCourseAlignmentEditor({ alignment, prepareAction, commitAction }: Props) {
  const initialTargetIds = Object.fromEntries(
    alignment.cilos.map((cilo) => [cilo.id, cilo.targetIds])
  ) as Record<string, string[]>;
  const [draft, setDraft] = useState(initialTargetIds);
  const [savedTargetIds, setSavedTargetIds] = useState(initialTargetIds);
  const [review, setReview] = useState<CourseAlignmentReview | null>(null);
  const [discardConfirmation, setDiscardConfirmation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [freshnessToken, setFreshnessToken] = useState(alignment.freshnessToken);

  const { activeTargetIds, targetById } = indexAlignmentTargets(alignment);
  const isDirty = alignment.cilos.some(
    (cilo) => JSON.stringify(draft[cilo.id] ?? []) !== JSON.stringify(savedTargetIds[cilo.id] ?? [])
  );
  const additions = useMemo(
    () =>
      alignment.cilos.flatMap((cilo) =>
        (draft[cilo.id] ?? [])
          .filter((targetId) => !(savedTargetIds[cilo.id] ?? []).includes(targetId))
          .map((targetId) => ({ ciloId: cilo.id, targetId }))
      ),
    [alignment.cilos, draft, savedTargetIds]
  );
  const removals = useMemo(
    () =>
      alignment.cilos.flatMap((cilo) =>
        (savedTargetIds[cilo.id] ?? [])
          .filter((targetId) => !(draft[cilo.id] ?? []).includes(targetId))
          .map((targetId) => ({ ciloId: cilo.id, targetId }))
      ),
    [alignment.cilos, draft, savedTargetIds]
  );
  const readiness =
    alignment.cilos.length === 0
      ? "missing-cilos"
      : alignment.cilos.every((cilo) =>
            (draft[cilo.id] ?? []).some((targetId) => activeTargetIds.has(targetId))
          )
        ? "ready"
        : "incomplete-mapping";
  const editingLocked = pending || review !== null;
  const needsReload = error?.includes("Reload and review") ?? false;

  const targetLabel = (targetId: string) => targetById.get(targetId)?.code ?? targetId;
  const snapshotTargetIds = (snapshot: CourseAlignmentReview["after"]) =>
    Object.fromEntries(snapshot.map((item) => [item.ciloId, item.targetIds])) as Record<
      string,
      string[]
    >;
  const renderTargets = (targetIds: string[]) =>
    targetIds.length === 0 ? "None" : targetIds.map(targetLabel).join(", ");

  const toggleTarget = (ciloId: string, targetId: string) => {
    setDraft((current) => {
      const selected = current[ciloId] ?? [];
      return {
        ...current,
        [ciloId]: selected.includes(targetId)
          ? selected.filter((id) => id !== targetId)
          : [...selected, targetId],
      };
    });
    setSuccess(null);
  };

  const prepareReview = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await prepareAction({
        courseId: alignment.course.id,
        desired: alignment.cilos.map((cilo) => ({
          ciloId: cilo.id,
          targetIds: draft[cilo.id] ?? [],
        })),
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

  const commitReview = async () => {
    if (!review) return;
    const reviewToCommit = review;
    setPending(true);
    setError(null);
    try {
      const result = await commitAction(reviewToCommit, true);
      setReview(null);
      if (result.success) {
        const committedTargetIds = snapshotTargetIds(reviewToCommit.after);
        setDraft(committedTargetIds);
        setSavedTargetIds(committedTargetIds);
        setFreshnessToken(JSON.stringify(reviewToCommit.after));
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
    setDraft(savedTargetIds);
    setDiscardConfirmation(false);
    setSuccess(null);
    setError(null);
  };

  useDirtyAlignmentNavigationGuard(isDirty);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Faculty Course alignment</p>
          <h1 className="text-heading-lg">
            {alignment.course.code}: {alignment.course.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? "Select the active Institutional Outcomes from the college-wide catalog."
              : `Select the active Graduate Outcomes owned by ${alignment.course.program?.code}.`}
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
        onToggleTarget={toggleTarget}
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
        <Button
          type="button"
          onClick={prepareReview}
          disabled={!isDirty || editingLocked || alignment.cilos.length === 0}
        >
          <Save data-icon="inline-start" />
          {pending ? "Preparing review..." : `Review ${additions.length + removals.length} changes`}
        </Button>
      </div>

      <AlignmentDialogs
        alignment={alignment}
        review={review}
        discardConfirmation={discardConfirmation}
        pending={pending}
        renderTargets={renderTargets}
        onCloseReview={() => setReview(null)}
        onCommitReview={commitReview}
        onDiscardConfirmationChange={setDiscardConfirmation}
        onDiscardDraft={discardDraft}
      />
    </div>
  );
}
