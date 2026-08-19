"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ListChecks, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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

type AlignmentDraft = Record<string, string[]> | ManifestationDraftState;

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

type CiloMappingRowsProps = {
  alignment: CourseAlignment;
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
      : "Program Learning Outcome";

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
                <p className="text-muted-foreground text-body-sm" aria-live="polite">
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
                  <label htmlFor={`go-search-${cilo.id}`} className="text-label-sm">
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
                            <span className="text-muted-foreground text-body-sm">
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
                      <p className="text-muted-foreground p-3 text-body-sm">
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
  alignment: CourseAlignment;
  draft: Record<string, string[]> | ManifestationDraftState;
  disabled: boolean;
  emptyStateAction: { href: string; label: string };
  onToggleTarget: (ciloId: string, targetId: string) => void;
  onChangeCell: (ciloId: string, ploId: string, manifestation: CILOMappingManifestation | null) => void;
};

function AlignmentContent({
  alignment,
  draft,
  disabled,
  emptyStateAction,
  onToggleTarget,
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

  if (alignment.course.scope === "PROGRAM_SPECIFIC") {
    return (
      <ManifestationAlignmentContent
        alignment={alignment}
        draft={draft as ManifestationDraftState}
        disabled={disabled}
        onChangeCell={onChangeCell}
      />
    );
  }

  return (
    <>
      {alignment.targets.length === 0 && (
        <Alert>
          <AlertDescription>
            No active Institutional Outcomes exist yet. CILOs remain visible, but selection is
            unavailable until the Secretary creates an active Institutional Outcome.
          </AlertDescription>
        </Alert>
      )}
      <Alert>
        <AlertDescription>
          This is a General Education Course. Mapping changes apply to every active assignment using
          this shared Course, not just one section.
        </AlertDescription>
      </Alert>
      <CiloMappingRows
        alignment={alignment}
        draft={draft as Record<string, string[]>}
        disabled={disabled}
        onToggleTarget={onToggleTarget}
      />
    </>
  );
}

type AlignmentDialogsProps = {
  alignment: CourseAlignment;
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
  const { targetById } = indexAlignmentTargets(alignment);
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
              (review.scope === "GENERAL_EDUCATION" ? (
                review.before.map((before) => {
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
                })
              ) : (
                // fallow-ignore-next-line complexity
                (() => {
                  const linesByCilo = new Map<string, string[]>();
                  for (const addition of review.additions) {
                    const lines = linesByCilo.get(addition.ciloId) ?? [];
                    lines.push(
                      `${targetById.get(addition.ploId)?.code ?? addition.ploId}: Set to ${manifestationLabel(addition.manifestation)}`
                    );
                    linesByCilo.set(addition.ciloId, lines);
                  }
                  for (const update of review.updates) {
                    const lines = linesByCilo.get(update.ciloId) ?? [];
                    lines.push(
                      `${targetById.get(update.ploId)?.code ?? update.ploId}: ${manifestationLabel(update.from)} \u2192 ${manifestationLabel(update.to)}`
                    );
                    linesByCilo.set(update.ciloId, lines);
                  }
                  for (const removal of review.removals) {
                    const lines = linesByCilo.get(removal.ciloId) ?? [];
                    const before = review.before.find((item) => item.ciloId === removal.ciloId);
                    const beforeManifestation = before?.mappings.find(
                      (mapping) => mapping.ploId === removal.ploId
                    )?.manifestation;
                    lines.push(
                      `${targetById.get(removal.ploId)?.code ?? removal.ploId}: ${manifestationLabel(beforeManifestation)} \u2192 Unanswered`
                    );
                    linesByCilo.set(removal.ciloId, lines);
                  }
                  return [...linesByCilo.entries()].map(([ciloId, lines]) => {
                    const ciloIndex = alignment.cilos.findIndex((cilo) => cilo.id === ciloId);
                    return (
                      <div key={ciloId} className="flex flex-col gap-1">
                        <p className="font-medium">CILO {ciloIndex + 1}</p>
                        <ul className="flex flex-col gap-0.5">
                          {lines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  });
                })()
              ))}
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
export function CourseAlignmentEditor({
  alignment,
  eyebrow = "Faculty Course alignment",
  emptyStateAction = { href: "/faculty/cilos", label: "Manage CILOs" },
  prepareAction,
  commitAction,
  saveDraftAction,
}: Props) {
  const isProgramSpecific = alignment.course.scope === "PROGRAM_SPECIFIC";
  const { activeTargetIds, targetById } = indexAlignmentTargets(alignment);
  const initialTargetIds = Object.fromEntries(
    alignment.cilos.map((cilo) => [
      cilo.id,
      isProgramSpecific
        ? Object.fromEntries(
            ("mappings" in cilo ? cilo.mappings : [])
              .filter(
                (mapping) =>
                  mapping.manifestation !== null && activeTargetIds.has(mapping.ploId)
              )
              .map((mapping) => [mapping.ploId, mapping.manifestation])
          )
        : "targetIds" in cilo
          ? cilo.targetIds
          : [],
    ])
  ) as Record<string, string[]> | ManifestationDraftState;
  const [draft, setDraft] = useState(initialTargetIds);
  const [savedTargetIds, setSavedTargetIds] = useState(initialTargetIds);
  const [review, setReview] = useState<CourseAlignmentReview | null>(null);
  const [discardConfirmation, setDiscardConfirmation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [freshnessToken, setFreshnessToken] = useState(alignment.freshnessToken);

  const draftCells = isProgramSpecific
    ? (draft as ManifestationDraftState)
    : ({} as ManifestationDraftState);
  const savedCells = isProgramSpecific
    ? (savedTargetIds as ManifestationDraftState)
    : ({} as ManifestationDraftState);
  const geDraft = draft as Record<string, string[]>;
  const geSaved = savedTargetIds as Record<string, string[]>;
  const isDirty = alignment.cilos.some((cilo) =>
    isProgramSpecific
      ? JSON.stringify(draftCells[cilo.id] ?? {}) !== JSON.stringify(savedCells[cilo.id] ?? {})
      : JSON.stringify(geDraft[cilo.id] ?? []) !== JSON.stringify(geSaved[cilo.id] ?? [])
  );
  const additions = useMemo(
    () =>
      isProgramSpecific
        ? []
        : alignment.cilos.flatMap((cilo) =>
            (geDraft[cilo.id] ?? [])
              .filter((targetId) => !(geSaved[cilo.id] ?? []).includes(targetId))
              .map((targetId) => ({ ciloId: cilo.id, targetId }))
          ),
    [alignment.cilos, geDraft, geSaved, isProgramSpecific]
  );
  const removals = useMemo(
    () =>
      isProgramSpecific
        ? []
        : alignment.cilos.flatMap((cilo) =>
            (geSaved[cilo.id] ?? [])
              .filter((targetId) => !(geDraft[cilo.id] ?? []).includes(targetId))
              .map((targetId) => ({ ciloId: cilo.id, targetId }))
          ),
    [alignment.cilos, geDraft, geSaved, isProgramSpecific]
  );
  const manifestationChangeCount = isProgramSpecific
    ? alignment.cilos.reduce((total, cilo) => {
        const current = draftCells[cilo.id] ?? {};
        const saved = savedCells[cilo.id] ?? {};
        return (
          total +
          alignment.targets.filter(
            (target) => (current[target.id] ?? null) !== (saved[target.id] ?? null)
          ).length
        );
      }, 0)
    : 0;
  const pspComplete =
    isProgramSpecific &&
    alignment.targets.length > 0 &&
    alignment.cilos.every((cilo) =>
      alignment.targets.every((target) => draftCells[cilo.id]?.[target.id] !== undefined)
    );
  const readiness =
    alignment.cilos.length === 0
      ? "missing-cilos"
      : isProgramSpecific
        ? pspComplete
          ? "ready"
          : "incomplete-mapping"
        : alignment.cilos.every((cilo) =>
            (geDraft[cilo.id] ?? []).some((targetId) => activeTargetIds.has(targetId))
          )
          ? "ready"
          : "incomplete-mapping";
  const editingLocked = pending || review !== null;
  const needsReload = error?.includes("Reload and review") ?? false;
  const changeCount = isProgramSpecific ? manifestationChangeCount : additions.length + removals.length;

  const targetLabel = (targetId: string) => targetById.get(targetId)?.code ?? targetId;
  const renderTargets = (targetIds: string[]) =>
    targetIds.length === 0 ? "None" : targetIds.map(targetLabel).join(", ");

  const toggleTarget = (ciloId: string, targetId: string) => {
    setDraft((current) => {
      const selected = (current as Record<string, string[]>)[ciloId] ?? [];
      return {
        ...current,
        [ciloId]: selected.includes(targetId)
          ? selected.filter((id) => id !== targetId)
          : [...selected, targetId],
      } as AlignmentDraft;
    });
    setSuccess(null);
  };

  const changeCell = (
    ciloId: string,
    ploId: string,
    manifestation: CILOMappingManifestation | null
  ) => {
    setDraft((current) => {
      const cells = { ...(current[ciloId] as ManifestationDraftState[string] | undefined) };
      if (manifestation === null) delete cells[ploId];
      else cells[ploId] = manifestation;
      return { ...current, [ciloId]: cells } as AlignmentDraft;
    });
    setSuccess(null);
  };

  const prepareReview = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await prepareAction({
        courseId: alignment.course.id,
        desired: alignment.cilos.map((cilo) =>
          isProgramSpecific
            ? {
                ciloId: cilo.id,
                mappings: alignment.targets.flatMap((target) => {
                  const manifestation = draftCells[cilo.id]?.[target.id];
                  return manifestation === undefined
                    ? []
                    : [{ ploId: target.id, manifestation }];
                }),
              }
            : { ciloId: cilo.id, targetIds: geDraft[cilo.id] ?? [] }
        ),
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
        cells: alignment.cilos.map((cilo) => ({
          ciloId: cilo.id,
          mappings: alignment.targets.flatMap((target) => {
            const manifestation = draftCells[cilo.id]?.[target.id];
            return manifestation === undefined
              ? []
              : [{ ploId: target.id, manifestation }];
          }),
        })),
        freshnessToken,
      });
      if (result.success) {
        setSavedTargetIds(draft);
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
        const committedState =
          reviewToCommit.scope === "GENERAL_EDUCATION"
            ? (Object.fromEntries(
                reviewToCommit.after.map((item) => [item.ciloId, item.targetIds])
              ) as Record<string, string[]>)
            : (Object.fromEntries(
                reviewToCommit.after.map((item) => [
                  item.ciloId,
                  Object.fromEntries(
                    item.mappings.map((mapping) => [mapping.ploId, mapping.manifestation])
                  ),
                ])
              ) as ManifestationDraftState);
        setDraft(committedState);
        setSavedTargetIds(committedState);
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
          <p className="text-muted-foreground text-body-sm">{eyebrow}</p>
          <h1 className="text-heading-lg">
            {alignment.course.code}: {alignment.course.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-body-sm">
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? "Select the active Institutional Outcomes from the college-wide catalog."
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
        onToggleTarget={toggleTarget}
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
        {isProgramSpecific && saveDraftAction && (
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
            !isDirty ||
            editingLocked ||
            alignment.cilos.length === 0 ||
            (isProgramSpecific && !pspComplete)
          }
        >
          <Save data-icon="inline-start" />
          {pending
            ? "Preparing review..."
            : isProgramSpecific
              ? `Review ${manifestationChangeCount} change${manifestationChangeCount === 1 ? "" : "s"}`
              : `Review ${additions.length + removals.length} changes`}
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
