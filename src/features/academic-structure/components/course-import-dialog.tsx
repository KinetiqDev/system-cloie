"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import {
  confirmCourseImportAction,
  previewCourseImportAction,
} from "@/lib/actions/course-import-actions";
import { getSemesterLabel, getTermLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import {
  COURSE_IMPORT_MODE_LABELS,
  type CourseImportConfirmation,
  type CourseImportConfirmationOutcome,
  type CourseImportMode,
  type CourseImportModeConfig,
  type CourseImportPreview,
  type CourseImportPreviewRow,
} from "../types/course-import";
import {
  COURSE_IMPORT_TEMPLATES,
  exportFailedCourseImportRows,
  parseCourseImportCsv,
} from "../services/course-import-csv";

type CourseImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CourseImportModeConfig;
};

type Step = "file" | "review" | "results";

type PreviewFilter = "all" | "ready" | "attention" | "existing";

const STEP_LABELS: Record<Step, string> = {
  file: "File",
  review: "Review",
  results: "Results",
};

const STATUS_LABELS: Record<CourseImportPreviewRow["status"], string> = {
  READY: "Ready",
  INVALID: "Needs attention",
  DUPLICATE_IN_FILE: "Duplicate in file",
  DUPLICATE_EXISTING: "Already exists",
  UNKNOWN_PROGRAM: "Unknown Program",
  INACTIVE_PROGRAM: "Inactive Program",
  UNKNOWN_MAJOR: "Unknown Major",
  INACTIVE_MAJOR: "Inactive Major",
  MAJOR_PROGRAM_MISMATCH: "Major mismatch",
  OUT_OF_SCOPE: "Outside scope",
};

const OUTCOME_LABELS: Record<CourseImportConfirmationOutcome, string> = {
  CREATED: "Created",
  INVALID: "Needs attention",
  DUPLICATE_IN_FILE: "Duplicate in file",
  DUPLICATE_EXISTING: "Already exists",
  UNKNOWN_PROGRAM: "Unknown Program",
  INACTIVE_PROGRAM: "Inactive Program",
  UNKNOWN_MAJOR: "Unknown Major",
  INACTIVE_MAJOR: "Inactive Major",
  MAJOR_PROGRAM_MISMATCH: "Major mismatch",
  OUT_OF_SCOPE: "Outside scope",
  UNEXPECTED_FAILURE: "Failed",
  UNPROCESSED: "Not processed",
};

function outcomeVariant(outcome: CourseImportConfirmationOutcome) {
  if (outcome === "CREATED") return "success" as const;
  if (
    outcome === "DUPLICATE_EXISTING" ||
    outcome === "DUPLICATE_IN_FILE" ||
    outcome === "UNPROCESSED"
  )
    return "warning" as const;
  return "destructive" as const;
}

const COURSE_TYPE_LABELS: Record<string, string> = {
  PROGRAM_WIDE: "Program-wide",
  MAJOR_SPECIFIC: "Major-specific",
};

type ColumnGuideEntry = { name: string; required: string; values: string };

