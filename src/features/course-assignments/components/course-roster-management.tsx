"use client";

import type { DragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { YearLevel, StudentSection } from "@prisma/client";
import { useRef, useState, useTransition } from "react";
import {
  FileSpreadsheet,
  FileUp,
  RotateCcw,
  Upload,
  UserPlus,
  UserRoundMinus,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  addRosterMembershipAction,
  confirmRosterResolutionAction,
  previewCourseRosterAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
} from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterMember,
  CourseRosterPreview,
  CourseRosterPreviewCandidate,
  CourseRosterPreviewDisposition,
  CourseRosterPreviewResolution,
  CourseRosterPreviewRow,
  CourseRosterConfirmation,
  CourseRosterConfirmationOutcome,
} from "../types";
import {
  COURSE_ROSTER_MAX_ROWS,
  COURSE_ROSTER_TEMPLATE,
  parseCourseRosterCsv,
  exportFailedCourseRosterRows,
} from "../services/course-roster-csv";
import { WizardStepper } from "./shared/wizard-stepper";
import { ScopedRosterStudentSearch } from "./scoped-roster-student-search";

function MutationMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert aria-live="polite">
      <AlertTitle>Roster update</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resultMessage(result: {
  success: boolean;
  error?: string;
  data?: { message: string };
}) {
  if (result.success) return result.data?.message ?? "Roster updated.";
  return result.error ?? "The roster request could not be completed.";
}

async function runCsvPreview(
  file: File,
  assignmentId: string,
  programId?: string
): Promise<{ ok: true; data: CourseRosterPreview } | { ok: false; message: string }> {
  try {
    const parsed = parseCourseRosterCsv(new Uint8Array(await file.arrayBuffer()));
    if (!parsed.success) return { ok: false, message: parsed.error };

    const result = await previewCourseRosterAction({
      assignmentId,
      programId,
      rows: parsed.rows.map((row) => ({
        sourceIndex: row.sourceIndex,
        submittedName: row.submittedName,
        status: row.status,
      })),
    });
    if (result.success) return { ok: true, data: result.data };
    return { ok: false, message: result.error };
  } catch {
    return { ok: false, message: "The roster preview could not be completed." };
  }
}

type RosterManagementPhase = "add" | "review" | "results";
type RosterManagementMethod = "import" | "single";
type PreviewFilter = "all" | "ready" | "review" | "resolve" | "skipped" | "already-active";

const PREVIEW_FILTERS: Array<{ key: PreviewFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "review", label: "Review" },
  { key: "resolve", label: "Resolve" },
  { key: "skipped", label: "Skipped" },
  { key: "already-active", label: "Already active" },
];

function resolutionBadge(resolution: CourseRosterPreviewResolution) {
  switch (resolution.status) {
    case "EXACT_MATCH":
      return <Badge variant="success">Exact match</Badge>;
    case "SUGGESTED_MATCH":
      return <Badge variant="warning">Suggested match</Badge>;
    case "AMBIGUOUS":
      return <Badge variant="warning">Ambiguous</Badge>;
    case "NO_MATCH":
      return <Badge variant="secondary">No match</Badge>;
    case "INVALID_NAME":
      return <Badge variant="secondary">Invalid name</Badge>;
  }
}

function dispositionBadge(disposition: CourseRosterPreviewDisposition | null) {
  switch (disposition) {
    case "READY_CREATE":
      return <Badge variant="success">Ready to add</Badge>;
    case "WILL_RESTORE":
      return <Badge variant="information">Will restore</Badge>;
    case "ALREADY_ACTIVE":
      return <Badge variant="secondary">Already active</Badge>;
    case "INELIGIBLE":
      return <Badge variant="destructive">Ineligible</Badge>;
    case "OTHER_SECTION_CONFLICT":
      return <Badge variant="destructive">Other section conflict</Badge>;
    case null:
      return null;
  }
}
function rowIsSuggested(row: CourseRosterPreviewRow) {
  return row.resolution.status === "SUGGESTED_MATCH";
}

function rowIsPrepared(row: CourseRosterPreviewRow) {
  return (
    (row.resolution.status === "EXACT_MATCH" || rowIsSuggested(row)) &&
    (row.disposition === "READY_CREATE" || row.disposition === "WILL_RESTORE")
  );
}

function preparedCandidate(
  row: CourseRosterPreviewRow
): CourseRosterPreviewCandidate | undefined {
  if (!rowIsPrepared(row)) return undefined;
  const candidateId = row.resolution.candidateIds[0];
  return row.candidates.find((candidate) => candidate.userId === candidateId);
}

function hasSuggestedRow(preview: CourseRosterPreview | null, sourceIndex: number) {
  return (
    preview?.rows.some((row) => row.sourceIndex === sourceIndex && rowIsSuggested(row)) ??
    false
  );
}

type ReviewGuardState = {
  suggestedCount: number;
  reviewBlockers: string[];
};

