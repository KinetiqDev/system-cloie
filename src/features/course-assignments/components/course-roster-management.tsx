"use client";

import type { DragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef, useState, useTransition } from "react";
import {
  Download,
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
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  addRosterMembershipAction,
  importCourseRosterAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
} from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterImportRowStatus,
  CourseRosterImportSummary,
  CourseRosterMember,
} from "../types";
import {
  COURSE_ROSTER_MAX_ROWS,
  COURSE_ROSTER_TEMPLATE,
  exportFailedCourseRosterRows,
  parseCourseRosterCsv,
} from "../services/course-roster-csv";
import { WizardStepper } from "./shared/wizard-stepper";

function MutationMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert aria-live="polite">
      <AlertTitle>Roster update</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function resultMessage(result: {
  success: boolean;
  error?: string;
  referenceId?: string;
  data?: { message: string };
}) {
  if (result.success) return result.data?.message ?? "Roster updated.";
  return `${result.error ?? "The roster request could not be completed."}${result.referenceId ? ` Support reference: ${result.referenceId}.` : ""}`;
}

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function runCsvImport(
  file: File,
  assignmentId: string,
  programId?: string
): Promise<{ ok: true; data: CourseRosterImportSummary } | { ok: false; message: string }> {
  try {
    const parsed = parseCourseRosterCsv(new Uint8Array(await file.arrayBuffer()));
    if (!parsed.success) return { ok: false, message: parsed.error };

    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    if (programId) formData.set("programId", programId);
    formData.set("file", file);

    const result = await importCourseRosterAction(formData);
    if (result.success) return { ok: true, data: result.data };
    return {
      ok: false,
      message: `${result.error}${result.referenceId ? ` Support reference: ${result.referenceId}.` : ""}`,
    };
  } catch {
    return { ok: false, message: "The roster request could not be completed." };
  }
}

const statusBadgeVariant: Record<
  CourseRosterImportRowStatus,
  "success" | "information" | "destructive" | "warning"
> = {
  CREATED: "success",
  RESTORED: "success",
  DUPLICATE_EMAIL: "information",
  ALREADY_ACTIVE: "information",
  MALFORMED_EMAIL: "destructive",
  UNKNOWN_ACCOUNT: "destructive",
  NON_STUDENT_ACCOUNT: "destructive",
  ACCOUNT_INACTIVE: "destructive",
  PROFILE_INCOMPLETE: "destructive",
  NO_ACTIVE_TERM_PLACEMENT: "destructive",
  PROGRAM_MISMATCH: "destructive",
  OTHER_SECTION_CONFLICT: "destructive",
  READ_ONLY: "destructive",
  UNEXPECTED_FAILURE: "destructive",
  UNPROCESSED: "warning",
};

function statusLabel(status: CourseRosterImportRowStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ImportResultsBlock({ result }: { result: CourseRosterImportSummary }) {
  const failedRows = result.rows.filter((row) => !["CREATED", "RESTORED"].includes(row.status));

  return (
    <section
      tabIndex={-1}
      aria-labelledby="course-roster-import-results"
      className="focus-visible:ring-ring flex flex-col gap-3 rounded-lg border p-4 outline-none focus-visible:ring-3"
    >
      <div aria-live="polite">
        <h3 id="course-roster-import-results" className="text-title-sm">
          Import results
        </h3>
        <p className="text-body-sm text-muted-foreground">
          {result.total} total: {result.created} created, {result.restored} restored,{" "}
          {result.failed} failed, {result.unprocessed} unprocessed.
        </p>
      </div>
      {result.referenceId && (
        <Alert variant="destructive">
          <AlertTitle>Import stopped</AlertTitle>
          <AlertDescription>
            Unexpected failure. Support reference: {result.referenceId}.
          </AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[42rem]">
          <caption className="sr-only">Course roster import row results</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row) => (
              <TableRow key={`${row.sourceIndex}-${row.email}`}>
                <TableCell className="tabular-nums">{row.sourceIndex}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell className="max-w-xl whitespace-normal">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant[row.status]}>
                      {statusLabel(row.status)}
                    </Badge>
                    {row.error && <span className="text-muted-foreground">{row.error}</span>}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {failedRows.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadCsv("course-roster-failed.csv", exportFailedCourseRosterRows(result.rows))
          }
        >
          <Download data-icon="inline-start" />
          Download failed rows
        </Button>
      )}
    </section>
  );
}

function ImportErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" aria-live="polite">
      <AlertTitle>Import not started</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
          Eligibility is checked on import for every email.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv("course-roster-template.csv", COURSE_ROSTER_TEMPLATE)}
          disabled={isPending}
        >
          <Download data-icon="inline-start" />
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
        className="focus-visible:ring-ring flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none"
      >
        <Upload aria-hidden="true" />
        <p className="text-label-md font-medium">Drop CSV here or click to browse</p>
        <p className="text-caption text-muted-foreground">
          One unquoted <code>email</code> column, up to {COURSE_ROSTER_MAX_ROWS} data rows.
        </p>
      </div>
      <input
        ref={inputRef}
        id="course-roster-csv"
        type="file"
        accept=".csv,text/csv"
        aria-label="Roster CSV file"
        className="sr-only"
        tabIndex={-1}
        disabled={isPending}
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {file && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <FileSpreadsheet aria-hidden="true" className="shrink-0" />
          <span className="text-body-sm min-w-0 flex-1 truncate font-medium">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClearFile}
            disabled={isPending}
            aria-label="Remove file"
          >
            <X />
          </Button>
        </div>
      )}
      <ImportErrorAlert message={message} />
      {isPending && (
        <Progress value={null} className="motion-reduce:transition-none">
          <ProgressLabel>Importing...</ProgressLabel>
          <ProgressValue />
        </Progress>
      )}
      {file && (
        <Button type="button" onClick={onImport} disabled={isPending}>
          <FileUp data-icon="inline-start" />
          {isPending ? "Importing..." : "Import roster"}
        </Button>
      )}
    </div>
  );
}

type RosterManagementPhase = "input" | "results";
type RosterManagementMethod = "import" | "single";

