import { AcademicSemester } from "@prisma/client";

import { SEMESTER_OPTIONS, TERM_OPTIONS } from "@/lib/constants/academic";
import { YEAR_LEVEL_OPTIONS } from "@/lib/constants/year-levels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SCHEDULE_FILTER_ALL = "__all__";

type ScheduleFilterValues = {
  yearLevel: string;
  semester: string;
  term: string;
};

export function matchesScheduleFilters(
  schedule: {
    yearLevel: string | null;
    semester: string | null;
    term: string | null;
  },
  filters: ScheduleFilterValues
): boolean {
  if (filters.yearLevel !== SCHEDULE_FILTER_ALL && schedule.yearLevel !== filters.yearLevel) {
    return false;
  }
  if (filters.semester !== SCHEDULE_FILTER_ALL && schedule.semester !== filters.semester) {
    return false;
  }
  if (filters.term !== SCHEDULE_FILTER_ALL && schedule.term !== filters.term) {
    return false;
  }
  return true;
}

type CourseScheduleFilterControlsProps = ScheduleFilterValues & {
  onYearLevelChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onTermChange: (value: string) => void;
};

export function CourseScheduleFilterControls({
  yearLevel,
  semester,
  term,
  onYearLevelChange,
  onSemesterChange,
  onTermChange,
}: CourseScheduleFilterControlsProps) {
  const isSummer = semester === AcademicSemester.SUMMER;
  const effectiveTerm = isSummer ? SCHEDULE_FILTER_ALL : term;

  return (
    <>
      <Select value={yearLevel} onValueChange={(v) => onYearLevelChange(v ?? SCHEDULE_FILTER_ALL)}>
        <SelectTrigger aria-label="Filter by year level" className="w-full md:w-[160px]">
          <SelectValue>
            {yearLevel === SCHEDULE_FILTER_ALL
              ? "All Year Levels"
              : (YEAR_LEVEL_OPTIONS.find((o) => o.value === yearLevel)?.label ?? "All Year Levels")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SCHEDULE_FILTER_ALL}>All Year Levels</SelectItem>
          {YEAR_LEVEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={semester}
        onValueChange={(v) => {
          const next = v ?? SCHEDULE_FILTER_ALL;
          onSemesterChange(next);
          if (next === AcademicSemester.SUMMER) onTermChange(SCHEDULE_FILTER_ALL);
        }}
      >
        <SelectTrigger aria-label="Filter by semester" className="w-full md:w-[160px]">
          <SelectValue>
            {semester === SCHEDULE_FILTER_ALL
              ? "All Semesters"
              : (SEMESTER_OPTIONS.find((o) => o.value === semester)?.label ?? "All Semesters")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SCHEDULE_FILTER_ALL}>All Semesters</SelectItem>
          {SEMESTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="w-full md:w-[150px]">
        <Select
          value={effectiveTerm}
          onValueChange={(v) => onTermChange(v ?? SCHEDULE_FILTER_ALL)}
          disabled={isSummer}
        >
          <SelectTrigger aria-label="Filter by term" className="w-full md:w-[150px]">
            <SelectValue>
              {effectiveTerm === SCHEDULE_FILTER_ALL
                ? isSummer
                  ? "Not applicable"
                  : "All Terms"
                : (TERM_OPTIONS.find((o) => o.value === effectiveTerm)?.label ?? "All Terms")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SCHEDULE_FILTER_ALL}>
              {isSummer ? "Not applicable" : "All Terms"}
            </SelectItem>
            {!isSummer &&
              TERM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {isSummer && (
          <p className="text-muted-foreground mt-1 text-xs">Summer semester has no terms</p>
        )}
      </div>
    </>
  );
}