// The identities a confirmation would submit: manual selections plus
// prepared exact matches and (once acknowledged) suggested matches.
export function effectiveCandidateByIndexFor({
  preview,
  skippedIndexes,
  selectedCandidateByIndex,
  suggestionsAcknowledged,
}: {
  preview: CourseRosterPreview | null;
  skippedIndexes: ReadonlySet<number>;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  suggestionsAcknowledged: boolean;
}): Record<number, CourseRosterPreviewCandidate> {
  const effectiveCandidateByIndex: Record<number, CourseRosterPreviewCandidate> = {};
  for (const row of preview?.rows ?? []) {
    if (skippedIndexes.has(row.sourceIndex)) continue;
    const manual = selectedCandidateByIndex[row.sourceIndex];
    if (manual) {
      effectiveCandidateByIndex[row.sourceIndex] = manual;
      continue;
    }
    if (
      row.resolution.status === "EXACT_MATCH" ||
      (suggestionsAcknowledged && rowIsSuggested(row))
    ) {
      const prepared = preparedCandidate(row);
      if (prepared) effectiveCandidateByIndex[row.sourceIndex] = prepared;
    }
  }
  return effectiveCandidateByIndex;
}

// Review completion guards: every non-skipped row is resolved, no account is
// selected for two rows, and acknowledged suggestions match the current set.
export function buildReviewGuards({
  preview,
  skippedIndexes,
  selectedCandidateByIndex,
  suggestionsAcknowledged,
}: {
  preview: CourseRosterPreview | null;
  skippedIndexes: ReadonlySet<number>;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  suggestionsAcknowledged: boolean;
}): ReviewGuardState {
  const suggestedCount =
    preview?.rows.filter(
      (row) =>
        rowIsSuggested(row) &&
        rowIsPrepared(row) &&
        !skippedIndexes.has(row.sourceIndex) &&
        !(row.sourceIndex in selectedCandidateByIndex)
    ).length ?? 0;

  const effectiveCandidateByIndex = effectiveCandidateByIndexFor({
    preview,
    skippedIndexes,
    selectedCandidateByIndex,
    suggestionsAcknowledged,
  });

  const selectedIdsByUser = new Map<string, number[]>();
  for (const [sourceIndex, candidate] of Object.entries(effectiveCandidateByIndex)) {
    const indexes = selectedIdsByUser.get(candidate.userId) ?? [];
    indexes.push(Number(sourceIndex));
    selectedIdsByUser.set(candidate.userId, indexes);
  }
  const duplicateGroups = [...selectedIdsByUser.values()].filter(
    (indexes) => indexes.length > 1
  );

  const unresolvedRows =
    preview?.rows.filter(
      (row) =>
        !skippedIndexes.has(row.sourceIndex) &&
        row.disposition !== "ALREADY_ACTIVE" &&
        !(row.sourceIndex in selectedCandidateByIndex) &&
        !rowIsPrepared(row)
    ) ?? [];

  const reviewBlockers: string[] = [];
  if (duplicateGroups.length > 0) {
    reviewBlockers.push(
      `The same Student is selected for rows ${duplicateGroups
        .map((indexes) => indexes.join(" and "))
        .join("; ")}. Change or skip one before continuing.`
    );
  }
  if (unresolvedRows.length > 0) {
    reviewBlockers.push(
      `Resolve or skip ${unresolvedRows.length} row${unresolvedRows.length === 1 ? "" : "s"} before continuing.`
    );
  }
  if (suggestedCount > 0 && !suggestionsAcknowledged) {
    reviewBlockers.push(
      `Acknowledge ${suggestedCount} suggested ${suggestedCount === 1 ? "match" : "matches"} before continuing.`
    );
  }

  return { suggestedCount, reviewBlockers };
}

function rowGroup(
  row: CourseRosterPreviewRow,
  skippedIndexes: ReadonlySet<number>,
  selectedCandidateByIndex?: Record<number, CourseRosterPreviewCandidate>
): PreviewFilter {
  if (skippedIndexes.has(row.sourceIndex)) return "skipped";
  if (row.disposition === "ALREADY_ACTIVE") return "already-active";
  if (selectedCandidateByIndex && row.sourceIndex in selectedCandidateByIndex) return "ready";
  if (rowIsSuggested(row)) return "review";
  if (row.disposition === "READY_CREATE" || row.disposition === "WILL_RESTORE") return "ready";
  return "resolve";
}

function countRows(
  rows: CourseRosterPreviewRow[],
  skippedIndexes: ReadonlySet<number>,
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate> | undefined,
  group: PreviewFilter
) {
  return rows.filter((row) => rowGroup(row, skippedIndexes, selectedCandidateByIndex) === group)
    .length;
}

function countGroups(
  rows: CourseRosterPreviewRow[],
  skippedIndexes: ReadonlySet<number>,
  selectedCandidateByIndex?: Record<number, CourseRosterPreviewCandidate>
) {
  return {
    all: rows.length,
    ready: countRows(rows, skippedIndexes, selectedCandidateByIndex, "ready"),
    review: countRows(rows, skippedIndexes, selectedCandidateByIndex, "review"),
    resolve: countRows(rows, skippedIndexes, selectedCandidateByIndex, "resolve"),
    skipped: skippedIndexes.size,
    "already-active": countRows(rows, skippedIndexes, selectedCandidateByIndex, "already-active"),
  };
}

