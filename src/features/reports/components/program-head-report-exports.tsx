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

/** The staged academic scope the client submits; the server rebuilds it anyway. */
type ExportScope = {
  schoolYear: string;
  semester: string;
  termInstanceId: string;
  yearLevel: string;
};

function exportQuery(target: ExportTarget, scope: ExportScope): URLSearchParams {
  const params = new URLSearchParams({ kind: target.kind });
  if (scope.schoolYear !== ALL) params.set("schoolYearId", scope.schoolYear);
  if (scope.semester !== ALL) params.set("semester", scope.semester);
  if (scope.termInstanceId !== ALL) params.set("termInstanceId", scope.termInstanceId);
  // The year-level control narrows course evidence only, so program-wide
  // exports never send it.
  if (target.supportsYearLevel && scope.yearLevel !== ALL) {
    params.set("yearLevel", scope.yearLevel);
  }
  return params;
}

/** Server refusals arrive as typed JSON; an empty scope reads as "no data". */
async function refusalStatus(target: ExportTarget, response: Response): Promise<Status> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    reason?: string;
  } | null;
  const message = body?.error ?? "The report could not be generated.";
  return body?.reason
    ? { state: "empty", kind: target.kind, message }
    : { state: "failed", kind: target.kind, message };
}

/** Server-provided attachment name, with a neutral fallback. */
function downloadName(response: Response): string {
  return (
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    "system-cloie-report"
  );
}