const COLUMN_GUIDES: Record<CourseImportMode, ColumnGuideEntry[]> = {
  secretary: [
    { name: "Course code", required: "Required", values: 'Unique code, e.g. "IT 101".' },
    {
      name: "Course title",
      required: "Required",
      values: 'Full title, e.g. "Intro to Computing".',
    },
    {
      name: "Course scope",
      required: "Required",
      values: '"General Education" or "Program Specific".',
    },
    {
      name: "Program code",
      required: "Program-specific only",
      values: 'Active Program code, e.g. "BSIT". Leave blank for General Education.',
    },
    {
      name: "Major name",
      required: "Optional",
      values: 'Major within the Program, e.g. "Software Engineering".',
    },
    {
      name: "Year level",
      required: "Optional",
      values: '1, 2, 3, or 4 (for example "1" or "1st Year"). Leave blank to skip.',
    },
    {
      name: "Semester",
      required: "Optional",
      values: '1, 2, or 3 (for example "1st Semester" or "Summer"). Leave blank to skip.',
    },
    {
      name: "Term",
      required: "Optional",
      values: '1 or 2 (for example "1st Term"). Leave blank for Summer sessions.',
    },
  ],
  "program-head": [
    { name: "Course code", required: "Required", values: 'Unique code, e.g. "IT 101".' },
    {
      name: "Course title",
      required: "Required",
      values: 'Full title, e.g. "Intro to Computing".',
    },
    { name: "Course type", required: "Required", values: '"Program Wide" or "Major Specific".' },
    {
      name: "Major name",
      required: "Major-specific only",
      values:
        'Active Major in the selected Program, e.g. "Network Security". Leave blank for Program-wide.',
    },
    {
      name: "Year level",
      required: "Optional",
      values: '1, 2, 3, or 4 (for example "1" or "1st Year"). Leave blank to skip.',
    },
    {
      name: "Semester",
      required: "Optional",
      values: '1, 2, or 3 (for example "1st Semester" or "Summer"). Leave blank to skip.',
    },
    {
      name: "Term",
      required: "Optional",
      values: '1 or 2 (for example "1st Term"). Leave blank for Summer sessions.',
    },
  ],
  "general-education": [
    { name: "Course code", required: "Required", values: 'Unique code, e.g. "GEMATH".' },
    {
      name: "Course title",
      required: "Required",
      values: 'Full title, e.g. "Mathematics in the Modern World".',
    },
    {
      name: "Year level",
      required: "Optional",
      values: '1, 2, 3, or 4 (for example "1" or "1st Year"). Leave blank to skip.',
    },
    {
      name: "Semester",
      required: "Optional",
      values: '1, 2, or 3 (for example "1st Semester" or "Summer"). Leave blank to skip.',
    },
    {
      name: "Term",
      required: "Optional",
      values: '1 or 2 (for example "1st Term"). Leave blank for Summer sessions.',
    },
  ],
};

