"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";
import { buildReportExportPath } from "@/features/reports/routes";

// ---------------------------------------------------------------------------
// Program Head report export controls
//
// Three exports, one scope. The controls stage an academic period and year
// level; the server re-authorizes every download and rebuilds the scope, so
// these filters are presentation only. Downloads are fetched as blobs so
// loading, no-data, success, and failure states all surface inline instead of
// replacing the page with a JSON error.
// ---------------------------------------------------------------------------

const ALL = "__all__";

type ExportTarget = {
  kind: "course-workbook" | "po-report" | "raw-csv";
  title: string;
  description: string;
  icon: typeof Download;
  supportsYearLevel: boolean;
};

const EXPORT_TARGETS: ExportTarget[] = [
  {
    kind: "course-workbook",
    title: "Export course workbook",
    description:
      "One worksheet per Professional Course with class groups, question tallies, CILO summaries, and per-response answers.",
    icon: FileSpreadsheet,
    supportsYearLevel: true,
  },
  {
    kind: "po-report",
    title: "Export Program Outcome report",
    description:
      "Program Outcome evidence with classifications, distributions by scale identity, contributions, and program-wide evidence.",
    icon: FileText,
    supportsYearLevel: false,
  },
  {
    kind: "raw-csv",
    title: "Export raw quantitative CSV",
    description: "One row per submitted quantitative answer, normalized for further analysis.",
    icon: Table2,
    supportsYearLevel: true,
  },
];

type Props = {
  programId: string;
  programLabel: string;
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  yearLevels: Array<{ value: string; label: string }>;
};

type Status =
  | { state: "idle" }
  | { state: "working"; kind: ExportTarget["kind"] }
  | {
      state: "done";
      kind: ExportTarget["kind"];
      filename: string;
    }
  | { state: "failed"; kind: ExportTarget["kind"]; message: string }
  | {
      state: "empty";
      kind: ExportTarget["kind"];
      message: string;
    };

