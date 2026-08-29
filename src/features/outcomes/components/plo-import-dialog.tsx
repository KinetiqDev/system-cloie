"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  confirmPLOImportAction,
  previewPLOImportAction,
} from "@/lib/actions/program-head-outcome-actions";
import { buildProgramHeadOutcomeMappingPath } from "@/lib/constants/program-head-routes";
import {
  exportFailedPLOImportRows,
  parsePLOImportCsv,
  PLO_IMPORT_TEMPLATE,
} from "../services/plo-import-csv";
import type { PLOImportPreview, PLOImportPreviewRow, PLOImportResult } from "../types/plo-import";

type Step = "file" | "review" | "results";
type Program = { id: string; code: string; name: string };

type Props = { open: boolean; onOpenChange: (open: boolean) => void; program: Program };

const STATUS_LABEL: Record<PLOImportPreviewRow["status"], string> = {
  READY: "Ready",
  INVALID: "Needs attention",
  DUPLICATE_IN_FILE: "Repeated in file",
  DUPLICATE_EXISTING_ACTIVE: "Already exists",
  DUPLICATE_EXISTING_ARCHIVED: "Already exists, archived",
};

const MAX_CSV_BYTES = 1024 * 1024;
const STEP_NUMBER: Record<Step, number> = { file: 1, review: 2, results: 3 };

function fileRejection(candidate: File): string | null {
  if (candidate.size > MAX_CSV_BYTES) return "Choose a CSV file no larger than 1 MB.";
  if (!candidate.name.toLowerCase().endsWith(".csv")) return "Choose a file ending in .csv.";
  return null;
}