function CandidateContext({ candidate }: { candidate: CourseRosterPreviewCandidate }) {
  const yearLevel = candidate.yearLevel
    ? getYearLevelDisplay(candidate.yearLevel as YearLevel)
    : null;
  const section = candidate.section ? getSectionLabel(candidate.section as StudentSection) : null;
  return (
    <div className="flex flex-col gap-0.5 text-body-sm">
      <p className="font-medium">{candidate.name}</p>
      <p className="text-muted-foreground">{candidate.email}</p>
      <p className="text-muted-foreground">
        {[candidate.programName ?? candidate.programCode, yearLevel, section, candidate.majorName]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
      {!candidate.selectable && candidate.reason && (
        <p className="text-destructive">{candidate.reason}</p>
      )}
    </div>
  );
}

function ReviewRowControls({
  skipped,
  hasSelection,
  needsSearch,
  isSuggested,
  onClearSelection,
  onOpenSearch,
  onToggleSkip,
}: {
  skipped: boolean;
  hasSelection: boolean;
  needsSearch: boolean;
  isSuggested: boolean;
  onClearSelection: () => void;
  onOpenSearch: () => void;
  onToggleSkip: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!skipped && (
        <>
          {needsSearch && !hasSelection && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenSearch}>
              Search candidate
            </Button>
          )}
          {hasSelection && (
            <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
              <RotateCcw data-icon="inline-start" />
              Change
            </Button>
          )}
          {isSuggested && !hasSelection && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenSearch}>
              <RotateCcw data-icon="inline-start" />
              Change
            </Button>
          )}
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onToggleSkip}>
        {skipped ? "Unskip" : "Skip"}
      </Button>
    </div>
  );
}

function RowCandidateSearch({
  assignmentId,
  programId,
  onSelect,
}: {
  assignmentId: string;
  programId?: string;
  onSelect: (candidate: CourseRosterPreviewCandidate) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <ScopedRosterStudentSearch
        assignmentId={assignmentId}
        programId={programId}
        onSelect={onSelect}
      />
    </div>
  );
}

function RowSearchPanel({
  open,
  skipped,
  assignmentId,
  programId,
  onSelect,
}: {
  open: boolean;
  skipped: boolean;
  assignmentId: string;
  programId?: string;
  onSelect: (candidate: CourseRosterPreviewCandidate) => void;
}) {
  if (!open || skipped) return null;
  return <RowCandidateSearch assignmentId={assignmentId} programId={programId} onSelect={onSelect} />;
}

function RowStatusBadges({
  skipped,
  selected,
  resolution,
  disposition,
}: {
  skipped: boolean;
  selected: boolean;
  resolution: CourseRosterPreviewResolution;
  disposition: CourseRosterPreviewDisposition | null;
}) {
  if (skipped) return <Badge variant="secondary">Skipped</Badge>;
  if (selected) return <Badge variant="success">Selected</Badge>;
  return (
    <>
      {resolutionBadge(resolution)}
      {dispositionBadge(disposition)}
    </>
  );
}

function RowCandidateDisplay({
  candidate,
  candidates,
}: {
  candidate: CourseRosterPreviewCandidate | undefined;
  candidates: CourseRosterPreviewCandidate[];
}) {
  if (candidate) return <CandidateContext candidate={candidate} />;
  if (candidates.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {candidates.map((item) => (
        <CandidateContext key={item.userId} candidate={item} />
      ))}
    </div>
  );
}