function ManagementFooter({
  closeDisabled,
  isPending,
  onBack,
  onClose,
  phase,
}: {
  closeDisabled: boolean;
  isPending: boolean;
  onBack: () => void;
  onClose: () => void;
  phase: RosterManagementPhase;
}) {
  if (phase === "results") {
    return (
      <>
        <Button type="button" variant="outline" onClick={onBack}>
          Back to methods
        </Button>
        <Button type="button" onClick={onClose} disabled={closeDisabled}>
          Done
        </Button>
      </>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
      Cancel
    </Button>
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
  assignmentId,
  file,
  importMessage,
  isPending,
  method,
  onClearFile,
  onFileSelected,
  onImport,
  onMethodChange,
  onViewResults,
  phase,
  programId,
  result,
}: {
  assignmentId: string;
  file: File | null;
  importMessage: string | null;
  isPending: boolean;
  method: RosterManagementMethod;
  onClearFile: () => void;
  onFileSelected: (file: File | null, message?: string) => void;
  onImport: () => void;
  onMethodChange: (method: RosterManagementMethod) => void;
  onViewResults: () => void;
  phase: RosterManagementPhase;
  programId?: string;
  result: CourseRosterImportSummary | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 py-1">
      <WizardStepper
        steps={[
          { key: "input", label: "Add members" },
          { key: "results", label: "Results" },
        ]}
        currentStep={phase}
      />

      {phase === "input" && (
        <Tabs
          value={method}
          onValueChange={(value) => onMethodChange(value as RosterManagementMethod)}
          className="flex-col gap-3"
        >
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="import" className="min-h-11 px-2 sm:min-h-9">
              Import from CSV
            </TabsTrigger>
            <TabsTrigger value="single" className="min-h-11 px-2 sm:min-h-9">
              Add one Student
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import">
            <CsvImportMethod
              file={file}
              isPending={isPending}
              message={importMessage}
              onClearFile={onClearFile}
              onFileSelected={onFileSelected}
              onImport={onImport}
            />
          </TabsContent>
          <TabsContent value="single">
            <AddRosterMember assignmentId={assignmentId} programId={programId} />
          </TabsContent>
        </Tabs>
      )}

      {phase === "input" && result && (
        <Alert variant="information">
          <AlertTitle>Import results ready</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Review the most recent import before closing the workspace.</span>
            <Button type="button" variant="outline" size="sm" onClick={onViewResults}>
              View results
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {phase === "results" && result && <ImportResultsBlock result={result} />}
    </div>
  );
}

export function RosterManagementDialog({
  assignmentId,
  programId,
}: {
  assignmentId: string;
  programId?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<RosterManagementMethod>("import");
  const [file, setFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<RosterManagementPhase>("input");
  const [result, setResult] = useState<CourseRosterImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function resetWorkspace() {
    setMethod("import");
    setFile(null);
    setImportMessage(null);
    setPhase("input");
    setResult(null);
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

  function importFile() {
    if (pendingRef.current) return;
    if (!file) {
      setImportMessage("Choose a CSV file.");
      return;
    }
    setImportMessage(null);
    pendingRef.current = true;
    startTransition(async () => {
      try {
        const outcome = await runCsvImport(file, assignmentId, programId);
        if (!outcome.ok) {
          setImportMessage(outcome.message);
          return;
        }
        setFile(null);
        setResult(outcome.data);
        setPhase("results");
        requestAnimationFrame(() => resultsRef.current?.focus());
      } finally {
        pendingRef.current = false;
      }
    });
  }

  const body = (
    <div
      ref={phase === "results" ? resultsRef : undefined}
      tabIndex={phase === "results" ? -1 : undefined}
      className="flex min-h-0 flex-1"
    >
      <ManagementBody
        assignmentId={assignmentId}
        file={file}
        importMessage={importMessage}
        isPending={isPending}
        method={method}
        onClearFile={() => handleFileSelected(null)}
        onFileSelected={handleFileSelected}
        onImport={importFile}
        onMethodChange={setMethod}
        onViewResults={() => setPhase("results")}
        phase={phase}
        programId={programId}
        result={result}
      />
    </div>
  );

  const trigger = (
    <Button ref={triggerRef} type="button" onClick={() => handleOpenChange(true)}>
      <ManagementTriggerContent />
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        {open && (
          <Dialog open onOpenChange={handleOpenChange}>
            <DialogContent
              showCloseButton={false}
              className="flex max-h-[min(90dvh,48rem)] flex-col overflow-hidden motion-reduce:data-closed:animate-none motion-reduce:data-open:animate-none sm:max-w-2xl"
            >
              <DialogHeader className="shrink-0">
                <DialogTitle>Manage roster</DialogTitle>
                <DialogDescription>
                  Add one Student by email or import up to {COURSE_ROSTER_MAX_ROWS} emails from a
                  CSV.
                </DialogDescription>
              </DialogHeader>
              {body}
              <DialogFooter className="shrink-0">
                <ManagementFooter
                  closeDisabled={pendingRef.current}
                  isPending={isPending}
                  onBack={() => setPhase("input")}
                  onClose={closeWorkspace}
                  phase={phase}
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      {trigger}
      {open && (
        <Drawer open onOpenChange={handleOpenChange} showSwipeHandle>
          <DrawerContent className="flex max-h-[min(90dvh,48rem)] flex-col px-4 pb-4 motion-reduce:data-ending-style:transition-none motion-reduce:data-starting-style:transition-none">
            <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
              <DrawerTitle>Manage roster</DrawerTitle>
              <DrawerDescription>
                Add one Student by email or import up to {COURSE_ROSTER_MAX_ROWS} emails from a CSV.
              </DrawerDescription>
            </DrawerHeader>
            {body}
            <DrawerFooter className="shrink-0 px-0 pt-3">
              <ManagementFooter
                closeDisabled={pendingRef.current}
                isPending={isPending}
                onBack={() => setPhase("input")}
                onClose={closeWorkspace}
                phase={phase}
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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await addRosterMembershipAction({
        assignmentId,
        programId,
        studentEmail: email,
      });
      setMessage(resultMessage(result));
      if (result.success) setEmail("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="text-title-md">Add Student to roster</h2>
        <p className="text-body-sm text-muted-foreground">
          Enter existing Student account email. Eligibility is checked against this assignment.
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="roster-student-email" className="text-label-md">
            Student email
          </label>
          <Input
            id="roster-student-email"
            name="studentEmail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <UserPlus data-icon="inline-start" />
          {isPending ? "Adding..." : "Add Student"}
        </Button>
      </form>
      <MutationMessage message={message} />
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