export function ProgramHeadReportExports({
  programId,
  programLabel,
  periodOptions,
  yearLevels,
}: Props) {
  const schoolYearId = useId();
  const semesterId = useId();
  const termId = useId();
  const yearLevelId = useId();
  const statusId = useId();

  const [schoolYear, setSchoolYear] = useState<string>(ALL);
  const [semester, setSemester] = useState<string>(ALL);
  const [termInstanceId, setTermInstanceId] = useState<string>(ALL);
  const [yearLevel, setYearLevel] = useState<string>(ALL);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const schoolYears = useMemo(() => periodOptions.schoolYears ?? [], [periodOptions.schoolYears]);
  const termInstances = useMemo(
    () => periodOptions.termInstances ?? [],
    [periodOptions.termInstances]
  );
  const semesters = useMemo(() => {
    if (schoolYear === ALL) return periodOptions.semesters ?? [];
    return termInstances
      .filter((instance) => instance.schoolYearId === schoolYear)
      .filter(
        (instance, index, all) =>
          all.findIndex((candidate) => candidate.semester === instance.semester) === index
      )
      .map((instance) => ({ value: instance.semester, label: instance.semesterLabel }));
  }, [periodOptions, schoolYear, termInstances]);

  const termOptions = useMemo(
    () =>
      termInstances.filter(
        (instance) =>
          (schoolYear === ALL || instance.schoolYearId === schoolYear) &&
          (semester === ALL || instance.semester === semester)
      ),
    [termInstances, schoolYear, semester]
  );

  const selectedTerm = termInstances.find((instance) => instance.id === termInstanceId);
  const selectedYear =
    schoolYears.find((year) => year.id === schoolYear)?.label ?? "All academic years";
  const selectedSemester =
    semesters.find((option) => option.value === semester)?.label ?? "All semesters";
  const scopeLabel = selectedTerm
    ? selectedTerm.label
    : [
        selectedYear === "All academic years" ? null : selectedYear,
        selectedSemester === "All semesters" ? null : selectedSemester,
      ]
        .filter(Boolean)
        .join(" · ");

  async function runExport(target: ExportTarget) {
    setStatus({ state: "working", kind: target.kind });
    const params = new URLSearchParams({ kind: target.kind });
    if (schoolYear !== ALL) params.set("schoolYearId", schoolYear);
    if (semester !== ALL) params.set("semester", semester);
    if (termInstanceId !== ALL) params.set("termInstanceId", termInstanceId);
    if (target.supportsYearLevel && yearLevel !== ALL) params.set("yearLevel", yearLevel);

    try {
      const response = await fetch(`${buildReportExportPath(programId)}?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          reason?: string;
        } | null;
        const message = body?.error ?? "The report could not be generated.";
        setStatus(
          body?.reason
            ? { state: "empty", kind: target.kind, message }
            : { state: "failed", kind: target.kind, message }
        );
        return;
      }
      const filename =
        /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
        "system-cloie-report";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ state: "done", kind: target.kind, filename });
    } catch {
      setStatus({
        state: "failed",
        kind: target.kind,
        message: "The download could not start. Check your connection and try again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Export scope</CardTitle>
          <CardDescription>
            {programLabel} reports carry respondent names. Choose the academic scope to export; the
            server re-checks authorization and Program scope for every download.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              id={schoolYearId}
              label="Academic year"
              value={schoolYear}
              onValueChange={(value) => {
                setSchoolYear(value);
                setSemester(ALL);
                setTermInstanceId(ALL);
              }}
              blankLabel="All academic years"
              options={schoolYears.map((year) => ({
                value: year.id,
                label: year.label,
              }))}
            />
            <FilterSelect
              id={semesterId}
              label="Semester"
              value={semester}
              onValueChange={(value) => {
                setSemester(value);
                setTermInstanceId(ALL);
              }}
              blankLabel="All semesters"
              options={semesters}
            />
            <FilterSelect
              id={termId}
              label="Term"
              value={termInstanceId}
              onValueChange={setTermInstanceId}
              blankLabel="All terms"
              options={termOptions.map((instance) => ({
                value: instance.id,
                label: instance.label,
              }))}
            />
            <FilterSelect
              id={yearLevelId}
              label="Year level (course evidence)"
              value={yearLevel}
              onValueChange={setYearLevel}
              blankLabel="All year levels"
              options={yearLevels}
              hint="Applies to the course workbook and raw CSV. Program-wide evidence is filtered by academic period only."
            />
          </div>
          <p className="text-body-sm text-muted-foreground mt-4 text-pretty">
            Current scope: {scopeLabel || "All academic periods"} ·{" "}
            {yearLevel === ALL
              ? "all year levels"
              : (yearLevels.find((level) => level.value === yearLevel)?.label ?? yearLevel)}
            .
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {EXPORT_TARGETS.map((target) => {
          const Icon = target.icon;
          const working = status.state === "working" && status.kind === target.kind;
          return (
            <Card key={target.kind}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="size-4" />
                  {target.title}
                </CardTitle>
                <CardDescription>{target.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runExport(target)}
                  disabled={status.state === "working"}
                  className="w-full sm:w-auto"
                >
                  {working ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
                  {working ? "Preparing report…" : target.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-body-sm text-muted-foreground flex items-start gap-2 text-pretty"
      >
        <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {status.state === "idle"
            ? "Exports are generated on demand and are not stored on the server."
            : status.state === "working"
              ? "Preparing your report. Larger periods take a moment."
              : status.state === "done"
                ? `Downloaded ${status.filename}. Store it securely: it identifies respondents by name.`
                : status.state === "empty"
                  ? status.message
                  : status.message}
        </span>
      </p>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  blankLabel,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  blankLabel: string;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  const items = [{ value: ALL, label: blankLabel }, ...options];
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={(next) => onValueChange(next ?? ALL)} items={items}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={blankLabel} />
        </SelectTrigger>
        <SelectContent align="start" className="max-w-(--anchor-width) min-w-48">
          <SelectGroup>
            {items.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {hint ? <p className="text-muted-foreground text-xs text-pretty">{hint}</p> : null}
    </Field>
  );
}
