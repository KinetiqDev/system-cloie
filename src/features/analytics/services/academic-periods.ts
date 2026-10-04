import { prisma } from "@/lib/db/prisma";

/**
 * Canonical academic-period presentation shared by the Program Head analytics,
 * Program Head dashboard and responses, and General Education Coordinator
 * reads. Each read keeps its own term-instance predicate — the Program-scoped,
 * cross-Program, and responses-list scopes legitimately differ — so only the
 * labels, period options, and school-year resolution that all of them need live
 * here.
 */

/** A canonical AcademicTermInstance projection every period read already selects. */
export type TermInstanceSummary = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { id: string; code: string };
};

/** The three canonical parts of one academic period. */
type AcademicPeriodParts = {
  school_year: { code: string };
  semester: string;
  term: string | null;
};

/** One selectable period in an analytics period filter. */
type PeriodOption = {
  id: string;
  schoolYearId: string;
  schoolYearLabel: string;
  semester: string;
  semesterLabel: string;
  termLabel: string | null;
  label: string;
};

/** Period filter options; empty arrays omit their controls. */
type PeriodFilterOptions = {
  schoolYears: Array<{ id: string; label: string }>;
  semesters: Array<{ value: string; label: string }>;
  termInstances: PeriodOption[];
};

const SEMESTER_LABELS: Record<string, string> = {
  FIRST: "1st Semester",
  SECOND: "2nd Semester",
  SUMMER: "Summer",
};

const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: "1st Term",
  SECOND_TERM: "2nd Term",
};

/** Sentinel term filter that matches no rows, used when a filter resolves to nothing. */
export const IMPOSSIBLE_TERM_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

/** Readable label for one academic period from its canonical parts. */
export function buildInstancePeriodLabel(instance: AcademicPeriodParts): string {
  const semesterLabel = SEMESTER_LABELS[instance.semester] ?? instance.semester;
  const termLabel = instance.term ? (TERM_LABELS[instance.term] ?? instance.term) : null;
  return [instance.school_year.code, semesterLabel, termLabel].filter(Boolean).join(" · ");
}

/** Project one term instance into its filter option. */
export function toPeriodOption(instance: TermInstanceSummary): PeriodOption {
  return {
    id: instance.id,
    schoolYearId: instance.school_year.id,
    schoolYearLabel: instance.school_year.code,
    semester: instance.semester,
    semesterLabel: SEMESTER_LABELS[instance.semester] ?? instance.semester,
    termLabel: instance.term ? (TERM_LABELS[instance.term] ?? instance.term) : null,
    label: buildInstancePeriodLabel(instance),
  };
}

/** Distinct school years and semesters behind the in-scope term instances. */
export function buildPeriodOptions(instances: TermInstanceSummary[]): PeriodFilterOptions {
  const schoolYears = new Map<string, string>();
  const semesters = new Map<string, string>();
  for (const instance of instances) {
    schoolYears.set(instance.school_year.id, instance.school_year.code);
    semesters.set(instance.semester, SEMESTER_LABELS[instance.semester] ?? instance.semester);
  }

  return {
    schoolYears: [...schoolYears].map(([id, label]) => ({ id, label })),
    semesters: [...semesters].map(([value, label]) => ({ value, label })),
    termInstances: instances.map(toPeriodOption),
  };
}

/**
 * Label the filtered period. A single selected term instance names its full
 * period; otherwise the school-year and semester filters compose the label, and
 * a filterless scope stays unlabeled.
 */
export function buildPeriodLabel(
  filters: { semester?: string; termInstanceId?: string },
  schoolYearLabel: string | null,
  instances: AcademicPeriodParts[]
): string | null {
  if (filters.termInstanceId && instances.length === 1) {
    return buildInstancePeriodLabel(instances[0]);
  }
  const parts: string[] = [];
  if (schoolYearLabel) parts.push(`School Year ${schoolYearLabel}`);
  if (filters.semester) parts.push(SEMESTER_LABELS[filters.semester] ?? filters.semester);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Resolve the selected school year's readable code. Matching term instances
 * already carry it; only a filter resolving to nothing needs the lookup, and
 * mixed codes are never collapsed into an invented label.
 */
export async function resolveSchoolYearLabel(
  schoolYearId: string | undefined,
  instances: TermInstanceSummary[]
): Promise<string | null> {
  if (!schoolYearId) return null;
  const codes = [...new Set(instances.map((instance) => instance.school_year.code))];
  if (codes.length === 1) return codes[0];

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { code: true },
  });
  return schoolYear?.code ?? null;
}
