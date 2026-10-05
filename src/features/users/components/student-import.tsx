"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { BackLink } from "@/components/ui/back-link";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { studentImportAction } from "@/lib/actions/student-import-actions";
import {
  exportStudentImportRows,
  STUDENT_IMPORT_MAX_BYTES,
  STUDENT_IMPORT_TEMPLATE,
  type StudentImportCatalog,
  type StudentImportRow,
} from "../services/student-import-csv";

const IMPORT_STEPS = [
  { key: "prepare", label: "Prepare" },
  { key: "review", label: "Review" },
  { key: "confirm", label: "Confirm" },
  { key: "results", label: "Results" },
];

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StudentImport({ programs }: { programs: StudentImportCatalog }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [token, setToken] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [termLabel, setTermLabel] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const ready = rows.filter((r) => r.status === "Ready").length;
  const skipped = rows.filter((r) => r.status === "Skipped").length;
  const invalid = rows.some((r) => r.status === "Needs correction");
  const failed = rows.filter((r) => r.status === "Failed");
  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function clearFile() {
    setFile(null);
    setRows([]);
    setToken("");
    setError("");
    setFieldError(false);
    if (input.current) input.current.value = "";
  }
  function acceptFile(selected: File | null) {
    setRows([]);
    setToken("");
    setError("");
    setFieldError(false);
    if (
      selected &&
      (!selected.name.toLowerCase().endsWith(".csv") || selected.size > STUDENT_IMPORT_MAX_BYTES)
    ) {
      setFile(null);
      if (input.current) input.current.value = "";
      setFieldError(true);
      setError("Choose a .csv file no larger than 256 KiB.");
      return;
    }
    setFile(selected);
  }
  function reset() {
    setRows([]);
    setToken("");
    setError("");
    setFieldError(false);
    setFile(null);
    setTermLabel(null);
    if (input.current) input.current.value = "";
    move(1);
  }
  function submit(commit: boolean) {
    if (!file) return;
    startTransition(async () => {
      setError("");
      try {
        const form = new FormData();
        form.set("file", file);
        if (commit) form.set("token", token);
        const result = await studentImportAction(form);
        if (!result.success) {
          setError(result.error);
          setFieldError(!commit);
          if (commit) {
            setToken("");
            move(2);
          }
          return;
        }
        setRows(result.rows);
        if (typeof result.token === "string") {
          setToken(result.token);
          setTermId(result.termId ?? null);
          setTermLabel(result.termLabel ?? null);
          setFieldError(false);
          move(2);
        } else move(4);
      } catch {
        setError(
          "The request could not finish. Review the file again before retrying. Any accounts already created will be skipped."
        );
        setFieldError(false);
        setToken("");
        move(1);
      }
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-6" aria-busy={pending}>
      <BackLink href="/secretary/users">Back to Users</BackLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-heading-xl">Import students</h1>
        <p className="text-body-sm text-muted-foreground">
          Create Student accounts in System CLOIE from a spreadsheet. Existing accounts are skipped
          and never changed.
        </p>
      </header>
      <WizardStepper steps={IMPORT_STEPS} currentStep={IMPORT_STEPS[step - 1]!.key} />
      <section className="flex flex-col gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-heading-lg outline-none">
          {
            ["Prepare your CSV", "Review every row", "Confirm the import", "Import results"][
              step - 1
            ]
          }
        </h2>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Import could not continue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {step === 1 && (
          <>
            <p className="text-body-sm">
              Download the template, fill in one student per row, then save as CSV UTF-8. Keep the
              six column names. Upload up to 100 students per file, no larger than 256 KiB.
            </p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                download(STUDENT_IMPORT_TEMPLATE, "system-cloie-students-template.csv")
              }
            >
              <Download data-icon="inline-start" />
              Download CSV template
            </Button>
            <dl className="text-body-sm grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                [
                  "name",
                  "Full account name. Preserve the student's spelling and capitalization. Google supplies the name at first sign-in.",
                ],
                [
                  "email",
                  "An @acd.edu.ph or @acdeducation.com address. No passwords or student IDs.",
                ],
                ["program_code", "Use a program code from the reference below."],
                [
                  "major_name",
                  "Use the listed major name. Leave blank only if the program has no majors.",
                ],
                ["year_level", "Enter 1, 2, 3, or 4."],
                ["section", "Enter Morning, Afternoon, or Evening."],
              ].map(([label, description]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-semibold">{label}</dt>
                  <dd className="text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
            <p className="text-body-sm text-muted-foreground">
              Capitalization and surrounding spaces do not affect email, program, major, or section
              matching. Put names containing commas in quotes; spreadsheet CSV export does this for
              you.
            </p>
            <Disclosure open className="rounded-lg border">
              <DisclosureTrigger
                variant="card"
                className="text-body-sm bg-muted/40 hover:bg-muted/60 rounded-t-lg px-4 py-3 font-medium"
              >
                Program and major reference
              </DisclosureTrigger>
              <DisclosureContent className="px-4 pb-4">
                <ul className="text-body-sm flex flex-col gap-3">
                  {programs.map((p) => (
                    <li key={p.id}>
                      <strong>{p.code}</strong> · {p.name}
                      <p className="text-muted-foreground">
                        {p.majors.length
                          ? `Majors: ${p.majors.map((m) => m.name).join("; ")}`
                          : "No major. Leave major_name blank."}
                      </p>
                    </li>
                  ))}
                </ul>
              </DisclosureContent>
            </Disclosure>
            <FieldGroup>
              <Field data-invalid={fieldError}>
                <FieldLabel htmlFor="students-csv">Student CSV file</FieldLabel>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a Student CSV file"
                  aria-disabled={pending}
                  aria-describedby="students-csv-help"
                  onClick={() => {
                    if (!pending) input.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (!pending && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      input.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    if (!pending) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (pending) return;
                    event.preventDefault();
                    acceptFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                  className="focus-visible:ring-ring flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center outline-none focus-visible:ring-3 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                >
                  <Upload aria-hidden="true" className="text-muted-foreground size-6" />
                  <span className="text-body-sm font-medium">Drop a CSV here or choose a file</span>
                  <span className="text-body-sm text-muted-foreground">
                    CSV UTF-8, up to 100 students and 256 KiB.
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    tabIndex={-1}
                    disabled={pending}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!pending) input.current?.click();
                    }}
                  >
                    Choose CSV file
                  </Button>
                </div>
                <input
                  ref={input}
                  id="students-csv"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={pending}
                  tabIndex={-1}
                  aria-invalid={fieldError || undefined}
                  className="sr-only"
                  onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
                />
                {file && (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <FileSpreadsheet aria-hidden="true" className="text-primary size-5 shrink-0" />
                    <span className="text-body-sm min-w-0 flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      disabled={pending}
                    >
                      <X data-icon="inline-start" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                )}
                <FieldDescription id="students-csv-help">
                  Uploading for review does not create any accounts.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Button className="self-end" disabled={!file || pending} onClick={() => submit(false)}>
              {pending ? "Reviewing file…" : "Review file"}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-body-sm" role="status">
              {ready} ready to create · {skipped} skipped ·{" "}
              {rows.filter((r) => r.status === "Needs correction").length} need correction.
            </p>
            <p className="text-body-sm text-muted-foreground">
              {invalid
                ? "Correct the marked rows in your spreadsheet and upload it again. No accounts have been created."
                : "Check names, emails, and placement before continuing. Skipped accounts will not be changed."}
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <Alert>
              <AlertTitle>Create {ready} Student accounts?</AlertTitle>
              <AlertDescription>
                {skipped} existing accounts will be skipped.{" "}
                {termId
                  ? `Placement will be recorded in the currently active academic period${termLabel ? ` — ${termLabel}` : ""}.`
                  : "There is no active academic period. Accounts and academic profiles will be created, but enrollment will be deferred. Year level and section are not saved until placement is recorded later."}{" "}
                This does not add students to course rosters or send sign-in emails. Students use
                their institutional Google account.
              </AlertDescription>
            </Alert>
          </>
        )}
        {step === 4 && (
          <>
            <p className="text-body-sm" role="status">
              {rows.filter((r) => r.status === "Created").length} created · {skipped} skipped ·{" "}
              {failed.length} failed.
            </p>
            <p className="text-body-sm">
              {failed.length
                ? "Download failed rows, correct them if needed, and review them again. Retrying the original file is also safe: existing accounts will be skipped."
                : "The import is complete. Students can sign in with Google once their placement is ready."}
            </p>
            {failed.length > 0 && (
              <Button
                variant="outline"
                className="self-start"
                onClick={() =>
                  download(exportStudentImportRows(failed), "system-cloie-students-retry.csv")
                }
              >
                Download failed rows
              </Button>
            )}
          </>
        )}
        {step > 1 && (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Row", "Student", "Placement", "Result"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.line}>
                      <TableCell>{row.line}</TableCell>
                      <TableCell className="break-all whitespace-normal">
                        {row.input.name}
                        <p className="text-muted-foreground">{row.input.email}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {row.input.program_code} {row.input.major_name}
                        <p>
                          Year {row.input.year_level} · {row.input.section}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-sm whitespace-normal">
                        <Badge
                          variant={
                            row.status === "Needs correction" || row.status === "Failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {row.status}
                        </Badge>
                        <p className="text-body-sm mt-1">{row.message}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="flex flex-col gap-4 md:hidden" aria-label="Student review rows">
              {rows.map((row) => (
                <li
                  key={row.line}
                  className="text-body-sm flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Row {row.line}</span>
                    <Badge
                      variant={
                        row.status === "Needs correction" || row.status === "Failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                  </div>
                  <p className="font-medium break-words">{row.input.name}</p>
                  <p className="break-all">{row.input.email}</p>
                  <p>
                    {row.input.program_code} {row.input.major_name} · Year {row.input.year_level} ·{" "}
                    {row.input.section}
                  </p>
                  <p className="text-muted-foreground">{row.message}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          {step === 2 && (
            <>
              <Button variant="outline" disabled={pending} onClick={reset}>
                Choose another file
              </Button>
              <Button disabled={pending || invalid || !ready || !token} onClick={() => move(3)}>
                Continue to confirmation
              </Button>
              {!token && file && (
                <Button disabled={pending} onClick={() => submit(false)}>
                  Review file again
                </Button>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" disabled={pending} onClick={() => move(2)}>
                Back to review
              </Button>
              <Button disabled={pending || !token} onClick={() => submit(true)}>
                {pending ? "Creating accounts…" : `Create ${ready} Student accounts`}
              </Button>
            </>
          )}
          {step === 4 && (
            <>
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
              <Button render={<Link href="/secretary/users" />}>View Users</Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