async function saveDownload(response: Response): Promise<void> {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName(response);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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

/** Readable restatement of the staged period, for the scope card and its screenshot. */
function resolveScopeLabel(scope: {
  termInstance: { label: string } | undefined;
  schoolYearLabel: string;
  semesterLabel: string;
}): string {
  if (scope.termInstance) return scope.termInstance.label;
  return [
    scope.schoolYearLabel === "All academic years" ? null : scope.schoolYearLabel,
    scope.semesterLabel === "All semesters" ? null : scope.semesterLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Staged academic scope: the period controls plus the course-evidence year level. */
type ScopeControls = {
  scope: ExportScope;
  scopeLabel: string;
  schoolYears: Array<{ value: string; label: string }>;
  semesters: ProgramHeadAnalyticsPeriodOptions["semesters"];
  termOptions: Array<{ value: string; label: string }>;
  yearLevels: Array<{ value: string; label: string }>;
  onSchoolYearChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onYearLevelChange: (value: string) => void;
};

/**
 * Scope card. Each period control is a labeled select that works on touch, and
 * the current scope is restated in text so a screenshot of the page is
 * self-explanatory.
 */
function ExportScopeCard({
  programLabel,
  scope,
  scopeLabel,
  schoolYears,
  semesters,
  termOptions,
  yearLevels,
  onSchoolYearChange,
  onSemesterChange,
  onTermChange,
  onYearLevelChange,
}: ScopeControls & { programLabel: string }) {
  const ids = {
    schoolYear: useId(),
    semester: useId(),
    term: useId(),
    yearLevel: useId(),
  };

  return (
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
            id={ids.schoolYear}
            label="Academic year"
            value={scope.schoolYear}
            onValueChange={onSchoolYearChange}
            blankLabel="All academic years"
            options={schoolYears}
          />
          <FilterSelect
            id={ids.semester}
            label="Semester"
            value={scope.semester}
            onValueChange={onSemesterChange}
            blankLabel="All semesters"
            options={semesters}
          />
          <FilterSelect
            id={ids.term}
            label="Term"
            value={scope.termInstanceId}
            onValueChange={onTermChange}
            blankLabel="All terms"
            options={termOptions}
          />
          <FilterSelect
            id={ids.yearLevel}
            label="Year level (course evidence)"
            value={scope.yearLevel}
            onValueChange={onYearLevelChange}
            blankLabel="All year levels"
            options={yearLevels}
            hint="Applies to the course workbook and raw CSV. Program-wide evidence is filtered by academic period only."
          />
        </div>
        <p className="text-body-sm text-muted-foreground mt-4 text-pretty">
          Current scope: {scopeLabel || "All academic periods"} ·{" "}
          {yearLevelLabel(yearLevels, scope.yearLevel)}.
        </p>
      </CardContent>
    </Card>
  );
}

function yearLevelLabel(
  yearLevels: Array<{ value: string; label: string }>,
  value: string
): string {
  if (value === ALL) return "all year levels";
  return yearLevels.find((level) => level.value === value)?.label ?? value;
}

/** One export, named and described on its own card. */
function ExportTargetCard({
  target,
  working,
  busy,
  onExport,
}: {
  target: ExportTarget;
  working: boolean;
  busy: boolean;
  onExport: (target: ExportTarget) => void;
}) {
  const Icon = target.icon;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4" />
          {target.title}
        </CardTitle>
        <CardDescription>{target.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => onExport(target)} disabled={busy} className="w-full sm:w-auto">
          {working ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
          {working ? "Preparing report…" : target.title}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProgramHeadReportExports({
  programId,
  programLabel,
  periodOptions,
  yearLevels,
}: Props) {
  const statusId = useId();

  const [schoolYear, setSchoolYear] = useState<string>(ALL);
  const [semester, setSemester] = useState<string>(ALL);
  const [termInstanceId, setTermInstanceId] = useState<string>(ALL);
  const [yearLevel, setYearLevel] = useState<string>(ALL);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const schoolYears = useMemo(
    () => (periodOptions.schoolYears ?? []).map((year) => ({ value: year.id, label: year.label })),
    [periodOptions.schoolYears]
  );
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

  const semesterOptions = useMemo(
    () => semesters.map((option) => ({ value: option.value, label: option.label })),
    [semesters]
  );
  const termOptions = useMemo(
    () =>
      termInstances
        .filter(
          (instance) =>
            (schoolYear === ALL || instance.schoolYearId === schoolYear) &&
            (semester === ALL || instance.semester === semester)
        )
        .map((instance) => ({ value: instance.id, label: instance.label })),
    [termInstances, schoolYear, semester]
  );

  const scopeLabel = resolveScopeLabel({
    termInstance: termInstances.find((instance) => instance.id === termInstanceId),
    schoolYearLabel:
      schoolYears.find((year) => year.value === schoolYear)?.label ?? "All academic years",
    semesterLabel:
      semesterOptions.find((option) => option.value === semester)?.label ?? "All semesters",
  });

  const scope: ExportScope = { schoolYear, semester, termInstanceId, yearLevel };

  async function runExport(target: ExportTarget) {
    setStatus({ state: "working", kind: target.kind });
    try {
      const response = await fetch(
        `${buildReportExportPath(programId)}?${exportQuery(target, scope).toString()}`,
        { method: "GET", credentials: "same-origin" }
      );
      if (!response.ok) {
        setStatus(await refusalStatus(target, response));
        return;
      }
      await saveDownload(response);
      setStatus({ state: "done", kind: target.kind, filename: downloadName(response) });
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
      <ExportScopeCard
        programLabel={programLabel}
        scope={scope}
        scopeLabel={scopeLabel}
        schoolYears={schoolYears}
        semesters={semesterOptions}
        termOptions={termOptions}
        yearLevels={yearLevels}
        onSchoolYearChange={(value) => {
          setSchoolYear(value);
          setSemester(ALL);
          setTermInstanceId(ALL);
        }}
        onSemesterChange={(value) => {
          setSemester(value);
          setTermInstanceId(ALL);
        }}
        onTermChange={setTermInstanceId}
        onYearLevelChange={setYearLevel}
      />

      <div className="grid gap-4">
        {EXPORT_TARGETS.map((target) => (
          <ExportTargetCard
            key={target.kind}
            target={target}
            working={status.state === "working" && status.kind === target.kind}
            busy={status.state === "working"}
            onExport={runExport}
          />
        ))}
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