function rowPresentation(row: PLOImportPreviewRow & { outcome?: string }, results: boolean) {
  const status = results ? (row.outcome ?? row.status) : row.status;
  const successful = status === "READY" || status === "CREATED";
  return {
    successful,
    label: status === "CREATED" ? "Created" : STATUS_LABEL[row.status],
  };
}

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Summary({ values }: { values: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {values.map((item) => (
        <div key={item.label} className="border-border bg-muted/30 rounded-lg border p-3">
          <p className="text-caption text-muted-foreground">{item.label}</p>
          <p className="text-title-md tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function RowList({
  rows,
  results = false,
}: {
  rows: Array<PLOImportPreviewRow & { outcome?: string }>;
  results?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2"
      aria-label={results ? "PLO import results" : "PLO import preview"}
    >
      {rows.map((row) => {
        const { successful, label } = rowPresentation(row, results);
        return (
          <article
            key={row.sourceIndex}
            className="border-border bg-card flex min-w-0 gap-3 rounded-lg border p-3"
          >
            {successful ? (
              <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="text-danger mt-0.5 size-5 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-md">Row {row.sourceIndex}</span>
                <Badge variant={successful ? "success" : "outline"}>{label}</Badge>
              </div>
              <p className="text-body-sm mt-1 font-semibold break-words">
                {row.ploCode || "PLO code not provided"}
              </p>
              <p className="text-body-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                {row.description || "Description not provided"}
              </p>
              {row.error && <p className="text-body-sm text-danger mt-2">{row.error}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FileStep({
  program,
  file,
  onSelect,
}: {
  program: Program;
  file: File | null;
  onSelect: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Alert>
        <FileSpreadsheet aria-hidden="true" />
        <AlertDescription>
          <strong>
            {program.code} · {program.name}
          </strong>
          <br />
          This import adds new active PLOs. It never changes or restores existing PLOs.
        </AlertDescription>
      </Alert>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadCsv(
              `system-cloie-${program.code.toLowerCase()}-plo-import.csv`,
              PLO_IMPORT_TEMPLATE
            )
          }
        >
          <Download data-icon="inline-start" />
          Download template
        </Button>
        <span className="text-body-sm text-muted-foreground">CSV, up to 20 PLOs and 1 MB</span>
      </div>
      <div className="border-border rounded-lg border">
        <h2 className="text-label-md border-border border-b px-3 py-2">Column guide</h2>
        <dl className="divide-border divide-y">
          <div className="grid gap-1 px-3 py-2 sm:grid-cols-[9rem_1fr]">
            <dt className="text-label-sm">PLO Code</dt>
            <dd className="text-body-sm text-muted-foreground">
              Required, up to 20 characters. Example: PLO-1. Codes become uppercase.
            </dd>
          </div>
          <div className="grid gap-1 px-3 py-2 sm:grid-cols-[9rem_1fr]">
            <dt className="text-label-sm">Description</dt>
            <dd className="text-body-sm text-muted-foreground">Required, 3 to 1,000 characters.</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="plo-import-file">PLO CSV file</Label>
        <button
          type="button"
          className="border-border focus-visible:ring-ring flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onSelect(event.dataTransfer.files?.[0] ?? null);
          }}
        >
          <Upload className="text-primary size-6" aria-hidden="true" />
          <span className="text-label-md">Drop a CSV here or choose a file</span>
          {file && (
            <span className="text-body-sm text-muted-foreground break-all">{file.name}</span>
          )}
        </button>
        <input
          ref={inputRef}
          id="plo-import-file"
          aria-label="PLO CSV file"
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
        />
      </div>
    </>
  );
}

function ReviewStep({ preview }: { preview: PLOImportPreview }) {
  return (
    <>
      <div>
        <h2 className="text-title-md">Review PLOs</h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          Check every row before creating anything.
        </p>
      </div>
      <Summary
        values={[
          { label: "Total rows", value: preview.summary.total },
          { label: "Ready", value: preview.summary.ready },
          { label: "Needs attention", value: preview.summary.attention },
          { label: "Already exists", value: preview.summary.existing },
        ]}
      />
      <Alert variant="warning">
        <AlertTriangle aria-hidden="true" />
        <AlertDescription>
          New active PLOs may show incomplete CILO mappings and block new Course-bound evaluation
          publication until Faculty members classify the mappings.
        </AlertDescription>
      </Alert>
      <RowList rows={preview.rows} />
    </>
  );
}

function ResultsStep({ result }: { result: PLOImportResult }) {
  return (
    <>
      <div>
        <h2 className="text-title-md">Import results</h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          {result.summary.created} created. {result.summary.notCreated} not created.
        </p>
      </div>
      <Progress
        value={result.summary.total ? (result.summary.created / result.summary.total) * 100 : 0}
        aria-label="PLOs created"
      />
      <Summary
        values={[
          { label: "Created", value: result.summary.created },
          { label: "Not created", value: result.summary.notCreated },
        ]}
      />
      <RowList rows={result.rows} results />
    </>
  );
}

export function PLOImportDialog({ open, onOpenChange, program }: Props) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PLOImportPreview | null>(null);
  const [result, setResult] = useState<PLOImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("file");
    setFile(null);
    setError(null);
    setPreview(null);
    setResult(null);
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function selectFile(candidate: File | null) {
    setPreview(null);
    setError(null);
    const rejection = candidate ? fileRejection(candidate) : null;
    if (rejection) {
      setFile(null);
      setError(rejection);
      return;
    }
    setFile(candidate);
  }

  function checkFile() {
    if (!file) return setError("Choose a CSV file before continuing.");
    startTransition(async () => {
      const parsed = parsePLOImportCsv(new Uint8Array(await file.arrayBuffer()));
      if (!parsed.success) return setError(parsed.error);
      const response = await previewPLOImportAction({ programId: program.id, rows: parsed.rows });
      if (!response.success) return setError(response.error);
      setPreview(response.data);
      setStep("review");
    });
  }

  function confirm() {
    if (!preview?.summary.ready) return;
    startTransition(async () => {
      const response = await confirmPLOImportAction({
        programId: program.id,
        rows: preview.rows.map((row) => ({ sourceIndex: row.sourceIndex, input: row.input })),
      });
      if (!response.success) {
        setError(response.error);
        showToast(response.error, "error");
        return;
      }
      setResult(response.data);
      setStep("results");
      showToast(
        `${response.data.summary.created} PLO${response.data.summary.created === 1 ? "" : "s"} created.`,
        response.data.summary.notCreated ? "warning" : "success"
      );
      router.refresh();
    });
  }

  const content = (
    <div className="flex flex-col gap-5">
      {step === "file" && <FileStep program={program} file={file} onSelect={selectFile} />}
      {step === "review" && preview && <ReviewStep preview={preview} />}
      {step === "results" && result && <ResultsStep result={result} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const footer = (
    <DialogActions
      step={step}
      pending={pending}
      file={file}
      preview={preview}
      result={result}
      onCheckFile={checkFile}
      onBack={() => {
        setStep("file");
        setError(null);
      }}
      onConfirm={confirm}
      onReset={reset}
      onDone={() => changeOpen(false)}
      onReviewMappings={() => {
        changeOpen(false);
        router.push(buildProgramHeadOutcomeMappingPath(program.id));
      }}
    />
  );

  if (!isDesktop)
    return (
      <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
        <DrawerContent className="flex max-h-[92dvh] min-w-0 flex-col overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle>Import Program Learning Outcomes</DrawerTitle>
                <DrawerDescription>
                  {program.code} · {program.name}. Step {STEP_NUMBER[step]} of 3.
                </DrawerDescription>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close import"
                onClick={() => changeOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">{content}</div>
          <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Program Learning Outcomes</DialogTitle>
          <DialogDescription>
            {program.code} · {program.name}. Step {STEP_NUMBER[step]} of 3.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{content}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileActions({
  pending,
  file,
  onCheckFile,
}: {
  pending: boolean;
  file: File | null;
  onCheckFile: () => void;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button onClick={onCheckFile} disabled={!file || pending} loading={pending}>
        Check file
      </Button>
    </div>
  );
}

function ReviewActions({
  pending,
  preview,
  onBack,
  onConfirm,
}: {
  pending: boolean;
  preview: PLOImportPreview;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={onBack} disabled={pending}>
        Back
      </Button>
      <Button onClick={onConfirm} disabled={!preview.summary.ready || pending} loading={pending}>
        Create {preview.summary.ready} PLO{preview.summary.ready === 1 ? "" : "s"}
      </Button>
    </div>
  );
}

function ResultsActions({
  result,
  onReset,
  onDone,
  onReviewMappings,
}: {
  result: PLOImportResult;
  onReset: () => void;
  onDone: () => void;
  onReviewMappings: () => void;
}) {
  const rowsToFix = result.rows.filter((row) => row.outcome !== "CREATED");
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {rowsToFix.length > 0 && (
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              "system-cloie-plo-import-rows-to-fix.csv",
              exportFailedPLOImportRows(
                rowsToFix.map((row) => ({
                  ploCode: row.ploCode,
                  description: row.description,
                  error: row.error ?? "Not created.",
                }))
              )
            )
          }
        >
          <Download data-icon="inline-start" />
          Download rows to fix
        </Button>
      )}
      {result.summary.created > 0 && (
        <Button variant="outline" onClick={onReviewMappings}>
          Review CILO mappings
        </Button>
      )}
      <Button variant="outline" onClick={onReset}>
        Import another file
      </Button>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
}

function DialogActions({
  step,
  pending,
  file,
  preview,
  result,
  onCheckFile,
  onBack,
  onConfirm,
  onReset,
  onDone,
  onReviewMappings,
}: {
  step: Step;
  pending: boolean;
  file: File | null;
  preview: PLOImportPreview | null;
  result: PLOImportResult | null;
  onCheckFile: () => void;
  onBack: () => void;
  onConfirm: () => void;
  onReset: () => void;
  onDone: () => void;
  onReviewMappings: () => void;
}) {
  if (step === "file")
    return <FileActions pending={pending} file={file} onCheckFile={onCheckFile} />;
  if (step === "review" && preview)
    return (
      <ReviewActions pending={pending} preview={preview} onBack={onBack} onConfirm={onConfirm} />
    );
  if (step !== "results" || !result) return null;
  return (
    <ResultsActions
      result={result}
      onReset={onReset}
      onDone={onDone}
      onReviewMappings={onReviewMappings}
    />
  );
}
