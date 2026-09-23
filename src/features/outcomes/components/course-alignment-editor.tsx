// fallow-ignore-file code-duplication
"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
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

type Props = {
  alignment: CourseAlignment;
  eyebrow?: string;
  emptyStateAction?: { href: string; label: string };
  /**
   * Where a committed mapping returns to. Defaults to the Faculty Manage CILOs
   * list, the surface every faculty alignment entry point starts from.
   */
  returnHref?: string;
  prepareAction: (
    input: unknown
  ) => Promise<
    { success: true; review: CourseAlignmentReview } | { success: false; error: string }
  >;
  commitAction: (
    review: unknown,
    confirmed: boolean
  ) => Promise<
    { success: true; changed: number; freshnessToken: string } | { success: false; error: string }
  >;
};

/**
 * Why the discard confirmation is open. The two intents share one overlay but
 * not one outcome: `draft` stays on the editor, `leave` continues to `href`
 * (or to the previous history entry when `href` is null).
 */
type DiscardIntent = { kind: "draft" } | { kind: "leave"; href: string | null };

function indexAlignmentTargets(alignment: CourseAlignment) {
  return {
    activeTargetIds: new Set(alignment.targets.map((target) => target.id)),
    targetById: new Map(
      [...alignment.targets, ...alignment.unavailableTargets].map((target) => [target.id, target])
    ),
  };
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
            This is a General Education Course. Mapping changes apply to every active assignment
            using this shared Course, not just one section.
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
  discardIntent: DiscardIntent | null;
  pending: boolean;
  onCloseReview: () => void;
  onCommitReview: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
};

function AlignmentDialogs({
  alignment,
  review,
  discardIntent,
  pending,
  onCloseReview,
  onCommitReview,
  onCancelDiscard,
  onConfirmDiscard,
}: AlignmentDialogsProps) {
  const { activeTargetIds, targetById } = indexAlignmentTargets(alignment);
  // The "Discard changes" button and a departure attempt reach differing
  // consequences, so the confirmation names the one the user is about to enter.
  const isDeparture = discardIntent?.kind === "leave";
  const discardCancelLabel = isDeparture ? "Keep editing" : "Keep mapping";
  const discardConfirmLabel = isDeparture ? "Discard and leave" : "Discard draft";
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
          <div className="text-body-sm flex max-h-64 flex-col gap-3 overflow-y-auto">
            {review &&
              renderReviewLines({
                alignment,
                review,
                targetById,
                activeTargetIds,
              })}
          </div>
          <p className="text-muted-foreground text-sm">
            Saved mappings take effect for every active assignment using this Course. Incomplete
            mappings remain blocked from publication until all required pairs are classified.
          </p>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onCloseReview} disabled={pending}>
              Back to editing
            </Button>
            <Button type="button" onClick={onCommitReview} disabled={pending}>
              {pending ? "Saving..." : "Confirm and save"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResponsiveAlertDialog
        open={discardIntent !== null}
        onOpenChange={(open) => {
          if (!open) onCancelDiscard();
        }}
      >
        <ResponsiveAlertDialogContent desktopClassName="sm:max-w-md">
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Discard staged alignment changes?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {discardIntent?.kind === "leave"
                ? "The staged mapping changes have not been saved. Discarding them leaves this page and restores the last saved Course alignment."
                : "The staged mapping changes have not been saved. Discarding them restores the last saved Course alignment."}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>{discardCancelLabel}</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction onClick={onConfirmDiscard}>
              {discardConfirmLabel}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
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
  returnHref = "/faculty/cilos",
  prepareAction,
  commitAction,
}: Props) {
  const router = useRouter();
  const isProgramSpecific = alignment.course.scope === "PROGRAM_SPECIFIC";
  const { activeTargetIds } = indexAlignmentTargets(alignment);
  const initialCells = cellsFromAlignment(alignment, activeTargetIds);
  const [draft, setDraft] = useState(initialCells);
  const [savedCells, setSavedCells] = useState(initialCells);
  const [review, setReview] = useState<CourseAlignmentReview | null>(null);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        // The mapping is committed server-side, so this surface is done: report
        // the outcome and hand the author back to the list they entered from.
        const message = `${result.changed} mapping change${result.changed === 1 ? "" : "s"} saved.`;
        showToast(message, "success");
        router.push(returnHref);
        return;
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
    setDiscardIntent(null);
    setError(null);
  };

  // A departure the guard intercepted: the draft is still staged and the user
  // has not agreed to lose it, so remember where they were going and ask.
  const requestLeave = useCallback((href: string | null) => {
    setDiscardIntent((current) => current ?? { kind: "leave", href });
  }, []);

  const { allowDeparture } = useUnsavedChangesGuard({ isDirty, onRequestLeave: requestLeave });

  const leaveEditor = (href: string | null) => {
    // The confirmed departure is the one navigation the guard must not re-ask
    // about, including the router's own history entry for it.
    allowDeparture();
    setDiscardIntent(null);
    if (href === null) {
      window.history.back();
      return;
    }
    router.push(href);
  };

  const confirmDiscard = () => {
    const intent = discardIntent;
    if (intent?.kind === "leave") {
      setDraft(savedCells);
      leaveEditor(intent.href);
      return;
    }
    discardDraft();
  };

  const cancelDiscard = () => {
    setDiscardIntent(null);
  };

  return (
    // The mobile action toolbar is fixed over the page, so the editor reserves
    // its height (plus the safe area) to keep the last CILO row reachable.
    <div className="flex flex-col gap-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-body-sm">{eyebrow}</p>
          <h1 className="text-heading-lg">
            {alignment.course.code}: {alignment.course.title}
          </h1>
          <p className="text-muted-foreground text-body-sm mt-1">
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? "Classify each CILO against at least one active Institutional Outcome from the college-wide catalog."
              : `Classify each CILO against every active Graduate Outcome owned by ${alignment.course.program?.code ?? "the program"}.`}
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
      <AlignmentContent
        alignment={alignment}
        draft={draft}
        disabled={editingLocked}
        emptyStateAction={emptyStateAction}
        onChangeCell={changeCell}
      />

      {!mappingComplete && alignment.cilos.length > 0 && (
        <p className="text-muted-foreground text-sm" role="status">
          Incomplete mappings can be reviewed and saved. Publication stays blocked until every
          required mapping is complete.
        </p>
      )}

      {/* On phones the CILO cards run far past the fold, so the two document
          actions pin to the bottom edge as a toolbar. From `md` up the page
          fits and they return to the flow, right-aligned under the matrix. */}
      <div
        role="toolbar"
        aria-label="Alignment actions"
        className="border-border bg-background fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 items-center gap-2 border-t px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 md:static md:mx-0 md:flex md:grid-cols-none md:flex-row md:justify-end md:gap-3 md:border-t md:px-0 md:pt-4 md:pb-0"
      >
        <Button
          type="button"
          variant="outline"
          className="w-full md:w-auto"
          onClick={() => setDiscardIntent({ kind: "draft" })}
          disabled={!isDirty || editingLocked}
        >
          <RotateCcw data-icon="inline-start" />
          Discard changes
        </Button>
        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={prepareReview}
          disabled={!isDirty || editingLocked || alignment.cilos.length === 0}
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
        discardIntent={discardIntent}
        pending={pending}
        onCloseReview={() => setReview(null)}
        onCommitReview={commitReview}
        onCancelDiscard={cancelDiscard}
        onConfirmDiscard={confirmDiscard}
      />
    </div>
  );
}
