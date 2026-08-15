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
} from "../types";
import {
  COURSE_ROSTER_MAX_ROWS,
  COURSE_ROSTER_TEMPLATE,
  parseCourseRosterCsv,
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

function rowGroup(
  row: CourseRosterPreviewRow,
  skippedIndexes: ReadonlySet<number>
): PreviewFilter {
  if (skippedIndexes.has(row.sourceIndex)) return "skipped";
  switch (row.disposition) {
    case "ALREADY_ACTIVE":
      return "already-active";
    case "READY_CREATE":
    case "WILL_RESTORE":
      return "ready";
    case "INELIGIBLE":
    case "OTHER_SECTION_CONFLICT":
      return "resolve";
    case null:
      break;
  }
  if (row.resolution.status === "SUGGESTED_MATCH") return "review";
  return "resolve";
}

function countRows(
  rows: CourseRosterPreviewRow[],
  skippedIndexes: ReadonlySet<number>,
  group: PreviewFilter
) {
  return rows.filter((row) => rowGroup(row, skippedIndexes) === group).length;
}

function countGroups(rows: CourseRosterPreviewRow[], skippedIndexes: ReadonlySet<number>) {
  return {
    all: rows.length,
    ready: countRows(rows, skippedIndexes, "ready"),
    review: countRows(rows, skippedIndexes, "review"),
    resolve: countRows(rows, skippedIndexes, "resolve"),
    skipped: skippedIndexes.size,
    "already-active": countRows(rows, skippedIndexes, "already-active"),
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
        {selectedCandidate ? (
          <Badge variant="success">Selected</Badge>
        ) : (
          resolutionBadge(row.resolution)
        )}
        {skipped ? <Badge variant="secondary">Skipped</Badge> : dispositionBadge(row.disposition)}
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
  onFilterChange,
  onSelect,
  onClearSelection,
  onToggleSkip,
}: {
  preview: CourseRosterPreview;
  assignment: CourseRosterAssignmentSummary | undefined;
  programId?: string;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  skippedIndexes: ReadonlySet<number>;
  filter: PreviewFilter;
  onFilterChange: (filter: PreviewFilter) => void;
  onSelect: (sourceIndex: number, candidate: CourseRosterPreviewCandidate) => void;
  onClearSelection: (sourceIndex: number) => void;
  onToggleSkip: (sourceIndex: number) => void;
}) {
  const skipped = skippedIndexes;
  const counts = countGroups(preview.rows, skipped);

  const visibleRows = preview.rows.filter(
    (row) => filter === "all" || rowGroup(row, skipped) === filter
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

function PreviewResultsBlock({
  preview,
  selectedCandidateByIndex,
  skippedIndexes,
  onBackToReview,
}: {
  preview: CourseRosterPreview;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  skippedIndexes: ReadonlySet<number>;
  onBackToReview: () => void;
}) {
  const skipped = skippedIndexes;
  const counts = countGroups(preview.rows, skipped);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Alert variant="information">
        <AlertTitle>Review complete</AlertTitle>
        <AlertDescription>
          The preview session is ready. Rows are grouped below; nothing has been written yet.
        </AlertDescription>
      </Alert>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PREVIEW_FILTERS.filter((item) => item.key !== "all").map((item) => (
          <div key={item.key} className="rounded-lg border p-3">
            <dt className="text-label-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-title-lg">{counts[item.key]}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {preview.rows.map((row) => {
          const selectedCandidate = selectedCandidateByIndex[row.sourceIndex] ?? row.candidates[0];
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
                ) : (
                  <>
                    {resolutionBadge(row.resolution)}
                    {dispositionBadge(row.disposition)}
                  </>
                )}
              </div>
              {selectedCandidate && <CandidateContext candidate={selectedCandidate} />}
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" onClick={onBackToReview}>
        <RotateCcw data-icon="inline-start" />
        Back to review
      </Button>
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
  primaryLabel,
}: {
  closeDisabled: boolean;
  isPending: boolean;
  phase: RosterManagementPhase;
  onBack: () => void;
  onClose: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {phase !== "add" && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={isPending}>
            Back
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose} disabled={closeDisabled}>
          Cancel
        </Button>
      </div>
      {phase !== "add" && (
        <Button type="button" onClick={onPrimary} disabled={isPending}>
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
  onFilterChange,
  programId,
  selectedCandidateByIndex,
  skippedIndexes,
  onBackToReview,
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
  onBackToReview: () => void;
  phase: RosterManagementPhase;
  preview: CourseRosterPreview | null;
  filter: PreviewFilter;
  onFilterChange: (filter: PreviewFilter) => void;
  programId?: string;
  selectedCandidateByIndex: Record<number, CourseRosterPreviewCandidate>;
  skippedIndexes: ReadonlySet<number>;
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
        <ReviewPreviewBlock
          preview={preview}
          assignment={assignment}
          programId={programId}
          selectedCandidateByIndex={selectedCandidateByIndex}
          skippedIndexes={skippedIndexes}
          filter={filter}
          onFilterChange={onFilterChange}
          onSelect={onSelect}
          onClearSelection={onClearSelection}
          onToggleSkip={onToggleSkip}
        />
      )}

      {phase === "results" && preview && (
        <PreviewResultsBlock
          preview={preview}
          selectedCandidateByIndex={selectedCandidateByIndex}
          skippedIndexes={skippedIndexes}
          onBackToReview={onBackToReview}
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
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);


  function resetWorkspace() {
    setMethod("import");
    setFile(null);
    setImportMessage(null);
    setPhase("add");
    setPreview(null);
    setSelectedCandidateByIndex({});
    setSkippedIndexes(new Set());
    setFilter("all");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetWorkspace();
      setOpen(true);
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
        setPhase("review");
      } finally {
        pendingRef.current = false;
      }
    });
  }

  function toggleSkip(sourceIndex: number) {
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
    setSelectedCandidateByIndex((current) => {
      const next = { ...current };
      delete next[sourceIndex];
      return next;
    });
  }

  function selectCandidate(sourceIndex: number, candidate: CourseRosterPreviewCandidate) {
    setSelectedCandidateByIndex((current) => ({ ...current, [sourceIndex]: candidate }));
  }

  const primaryLabel =
    phase === "add"
      ? "Prepare preview"
      : phase === "review"
        ? "Review complete"
        : "Done";

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
        onFilterChange={setFilter}
        programId={programId}
        selectedCandidateByIndex={selectedCandidateByIndex}
        skippedIndexes={skippedIndexes}
        onBackToReview={() => setPhase("review")}
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
                onClose={closeWorkspace}
                onPrimary={() => {
                  if (phase === "add") {
                    preparePreview();
                  } else if (phase === "review") {
                    setPhase("results");
                  } else {
                    closeWorkspace();
                  }
                }}
                primaryLabel={primaryLabel}
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
                onClose={closeWorkspace}
                onPrimary={() => {
                  if (phase === "add") {
                    preparePreview();
                  } else if (phase === "review") {
                    setPhase("results");
                  } else {
                    closeWorkspace();
                  }
                }}
                primaryLabel={primaryLabel}
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
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
