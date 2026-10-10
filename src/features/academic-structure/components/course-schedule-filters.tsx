/** The clearing value every course-catalog schedule facet shares. */
export const SCHEDULE_FILTER_ALL = "__all__";

type ScheduleFilterValues = {
  yearLevel: string;
  semester: string;
  term: string;
};

/**
 * The predicate behind the Year level, Semester, and Term facets. Each catalog
 * filters in memory over an already-read page of courses, so the three facets
 * narrow together through one rule rather than three separate filters.
 */
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