function ColumnGuide({ mode }: { mode: CourseImportMode }) {
  const columns = COLUMN_GUIDES[mode];
  return (
    <details open className="group border-border rounded-lg border">
      <summary className="text-label-md flex cursor-pointer items-center justify-between px-3 py-2.5 select-none">
        <span>Column guide</span>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <dl className="divide-border divide-y border-t">
        {columns.map((column) => (
          <div
            key={column.name}
            className="grid gap-0.5 px-3 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3"
          >
            <dt className="text-label-sm">
              {column.name}
              <span className="text-muted-foreground block text-xs font-normal">
                {column.required}
              </span>
            </dt>
            <dd className="text-body-sm text-muted-foreground">{column.values}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function modeOf(config: CourseImportModeConfig): CourseImportMode {
  return config.mode;
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function templateFilename(mode: CourseImportMode): string {
  return `system-cloie-course-import-${mode}.csv`;
}

function rowPayload(row: CourseImportPreviewRow) {
  return { sourceIndex: row.sourceIndex, input: row.input };
}

function statusVariant(status: CourseImportPreviewRow["status"]) {
  if (status === "READY") return "success" as const;
  if (status === "DUPLICATE_EXISTING" || status === "DUPLICATE_IN_FILE") return "warning" as const;
  return "destructive" as const;
}

function contextDescription(config: CourseImportModeConfig): string {
  if (config.mode === "program-head") {
    return `Courses will be added to ${config.selectedProgram.code}. Use Switch Program before importing another Program.`;
  }
  if (config.mode === "general-education") {
    return "These Courses will be added to the college-wide General Education catalog.";
  }
  return "Use the scope, Program, and Major columns to describe each Course.";
}

function fieldHint(config: CourseImportModeConfig): string {
  if (config.mode === "secretary") {
    return 'Set Course scope to "General Education" or "Program Specific". Program-specific rows need an active Program code; General Education rows leave Program and Major blank.';
  }
  if (config.mode === "program-head") {
    return 'Set Course type to "Program Wide" or "Major Specific". Major-specific rows need an active Major in the selected Program.';
  }
  return "Program and Major are not part of this template. Every row is added to the college-wide General Education catalog.";
}

function previewMessage(preview: CourseImportPreview): string {
  const { total, ready, attention } = preview.summary;
  return `${total} row${total === 1 ? "" : "s"} checked. ${ready} ready to create, ${attention} needing attention.`;
}

function resultMessage(result: CourseImportConfirmation): string {
  const { created, notCreated, notProcessed } = result.summary;
  const parts = [`${created} created`, `${notCreated} not created`];
  if (notProcessed > 0) parts.push(`${notProcessed} not processed`);
  return parts.join(". ") + ".";
}

function filterRows(
  rows: CourseImportPreviewRow[],
  filter: PreviewFilter
): CourseImportPreviewRow[] {
  if (filter === "ready") return rows.filter((row) => row.status === "READY");
  if (filter === "existing") return rows.filter((row) => row.status === "DUPLICATE_EXISTING");
  if (filter === "attention") return rows.filter((row) => row.status !== "READY");
  return rows;
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="border-border bg-muted/30 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className={`text-title-md tabular-nums ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function CourseImportSteps({ current }: { current: Step }) {
  const steps: Step[] = ["file", "review", "results"];
  const currentIndex = steps.indexOf(current);
  return (
    <ol aria-label="Course import progress" className="flex items-center gap-2">
      {steps.map((step, index) => (
        <li key={step} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
          <span
            aria-current={step === current ? "step" : undefined}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              index <= currentIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentIndex ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : (
              index + 1
            )}
          </span>
          <span
            className={`text-label-sm hidden sm:inline ${index <= currentIndex ? "text-foreground" : "text-muted-foreground"}`}
          >
            {STEP_LABELS[step]}
          </span>
          {index < steps.length - 1 && (
            <span className={`h-px flex-1 ${index < currentIndex ? "bg-primary" : "bg-border"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

function FileStep({
  config,
  file,
  error,
  pending,
  onFile,
  onClear,
}: {
  config: CourseImportModeConfig;
  file: File | null;
  error: string | null;
  pending: boolean;
  onFile: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      onFile(null);
      return;
    }
    onFile(candidate);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
        <p className="text-label-md text-foreground">{COURSE_IMPORT_MODE_LABELS[config.mode]}</p>
        <p className="text-body-sm text-muted-foreground mt-1">{contextDescription(config)}</p>
        <p className="text-body-sm text-muted-foreground mt-2">{fieldHint(config)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            downloadText(templateFilename(config.mode), COURSE_IMPORT_TEMPLATES[config.mode])
          }
        >
          <Download data-icon="inline-start" />
          Download template
        </Button>
        <span className="text-caption text-muted-foreground">CSV, up to 100 rows</span>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="course-import-file">Course CSV file</Label>
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a Course CSV file"
          aria-disabled={pending}
          onClick={() => !pending && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (!pending && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            if (!pending) event.preventDefault();
          }}
          onDrop={(event) => {
            if (pending) return;
            event.preventDefault();
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          className="focus-visible:ring-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center outline-none focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        >
          <Upload aria-hidden="true" className="text-muted-foreground size-6" />
          <span className="text-body-sm font-medium">Drop CSV here or choose a file</span>
          <span className="text-body-sm text-muted-foreground">
            One Course per row. See the column guide below for accepted values.
          </span>
        </div>
        <input
          ref={inputRef}
          id="course-import-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
      </div>
      <ColumnGuide mode={config.mode} />
      {error && (
        <Alert variant="destructive">
          <XCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {file && (
        <div className="border-border flex items-center gap-3 rounded-lg border p-3">
          <FileSpreadsheet aria-hidden="true" className="text-primary size-5 shrink-0" />
          <span className="text-body-sm min-w-0 flex-1 truncate">{file.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={pending}>
            Replace
          </Button>
        </div>
      )}
    </div>
  );
}

function PreviewRows({ rows }: { rows: CourseImportPreviewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">No rows match this filter.</p>
    );
  }

  return (
    <div className="divide-border max-h-[min(48dvh,34rem)] divide-y overflow-y-auto rounded-lg border">
      {/* fallow-ignore-next-line complexity */}
      {rows.map((row) => (
        <div key={row.sourceIndex} className="p-3 sm:p-4">
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              Row {row.sourceIndex}
            </span>
            <Badge variant={statusVariant(row.status)}>{STATUS_LABELS[row.status]}</Badge>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(8rem,0.35fr)_minmax(0,1fr)_minmax(8rem,0.4fr)]">
            <div className="min-w-0">
              <p className="text-label-sm text-muted-foreground">Course code</p>
              <p className="text-body-sm truncate font-semibold">
                {row.courseCode || "Not provided"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-label-sm text-muted-foreground">Course title</p>
              <p className="text-body-sm break-words">{row.courseTitle || "Not provided"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-label-sm text-muted-foreground">Scope</p>
              <p className="text-body-sm break-words">
                {row.programCode ??
                  (row.courseScope === "GENERAL_EDUCATION" ? "General Education" : "Not provided")}
                {row.majorName ? ` · ${row.majorName}` : ""}
              </p>
            </div>
          </div>
          {(row.semester || row.yearLevel || row.courseType) && (
            <p className="text-muted-foreground mt-2 text-xs">
              {[
                row.courseType ? (COURSE_TYPE_LABELS[row.courseType] ?? row.courseType) : null,
                row.yearLevel ? getYearLevelDisplay(row.yearLevel) : null,
                row.semester ? getSemesterLabel(row.semester) : null,
                row.term ? getTermLabel(row.term) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {row.error && <p className="text-danger mt-2 text-sm">{row.error}</p>}
        </div>
      ))}
    </div>
  );
}

function ResultsRows({ result }: { result: CourseImportConfirmation }) {
  return (
    <div className="divide-border max-h-[min(52dvh,38rem)] divide-y overflow-y-auto rounded-lg border">
      {result.rows.map((row) => {
        const successful = row.outcome === "CREATED";
        return (
          <div key={row.sourceIndex} className="flex items-start gap-3 p-3 sm:p-4">
            {successful ? (
              <CheckCircle2 aria-hidden="true" className="text-success mt-0.5 size-5 shrink-0" />
            ) : (
              <XCircle aria-hidden="true" className="text-danger mt-0.5 size-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-md">{row.courseCode || "Unnamed Course"}</span>
                <Badge variant={outcomeVariant(row.outcome)}>
                  {OUTCOME_LABELS[row.outcome] ?? row.outcome}
                </Badge>
                <span className="text-muted-foreground text-xs">Row {row.sourceIndex}</span>
              </div>
              <p className="text-body-sm text-muted-foreground mt-1 break-words">
                {row.courseTitle}
              </p>
              {row.error && <p className="text-danger mt-1 text-sm">{row.error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// fallow-ignore-next-line complexity
export function CourseImportDialog({ open, onOpenChange, config }: CourseImportDialogProps) {
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CourseImportPreview | null>(null);
  const [result, setResult] = useState<CourseImportConfirmation | null>(null);
  const [filter, setFilter] = useState<PreviewFilter>("all");
  const [isPending, startTransition] = useTransition();

  const mode = modeOf(config);
  const visibleRows = useMemo(
    () => (preview ? filterRows(preview.rows, filter) : []),
    [filter, preview]
  );

  function reset() {
    setStep("file");
    setFile(null);
    setFileError(null);
    setPreview(null);
    setResult(null);
    setFilter("all");
  }

  function close(openState: boolean) {
    if (!openState) reset();
    onOpenChange(openState);
  }

  function selectFile(candidate: File | null) {
    setFile(candidate);
    setFileError(candidate ? null : "Choose a CSV file.");
    setPreview(null);
  }

  function previewFile() {
    if (!file) {
      setFileError("Choose a CSV file before continuing.");
      return;
    }

    startTransition(async () => {
      const parsed = parseCourseImportCsv(new Uint8Array(await file.arrayBuffer()), mode);
      if (!parsed.success) {
        setFileError(parsed.error);
        return;
      }

      const response = await previewCourseImportAction({
        mode,
        selectedProgramId: config.mode === "program-head" ? config.selectedProgram.id : undefined,
        rows: parsed.rows.map((row) => ({
          sourceIndex: row.sourceIndex,
          input: Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== "sourceIndex")
          ) as Record<string, string>,
        })),
      });
      if (!response.success) {
        setFileError(response.error);
        return;
      }
      setPreview(response.data);
      setStep("review");
      setFilter("all");
    });
  }

  function confirm() {
    if (!preview || preview.summary.ready === 0) return;

    startTransition(async () => {
      const response = await confirmCourseImportAction({
        mode,
        selectedProgramId: config.mode === "program-head" ? config.selectedProgram.id : undefined,
        rows: preview.rows.map(rowPayload),
      });
      if (!response.success) {
        showToast(response.error, "error");
        return;
      }
      setResult(response.data);
      setStep("results");
      showToast(
        resultMessage(response.data),
        response.data.summary.notCreated > 0 ? "warning" : "success"
      );
    });
  }

  function downloadFailures() {
    if (!result) return;
    const rows = result.rows
      .filter((row) => row.outcome !== "CREATED")
      .map((row) => ({
        sourceIndex: row.sourceIndex,
        input: row.input,
        status: row.outcome,
        error: row.error,
      }));
    downloadText("system-cloie-course-import-rows-to-fix.csv", exportFailedCourseImportRows(rows));
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="border-border shrink-0 border-b px-4 py-4 sm:px-6">
          <CourseImportSteps current={step} />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>Import Courses</DialogTitle>
              <DialogDescription className="mt-1">
                {COURSE_IMPORT_MODE_LABELS[mode]}
              </DialogDescription>
            </div>
            <DialogClose render={<Button size="icon" variant="ghost" />}>
              <X />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === "file" && (
            <FileStep
              config={config}
              file={file}
              error={fileError}
              pending={isPending}
              onFile={selectFile}
              onClear={() => selectFile(null)}
            />
          )}
          {step === "review" && preview && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-title-md">Review Courses</h2>
                <p className="text-body-sm text-muted-foreground">{previewMessage(preview)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryMetric label="Total rows" value={preview.summary.total} />
                <SummaryMetric label="Ready" value={preview.summary.ready} tone="text-success" />
                <SummaryMetric
                  label="Needs attention"
                  value={preview.summary.attention}
                  tone="text-danger"
                />
                <SummaryMetric
                  label="Existing"
                  value={preview.rows.filter((row) => row.status === "DUPLICATE_EXISTING").length}
                  tone="text-warning"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm text-muted-foreground">{file?.name}</p>
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter((value ?? "all") as PreviewFilter)}
                >
                  <SelectTrigger aria-label="Filter import rows" className="w-full sm:w-48">
                    <SelectValue>
                      {filter === "all"
                        ? "All rows"
                        : filter === "ready"
                          ? "Ready"
                          : filter === "existing"
                            ? "Already exists"
                            : "Needs attention"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rows</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="attention">Needs attention</SelectItem>
                    <SelectItem value="existing">Already exists</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PreviewRows rows={visibleRows} />
            </div>
          )}
          {step === "results" && result && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-title-md">Import results</h2>
                <p className="text-body-sm text-muted-foreground mt-1">{resultMessage(result)}</p>
              </div>
              <Progress
                value={
                  result.summary.total ? (result.summary.created / result.summary.total) * 100 : 0
                }
                aria-label="Courses created"
              >
                <span className="sr-only">
                  {result.summary.created} of {result.summary.total} Courses created
                </span>
              </Progress>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SummaryMetric label="Created" value={result.summary.created} tone="text-success" />
                <SummaryMetric
                  label="Not created"
                  value={result.summary.notCreated}
                  tone="text-danger"
                />
                <SummaryMetric label="Not processed" value={result.summary.notProcessed} />
              </div>
              <ResultsRows result={result} />
            </div>
          )}
        </div>
        <DialogFooter className="border-border bg-background mx-0 mb-0 shrink-0 flex-col border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:px-6">
          {step === "file" && (
            <Button
              type="button"
              onClick={previewFile}
              disabled={!file || isPending}
              loading={isPending}
              className="w-full sm:w-auto"
            >
              Check file
            </Button>
          )}
          {step === "review" && preview && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("file")}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={confirm}
                disabled={preview.summary.ready === 0 || isPending}
                loading={isPending}
                className="w-full sm:w-auto"
              >
                Create {preview.summary.ready} Course{preview.summary.ready === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {step === "results" && result && (
            <>
              {result.summary.notCreated > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadFailures}
                  className="w-full sm:w-auto"
                >
                  <Download data-icon="inline-start" />
                  Download rows to fix
                </Button>
              )}
              <Button type="button" variant="outline" onClick={reset} className="w-full sm:w-auto">
                Import another file
              </Button>
              <Button type="button" onClick={() => close(false)} className="w-full sm:w-auto">
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
