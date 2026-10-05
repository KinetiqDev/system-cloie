// fallow-ignore-file code-duplication
import { redirect } from "next/navigation";

import { CourseRosterDiscoveryPage } from "@/features/course-assignments/components/course-roster-pages";
import {
  courseRosterListPath,
  isCanonicalCourseRosterListState,
  parseCourseRosterListState,
} from "@/features/course-assignments/course-roster-list-state";
import {
  listAuthorizedCourseRosterAssignments,
  listFacultyRosterFacets,
} from "@/features/course-assignments/services/read-course-rosters";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Course Rosters", "Faculty") };

const ROSTER_PATH = "/faculty/course-rosters";

export default async function FacultyCourseRostersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requestedSearchParams = await searchParams;
  const state = parseCourseRosterListState(requestedSearchParams);
  const { filters } = state;

  const [result, facets, schoolYears] = await Promise.all([
    listAuthorizedCourseRosterAssignments({
      facultyOnly: true,
      period: filters.period,
      search: filters.search,
      courseId: filters.courseId,
      programId: filters.programId,
      yearLevel: filters.yearLevel,
      section: filters.section,
      courseScope: filters.courseScope,
      page: state.page - 1,
    }),
    listFacultyRosterFacets(),
    listSchoolYears({ includeArchived: true }).catch(() => ({ items: [] })),
  ]);

  // Facet options come from the Faculty member's own assignments. If that read
  // fails the list is still trustworthy, so the filters simply stay empty.
  const facultyFacets = facets.success ? facets.data : { courses: [], programs: [] };
  const termInstances = schoolYears.items.flatMap((schoolYear) => schoolYear.termInstances);

  if (!result.success) {
    const supportSuffix = result.referenceId ? ` Support reference: ${result.referenceId}.` : "";
    if (!isCanonicalCourseRosterListState(requestedSearchParams, state)) {
      redirect(courseRosterListPath(ROSTER_PATH, state));
    }
    return (
      <CourseRosterDiscoveryPage
        data={null}
        error={`${result.error}${supportSuffix}`}
        view={state.view}
        filters={filters}
        termInstances={termInstances}
        courses={facultyFacets.courses}
        programs={facultyFacets.programs}
      />
    );
  }

  // The service clamps an out-of-range page; the URL follows so Back and a
  // shared link agree with what was actually returned.
  const canonicalState = {
    ...state,
    page: result.data.page + 1,
    filters: { ...filters, search: result.data.search },
  };
  if (!isCanonicalCourseRosterListState(requestedSearchParams, canonicalState)) {
    redirect(courseRosterListPath(ROSTER_PATH, canonicalState));
  }

  return (
    <CourseRosterDiscoveryPage
      data={result.data}
      view={state.view}
      filters={filters}
      termInstances={termInstances}
      courses={facultyFacets.courses}
      programs={facultyFacets.programs}
    />
  );
}
