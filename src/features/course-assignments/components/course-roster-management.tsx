"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { Download, FileUp, RotateCcw, UserPlus, UserRoundMinus } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import {
  addRosterMembershipAction,
  importCourseRosterAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
} from "@/lib/actions/course-roster-actions";
import type { CourseRosterAssignmentSummary, CourseRosterMember } from "../types";
import {
  COURSE_ROSTER_TEMPLATE,
  exportFailedCourseRosterRows,
  parseCourseRosterCsv,
} from "../services/course-roster-csv";
import type { CourseRosterImportSummary } from "../types";

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

function ImportSummary({ result }: { result: CourseRosterImportSummary }) {
  const failedRows = result.rows.filter((row) => !["CREATED", "RESTORED"].includes(row.status));
  return (
    <section
      tabIndex={-1}
      aria-labelledby="course-roster-import-results"
      className="flex flex-col gap-3 rounded-lg border p-4 outline-none focus-visible:ring-3"
    >
      <div aria-live="polite">
        <h3 id="course-roster-import-results" className="font-medium">
          Import results
        </h3>
        <p className="text-muted-foreground text-sm">
          {result.created} created, {result.restored} restored, {result.failed} failed, {result.unprocessed} unprocessed.
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
        <table className="w-full min-w-[42rem] text-left text-sm">
          <caption className="sr-only">Course roster import row results</caption>
          <thead className="bg-muted/40 border-b">
            <tr>
              <th scope="col" className="px-3 py-2">Row</th>
              <th scope="col" className="px-3 py-2">Email</th>
              <th scope="col" className="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.rows.map((row) => (
              <tr key={`${row.sourceIndex}-${row.email}`}>
                <td className="px-3 py-2 tabular-nums">{row.sourceIndex}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{row.status}</span>
                  {row.error && <span className="text-muted-foreground ml-2">{row.error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failedRows.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv("course-roster-failed.csv", exportFailedCourseRosterRows(result.rows))}
        >
          <Download data-icon="inline-start" />
          Download failed rows
        </Button>
      )}
    </section>
  );
}

export function ImportRosterCsv({ assignmentId, programId }: { assignmentId: string; programId?: string }) {
  const [result, setResult] = useState<CourseRosterImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);

  function downloadTemplate() {
    downloadCsv("course-roster-template.csv", COURSE_ROSTER_TEMPLATE);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = event.currentTarget.elements.namedItem("file");
    if (!(file instanceof HTMLInputElement) || !file.files?.[0]) {
      setMessage("Choose a CSV file.");
      return;
    }
    const parsed = parseCourseRosterCsv(new Uint8Array(await file.files[0].arrayBuffer()));
    if (!parsed.success) {
      setMessage(parsed.error);
      return;
    }
    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    if (programId) formData.set("programId", programId);
    formData.set("file", file.files[0]);
    setMessage(null);
    setResult(null);
    startTransition(async () => {
      const nextResult = await importCourseRosterAction(formData);
      if (nextResult.success) {
        setResult(nextResult.data);
        requestAnimationFrame(() => resultsRef.current?.focus());
      } else {
        setMessage(`${nextResult.error}${nextResult.referenceId ? ` Support reference: ${nextResult.referenceId}.` : ""}`);
      }
    });
  }

  function validateFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && !file.name.toLowerCase().endsWith(".csv")) {
      setMessage("Choose a CSV file.");
      event.target.value = "";
    } else {
      setMessage(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Import Students from CSV</h2>
        <p className="text-muted-foreground text-sm">One unquoted email column. Maximum 500 data rows.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={downloadTemplate} disabled={isPending}>
          <Download data-icon="inline-start" />
          Download template
        </Button>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="course-roster-csv" className="text-sm font-medium">Roster CSV file</label>
          <Input id="course-roster-csv" name="file" type="file" accept=".csv,text/csv" required disabled={isPending} onChange={validateFile} />
        </div>
        <Button type="submit" disabled={isPending}>
          <FileUp data-icon="inline-start" />
          {isPending ? "Importing..." : "Import roster"}
        </Button>
      </form>
      {message && <Alert variant="destructive" aria-live="polite"><AlertTitle>Import not started</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
      {result && <div ref={resultsRef} tabIndex={-1} className="outline-none focus-visible:ring-3"><ImportSummary result={result} /></div>}
    </div>
  );
}

export function AddRosterMember({ assignmentId, programId }: { assignmentId: string; programId?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await addRosterMembershipAction({ assignmentId, programId, studentEmail: email });
      setMessage(resultMessage(result));
      if (result.success) setEmail("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Add Student to roster</h2>
        <p className="text-muted-foreground text-sm">
          Enter existing Student account email. Eligibility is checked against this assignment.
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="roster-student-email" className="text-sm font-medium">
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
              Remove {member.studentName} from Course assignment {assignmentLabel} roster only.
              This does not affect the Student account or term placement. This excludes the Student from future
              Course-bound evaluation eligibility for this assignment while membership is removed.
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