function ReviewRowCard({
  row,
  assignment,
  programId,
  selectedCandidate,
  skipped,
  onSelect,
  onClearSelection,
  onToggleSkip,
}: {
  row: CourseRosterPreviewRow;
  assignment: CourseRosterAssignmentSummary | undefined;
  programId?: string;
  selectedCandidate: CourseRosterPreviewCandidate | undefined;
  skipped: boolean;
  onSelect: (candidate: CourseRosterPreviewCandidate) => void;
  onClearSelection: () => void;
  onToggleSkip: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const needsSearch = row.resolution.status === "AMBIGUOUS" || row.resolution.status === "NO_MATCH";
  const isSuggested = row.resolution.status === "SUGGESTED_MATCH";
  const isAlreadyActive = row.disposition === "ALREADY_ACTIVE";

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-3 ${
        skipped ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-md text-muted-foreground">#{row.sourceIndex}</span>
        <p className="min-w-0 flex-1 truncate text-body-sm font-medium">{row.submittedName}</p>
        <RowStatusBadges
          skipped={skipped}
          selected={selectedCandidate !== undefined}
          resolution={row.resolution}
          disposition={row.disposition}
        />
      </div>

      <RowCandidateDisplay candidate={selectedCandidate} candidates={row.candidates} />

      {assignment && (
        <p className="text-body-sm text-muted-foreground">
          {assignment.courseCode} — {assignment.courseTitle} ({assignment.programCode},{" "}
          {getYearLevelDisplay(assignment.yearLevel)}, {getSectionLabel(assignment.section)},{" "}
          {assignment.termLabel})
        </p>
      )}

      {!isAlreadyActive && (
        <ReviewRowControls
          skipped={skipped}
          hasSelection={selectedCandidate !== undefined}
          needsSearch={needsSearch}
          isSuggested={isSuggested}
          onClearSelection={onClearSelection}
          onOpenSearch={() => setSearchOpen(true)}
          onToggleSkip={onToggleSkip}
        />
      )}

      <RowSearchPanel
        open={searchOpen}
        skipped={skipped}
        assignmentId={assignment?.assignmentId ?? ""}
        programId={programId}
        onSelect={(candidate) => {
          onSelect(candidate);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

function ReviewPreviewBlock({
  preview,
  assignment,
  programId,
  selectedCandidateByIndex,
  skippedIndexes,
  filter,
  suggestedCount,
  suggestionsAcknowledged,
  onFilterChange,
  onSelect,
  onClearSelection,
  onToggleSkip,
  onAcknowledgeSuggestions,
}: {
  preview: CourseRosterPreview;
  assignment: CourseRosterAssignmentSummary | undefined;
  programId?: string;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  skippedIndexes: ReadonlySet<number>;
  filter: PreviewFilter;
  suggestedCount: number;
  suggestionsAcknowledged: boolean;
  onFilterChange: (filter: PreviewFilter) => void;
  onSelect: (sourceIndex: number, candidate: CourseRosterPreviewCandidate) => void;
  onClearSelection: (sourceIndex: number) => void;
  onToggleSkip: (sourceIndex: number) => void;
  onAcknowledgeSuggestions: (acknowledged: boolean) => void;
}) {
  const skipped = skippedIndexes;
  const counts = countGroups(preview.rows, skipped, selectedCandidateByIndex);
  const visibleRows = preview.rows.filter(
    (row) => filter === "all" || rowGroup(row, skipped, selectedCandidateByIndex) === filter
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Preview filters">
        {PREVIEW_FILTERS.map((item) => (
          <Button
            key={item.key}
            type="button"
            variant={filter === item.key ? "default" : "outline"}
            size="sm"
            aria-label={`${item.label}: ${counts[item.key]}`}
            aria-pressed={filter === item.key}
            onClick={() => onFilterChange(item.key)}
          >
            {item.label}
            <span className="text-label-sm ml-1">{counts[item.key]}</span>
          </Button>
        ))}
      </div>

      {suggestedCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Checkbox
            id="acknowledge-suggested"
            checked={suggestionsAcknowledged}
            onCheckedChange={(checked) => onAcknowledgeSuggestions(checked === true)}
          />
          <Label htmlFor="acknowledge-suggested" className="cursor-pointer text-body-sm leading-6">
            I acknowledge {suggestedCount} suggested {suggestedCount === 1 ? "match" : "matches"} —
            review each suggested account before confirming.
          </Label>
        </div>
      )}

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {visibleRows.length === 0 ? (
          <li className="p-4 text-center text-body-sm text-muted-foreground">
            No rows in this group.
          </li>
        ) : (
          visibleRows.map((row) => (
            <li key={row.sourceIndex}>
              <ReviewRowCard
                row={row}
                assignment={assignment}
                programId={programId}
                selectedCandidate={selectedCandidateByIndex[row.sourceIndex]}
                skipped={skipped.has(row.sourceIndex)}
                onSelect={(candidate) => onSelect(row.sourceIndex, candidate)}
                onClearSelection={() => onClearSelection(row.sourceIndex)}
                onToggleSkip={() => onToggleSkip(row.sourceIndex)}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

const OUTCOME_LABELS: Record<CourseRosterConfirmationOutcome, string> = {
  CREATED: "Added to roster",
  RESTORED: "Restored to roster",
  ALREADY_ACTIVE: "Already active",
  ACCOUNT_INACTIVE: "Account inactive",
  PROFILE_INCOMPLETE: "Profile incomplete",
  NO_ACTIVE_TERM_PLACEMENT: "No active term placement",
  PROGRAM_MISMATCH: "Program mismatch",
  OUT_OF_SCOPE: "Out of scope",
  OTHER_SECTION_CONFLICT: "Other section conflict",
  READ_ONLY: "Roster read-only",
  UNEXPECTED_FAILURE: "Unexpected failure",
  UNPROCESSED: "Not processed",
};
function outcomeLabel(outcome: CourseRosterConfirmationOutcome) {
  return OUTCOME_LABELS[outcome];
}

function outcomeBadge(outcome: CourseRosterConfirmationOutcome) {
  switch (outcome) {
    case "CREATED":
    case "RESTORED":
      return <Badge variant="success">{outcomeLabel(outcome)}</Badge>;
    case "ALREADY_ACTIVE":
    case "UNPROCESSED":
      return <Badge variant="secondary">{outcomeLabel(outcome)}</Badge>;
    case "UNEXPECTED_FAILURE":
      return <Badge variant="destructive">{outcomeLabel(outcome)}</Badge>;
    default:
      return <Badge variant="warning">{outcomeLabel(outcome)}</Badge>;
  }
}

function outcomeGroup(outcome: CourseRosterConfirmationOutcome) {
  if (outcome === "CREATED") return "created";
  if (outcome === "RESTORED") return "restored";
  if (outcome === "ALREADY_ACTIVE") return "already-active";
  if (outcome === "UNPROCESSED") return "unprocessed";
  return "blocked";
}

type ResultsGroupKey = "created" | "restored" | "already-active" | "blocked" | "skipped" | "unprocessed";

const RESULTS_GROUPS: Array<{ key: ResultsGroupKey; label: string }> = [
  { key: "created", label: "Added" },
  { key: "restored", label: "Restored" },
  { key: "already-active", label: "Already active" },
  { key: "blocked", label: "Not added" },
  { key: "skipped", label: "Skipped" },
  { key: "unprocessed", label: "Not processed" },
];

function ConfirmationResultsBlock({
  preview,
  confirmation,
  skippedIndexes,
}: {
  preview: CourseRosterPreview;
  confirmation: CourseRosterConfirmation;
  skippedIndexes: ReadonlySet<number>;
}) {
  const skipped = skippedIndexes;
  const outcomeByIndex = new Map(
    confirmation.rows.map((row) => [row.sourceIndex, row])
  );
  const counts: Record<ResultsGroupKey, number> = {
    created: 0,
    restored: 0,
    "already-active": 0,
    blocked: 0,
    skipped: skipped.size,
    unprocessed: 0,
  };
  for (const row of confirmation.rows) {
    counts[outcomeGroup(row.outcome)] += 1;
  }
  // Already-active preview rows are informational and never submitted, so
  // they carry no confirmation outcome; count them from the preview.
  for (const row of preview.rows) {
    if (row.disposition === "ALREADY_ACTIVE" && !outcomeByIndex.has(row.sourceIndex)) {
      counts["already-active"] += 1;
    }
  }

  const failedRows = confirmation.rows
    .filter((row) => row.outcome !== "CREATED" && row.outcome !== "RESTORED")
    .map((row) => {
      const previewRow = preview.rows.find((item) => item.sourceIndex === row.sourceIndex);
      return {
        sourceIndex: row.sourceIndex,
        name: previewRow?.submittedName ?? "",
        status: row.outcome,
        error: row.error ?? "",
      };
    });

  function downloadFailedRows() {
    downloadCsv("course-roster-failed-rows.csv", exportFailedCourseRosterRows(failedRows));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {confirmation.referenceId ? (
        <Alert variant="warning" aria-live="polite">
          <AlertTitle>Confirmation stopped</AlertTitle>
          <AlertDescription>
            Confirmation stopped before every row was processed. Completed rows are kept; later rows
            were not processed. Support reference: {confirmation.referenceId}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="information">
          <AlertTitle>Confirmation complete</AlertTitle>
          <AlertDescription>
            Rows below show what was added, restored, or left unchanged for this Course roster.
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {RESULTS_GROUPS.map((item) => (
          <div key={item.key} className="rounded-lg border p-3">
            <dt className="text-label-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-title-lg">{counts[item.key]}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {preview.rows.map((row) => {
          const result = outcomeByIndex.get(row.sourceIndex);
          return (
            <li key={row.sourceIndex} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-md text-muted-foreground">
                  #{row.sourceIndex}
                </span>
                <p className="min-w-0 flex-1 truncate text-body-sm font-medium">
                  {row.submittedName}
                </p>
                {skipped.has(row.sourceIndex) ? (
                  <Badge variant="secondary">Skipped</Badge>
                ) : result ? (
                  outcomeBadge(result.outcome)
                ) : row.disposition === "ALREADY_ACTIVE" ? (
                  <Badge variant="secondary">Already active</Badge>
                ) : (
                  <Badge variant="secondary">Not processed</Badge>
                )}
              </div>
              {result?.error && (
                <p className="mt-1 text-body-sm text-muted-foreground">{result.error}</p>
              )}
            </li>
          );
        })}
      </ul>

      {failedRows.length > 0 && (
        <Button type="button" variant="outline" onClick={downloadFailedRows}>
          <FileSpreadsheet data-icon="inline-start" />
          Download failed rows
        </Button>
      )}
    </div>
  );
}

function ManagementFooter({
  closeDisabled,
  isPending,
  phase,
  onBack,
  onClose,
  onPrimary,
  primaryDisabled,
  primaryLabel,
  showBack,
}: {
  closeDisabled: boolean;
  isPending: boolean;
  phase: RosterManagementPhase;
  onBack: () => void;
  onClose: () => void;
  onPrimary: () => void;
  primaryDisabled: boolean;
  primaryLabel: string;
  showBack: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={isPending}>
            Back
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose} disabled={closeDisabled}>
          Cancel
        </Button>
      </div>
      {phase !== "add" && (
        <Button type="button" onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}

function ManagementTriggerContent() {
  return (
    <>
      <FileUp data-icon="inline-start" />
      Manage roster
    </>
  );
}

function ManagementBody({
  assignment,
  assignmentId,
  file,
  importMessage,
  isPending,
  method,
  onClearFile,
  onFileSelected,
  onPreparePreview,
  onMethodChange,
  onToggleSkip,
  onClearSelection,
  onSelect,
  phase,
  preview,
  filter,
  suggestedCount,
  suggestionsAcknowledged,
  onFilterChange,
  onAcknowledgeSuggestions,
  reviewBlockers,
  programId,
  selectedCandidateByIndex,
  skippedIndexes,
  confirmation,
}: {
  assignment: CourseRosterAssignmentSummary | undefined;
  assignmentId: string;
  file: File | null;
  importMessage: string | null;
  isPending: boolean;
  method: RosterManagementMethod;
  onClearFile: () => void;
  onFileSelected: (file: File | null, message?: string) => void;
  onPreparePreview: () => void;
  onMethodChange: (method: RosterManagementMethod) => void;
  onToggleSkip: (sourceIndex: number) => void;
  onClearSelection: (sourceIndex: number) => void;
  onSelect: (sourceIndex: number, candidate: CourseRosterPreviewCandidate) => void;
  phase: RosterManagementPhase;
  preview: CourseRosterPreview | null;
  filter: PreviewFilter;
  suggestedCount: number;
  suggestionsAcknowledged: boolean;
  onFilterChange: (filter: PreviewFilter) => void;
  onAcknowledgeSuggestions: (acknowledged: boolean) => void;
  reviewBlockers: string[];
  programId?: string;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  skippedIndexes: ReadonlySet<number>;
  confirmation: CourseRosterConfirmation | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 py-1">
      <WizardStepper
        steps={[
          { key: "add", label: "Add members" },
          { key: "review", label: "Review and resolve" },
          { key: "results", label: "Results" },
        ]}
        currentStep={phase}
      />

      {phase === "add" && (
        <Tabs
          value={method}
          onValueChange={(value) => onMethodChange(value as RosterManagementMethod)}
          className="flex-col gap-3"
        >
          <TabsList
            variant="pill"
            aria-label="Roster management methods"
            className="w-full justify-start overflow-x-auto"
          >
            <TabsTrigger value="import">Import from CSV</TabsTrigger>
            <TabsTrigger value="single">Add one Student</TabsTrigger>
          </TabsList>
          <TabsContent value="import">
            <CsvImportMethod
              file={file}
              isPending={isPending}
              message={importMessage}
              onClearFile={onClearFile}
              onFileSelected={onFileSelected}
              onImport={onPreparePreview}
            />
          </TabsContent>
          <TabsContent value="single">
            <AddRosterMember assignmentId={assignmentId} programId={programId} />
          </TabsContent>
        </Tabs>
      )}

      {phase === "review" && preview && (
        <>
          {reviewBlockers.length > 0 && (
            <Alert variant="warning" aria-live="polite">
              <AlertTitle>Review not complete</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {reviewBlockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {importMessage && (
            <Alert variant="warning" aria-live="polite">
              <AlertTitle>Roster confirmation</AlertTitle>
              <AlertDescription>{importMessage}</AlertDescription>
            </Alert>
          )}
          <ReviewPreviewBlock
            preview={preview}
            assignment={assignment}
            programId={programId}
            selectedCandidateByIndex={selectedCandidateByIndex}
            skippedIndexes={skippedIndexes}
            filter={filter}
            suggestedCount={suggestedCount}
            suggestionsAcknowledged={suggestionsAcknowledged}
            onFilterChange={onFilterChange}
            onSelect={onSelect}
            onClearSelection={onClearSelection}
            onToggleSkip={onToggleSkip}
            onAcknowledgeSuggestions={onAcknowledgeSuggestions}
          />
        </>
      )}

      {phase === "results" && preview && confirmation && (
        <ConfirmationResultsBlock
          preview={preview}
          confirmation={confirmation}
          skippedIndexes={skippedIndexes}
        />
      )}
    </div>
  );
}


export function RosterManagementDialog({
  assignment,
  assignmentId,
  programId,
}: {
  assignment?: CourseRosterAssignmentSummary;
  assignmentId: string;
  programId?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<RosterManagementMethod>("import");
  const [file, setFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<RosterManagementPhase>("add");
  const [preview, setPreview] = useState<CourseRosterPreview | null>(null);
  const [selectedCandidateByIndex, setSelectedCandidateByIndex] = useState<
    Record<number, CourseRosterPreviewCandidate>
  >({});
  const [skippedIndexes, setSkippedIndexes] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<PreviewFilter>("all");
  const [suggestionsAcknowledged, setSuggestionsAcknowledged] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<CourseRosterConfirmation | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { suggestedCount, reviewBlockers } = buildReviewGuards({
    preview,
    skippedIndexes,
    selectedCandidateByIndex,
    suggestionsAcknowledged,
  });



  function resetWorkspace() {
    setMethod("import");
    setFile(null);
    setImportMessage(null);
    setPhase("add");
    setPreview(null);
    setSelectedCandidateByIndex({});
    setSkippedIndexes(new Set());
    setFilter("all");
    setSuggestionsAcknowledged(false);
    setDiscardOpen(false);
    setConfirmation(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetWorkspace();
      setOpen(true);
      return;
    }
    requestClose();
  }

  function requestClose() {
    if (pendingRef.current) return;
    // A confirmed preview is final: results stay visible until the workspace
    // closes. Only an unfinished (dirty) preview asks before discarding.
    if (preview && !confirmation) {
      setDiscardOpen(true);
      return;
    }
    closeWorkspace();
  }

  function closeWorkspace() {
    if (pendingRef.current) return;
    resetWorkspace();
    setOpen(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function handleFileSelected(nextFile: File | null, message?: string) {
    setFile(nextFile);
    setImportMessage(message ?? null);
  }

  function preparePreview() {
    if (pendingRef.current) return;
    if (!file) {
      setImportMessage("Choose a CSV file.");
      return;
    }
    setImportMessage(null);
    pendingRef.current = true;
    startTransition(async () => {
      try {
        const outcome = await runCsvPreview(file, assignmentId, programId);
        if (!outcome.ok) {
          setImportMessage(outcome.message);
          return;
        }
        setFile(null);
        setPreview(outcome.data);
        setSelectedCandidateByIndex({});
        setSkippedIndexes(new Set());
        setFilter("all");
        setSuggestionsAcknowledged(false);
        setPhase("review");
      } finally {
        pendingRef.current = false;
      }
    });
  }

  function toggleSkip(sourceIndex: number) {
    if (hasSuggestedRow(preview, sourceIndex)) setSuggestionsAcknowledged(false);
    setSkippedIndexes((current) => {
      const next = new Set(current);
      if (next.has(sourceIndex)) {
        next.delete(sourceIndex);
      } else {
        next.add(sourceIndex);
      }
      return next;
    });
  }

  function clearSelection(sourceIndex: number) {
    if (hasSuggestedRow(preview, sourceIndex)) setSuggestionsAcknowledged(false);
    setSelectedCandidateByIndex((current) => {
      const next = { ...current };
      delete next[sourceIndex];
      return next;
    });
  }

  function selectCandidate(sourceIndex: number, candidate: CourseRosterPreviewCandidate) {
    if (hasSuggestedRow(preview, sourceIndex)) setSuggestionsAcknowledged(false);
    setSelectedCandidateByIndex((current) => ({ ...current, [sourceIndex]: candidate }));
  }

  function runConfirmation() {
    if (pendingRef.current || !preview) return;
    const effectiveCandidateByIndex = effectiveCandidateByIndexFor({
      preview,
      skippedIndexes,
      selectedCandidateByIndex,
      suggestionsAcknowledged,
    });
    const rows = Object.entries(effectiveCandidateByIndex)
      .filter((entry): entry is [string, CourseRosterPreviewCandidate] => Boolean(entry[1]))
      .map(([sourceIndex, candidate]) => ({
        sourceIndex: Number(sourceIndex),
        studentUserId: candidate.userId,
      }));
    if (rows.length === 0) {
      // Every row is already active or explicitly skipped: nothing to write,
      // but the manager still sees the final Results step.
      setConfirmation({ rows: [] });
      setPhase("results");
      return;
    }
    setImportMessage(null);
    pendingRef.current = true;
    startTransition(async () => {
      try {
        const result = await confirmRosterResolutionAction({
          assignmentId,
          programId,
          rows,
          skippedIndexes: [...skippedIndexes],
          suggestedAcknowledged: suggestionsAcknowledged,
        });
        if (!result.success) {
          const reference = "referenceId" in result ? result.referenceId : undefined;
          setImportMessage(
            reference
              ? `${result.error ?? "The roster confirmation could not be completed."} Support reference: ${reference}`
              : (result.error ?? "The roster confirmation could not be completed.")
          );
          return;
        }
        setConfirmation(result.data);
        setPhase("results");
      } finally {
        pendingRef.current = false;
      }
    });
  }

  const primaryLabel =
    phase === "add"
      ? "Prepare preview"
      : phase === "review"
        ? "Review complete"
        : "Done";
  const primaryDisabled = isPending || (phase === "review" && reviewBlockers.length > 0);

  const body = (
    <div className="flex min-h-0 flex-1">
      <ManagementBody
        assignment={assignment}
        assignmentId={assignmentId}
        file={file}
        importMessage={importMessage}
        isPending={isPending}
        method={method}
        onClearFile={() => handleFileSelected(null)}
        onFileSelected={handleFileSelected}
        onPreparePreview={preparePreview}
        onMethodChange={setMethod}
        onToggleSkip={toggleSkip}
        onClearSelection={clearSelection}
        onSelect={selectCandidate}
        phase={phase}
        preview={preview}
        filter={filter}
        suggestedCount={suggestedCount}
        suggestionsAcknowledged={suggestionsAcknowledged}
        onFilterChange={setFilter}
        onAcknowledgeSuggestions={setSuggestionsAcknowledged}
        reviewBlockers={reviewBlockers}
        programId={programId}
        selectedCandidateByIndex={selectedCandidateByIndex}
        skippedIndexes={skippedIndexes}
        confirmation={confirmation}
      />
    </div>
  );

  return (
    <>
      <Button variant="outline" ref={triggerRef} onClick={() => handleOpenChange(true)}>
        <ManagementTriggerContent />
      </Button>

      {open && isDesktop && (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="flex max-h-[min(90dvh,52rem)] flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>Manage roster</DialogTitle>
              <DialogDescription>
                Prepare a preview of up to {COURSE_ROSTER_MAX_ROWS} official Student names before
                any roster change.
              </DialogDescription>
            </DialogHeader>
            {body}
            <DialogFooter className="shrink-0">
              <ManagementFooter
                closeDisabled={pendingRef.current}
                isPending={isPending}
                phase={phase}
                onBack={() => setPhase(phase === "results" ? "review" : "add")}
                onClose={requestClose}
                onPrimary={() => {
                  if (phase === "add") {
                    preparePreview();
                  } else if (phase === "review") {
                    runConfirmation();
                  } else {
                    requestClose();
                  }
                }}
                primaryDisabled={primaryDisabled}
                primaryLabel={primaryLabel}
                showBack={phase !== "results"}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {open && !isDesktop && (
        <Drawer open onOpenChange={handleOpenChange} showSwipeHandle>
          <DrawerContent className="flex max-h-[min(90dvh,48rem)] flex-col px-4 pb-4 motion-reduce:data-ending-style:transition-none motion-reduce:data-starting-style:transition-none">
            <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
              <DrawerTitle>Manage roster</DrawerTitle>
              <DrawerDescription>
                Prepare a preview of up to {COURSE_ROSTER_MAX_ROWS} official Student names before
                any roster change.
              </DrawerDescription>
            </DrawerHeader>
            {body}
            <DrawerFooter className="shrink-0 px-0 pt-3">
              <ManagementFooter
                closeDisabled={pendingRef.current}
                isPending={isPending}
                phase={phase}
                onBack={() => setPhase(phase === "results" ? "review" : "add")}
                onClose={requestClose}
                onPrimary={() => {
                  if (phase === "add") {
                    preparePreview();
                  } else if (phase === "review") {
                    runConfirmation();
                  } else {
                    requestClose();
                  }
                }}
                primaryDisabled={primaryDisabled}
                primaryLabel={primaryLabel}
                showBack={phase !== "results"}
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog
        open={discardOpen}
        onOpenChange={(next) => {
          if (!next) setDiscardOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard preview?</AlertDialogTitle>
            <AlertDialogDescription>
              This preview has not been confirmed. Closing the workspace discards uploaded names,
              matches, and choices. Refreshing the page also discards unfinished work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDiscardOpen(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setDiscardOpen(false);
                closeWorkspace();
              }}
            >
              Discard preview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddRosterMember({
  assignmentId,
  programId,
}: {
  assignmentId: string;
  programId?: string;
}) {
  const [studentUserId, setStudentUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await addRosterMembershipAction({
        assignmentId,
        programId,
        studentUserId,
      });
      setMessage(resultMessage(result));
      if (result.success) setStudentUserId("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-title-md">Add Student to roster</h2>
        <p className="text-body-sm text-muted-foreground">
          Search assignment-scoped Students by canonical name. Eligibility is checked against this
          assignment.
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="roster-student-search" className="text-label-md">
            Scoped Student search
          </label>
          <ScopedRosterStudentSearch
            assignmentId={assignmentId}
            programId={programId}
            onSelect={(candidate) => setStudentUserId(candidate.userId)}
          />
        </div>
        <Button type="submit" disabled={isPending || studentUserId === ""}>
          <UserPlus data-icon="inline-start" />
          {isPending ? "Adding..." : "Add Student"}
        </Button>
      </form>
      <MutationMessage message={message} />
    </div>
  );
}

function CsvImportMethod({
  file,
  isPending,
  message,
  onClearFile,
  onFileSelected,
  onImport,
}: {
  file: File | null;
  isPending: boolean;
  message: string | null;
  onClearFile: () => void;
  onFileSelected: (file: File | null, message?: string) => void;
  onImport: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(candidate: File | undefined | null) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      onFileSelected(null, "Choose a CSV file.");
      return;
    }
    onFileSelected(candidate);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (isPending) return;
    event.preventDefault();
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (isPending) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-md">Import Students from CSV</h2>
        <p className="text-body-sm text-muted-foreground">
          Upload official Student names to prepare a roster preview. No roster membership changes yet.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv("course-roster-template.csv", COURSE_ROSTER_TEMPLATE)}
          disabled={isPending}
        >
          <FileSpreadsheet data-icon="inline-start" />
          Download template
        </Button>
      </div>
      <label htmlFor="course-roster-csv" className="text-label-md">
        Roster CSV file
      </label>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a CSV roster file"
        aria-disabled={isPending}
        onClick={() => {
          if (!isPending) inputRef.current?.click();
        }}
        onKeyDown={onKeyDown}
        onDragOver={(event) => {
          if (!isPending) event.preventDefault();
        }}
        onDrop={onDrop}
        className="focus-visible:ring-ring flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        <FileSpreadsheet aria-hidden="true" className="shrink-0" />
        <p className="text-body-sm font-medium">Drop CSV here or click to browse</p>
        <p className="text-body-sm text-muted-foreground">
          One <code>name</code> or <code>Student Name</code> column, up to {COURSE_ROSTER_MAX_ROWS}{" "}
          rows.
        </p>
      </div>
      <input
        ref={inputRef}
        id="course-roster-csv"
        type="file"
        accept=".csv,text/csv"
        aria-label="Roster CSV file"
        className="sr-only"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />
      {file && (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <FileSpreadsheet data-icon="inline-start" />
          <span className="min-w-0 flex-1 truncate text-body-sm">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove selected file"
            onClick={onClearFile}
            disabled={isPending}
          >
            <X data-icon="inline-start" />
          </Button>
        </div>
      )}
      {message && (
        <Alert variant={message.startsWith("Choose") ? "warning" : "destructive"}>
          <AlertTitle>CSV import</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Button type="button" onClick={onImport} disabled={isPending || !file}>
        {isPending ? (
          <>
            <Progress value={null} className="h-4 w-4" aria-label="Preparing preview" />
            Preparing preview...
          </>
        ) : (
          <>
            <Upload data-icon="inline-start" />
            Prepare preview
          </>
        )}
      </Button>
    </div>
  );
}

export function RemoveRosterMember({
  assignment,
  member,
  programId,
}: {
  assignment: CourseRosterAssignmentSummary;
  member: CourseRosterMember;
  programId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const assignmentLabel = `${assignment.courseCode} - ${assignment.courseTitle} (${assignment.programCode}, ${getYearLevelDisplay(assignment.yearLevel)}, ${getSectionLabel(assignment.section)}, ${assignment.termLabel})`;

  function remove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeRosterMembershipAction({
        assignmentId: assignment.assignmentId,
        membershipId: member.membershipId,
        programId,
      });
      setMessage(resultMessage(result));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" size="sm" disabled={isPending} />}
        >
          <UserRoundMinus data-icon="inline-start" />
          Remove
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.studentName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {member.studentName} from Course assignment {assignmentLabel} roster only. This
              does not affect the Student account or term placement. This excludes the Student from
              future Course-bound evaluation eligibility for this assignment while membership is
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Student</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? "Removing..." : "Remove from roster"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MutationMessage message={message} />
    </div>
  );
}

export function RestoreRosterMember({
  assignmentId,
  member,
  programId,
}: {
  assignmentId: string;
  member: CourseRosterMember;
  programId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reason = member.eligibility.reason?.replaceAll("_", " ").toLowerCase();

  function restore() {
    setMessage(null);
    startTransition(async () => {
      const result = await restoreRosterMembershipAction({
        assignmentId,
        membershipId: member.membershipId,
        programId,
      });
      setMessage(resultMessage(result));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={restore}
        disabled={isPending || !member.eligibility.eligible}
        title={member.eligibility.eligible ? undefined : `Cannot restore: ${reason}`}
      >
        <RotateCcw data-icon="inline-start" />
        {isPending ? "Restoring..." : "Restore"}
      </Button>
      {!member.eligibility.eligible && (
        <span className="text-muted-foreground text-xs">Cannot restore: {reason}</span>
      )}
      <MutationMessage message={message} />
    </div>
  );
}
