import { redirect } from "next/navigation";
import { listProgramHeadCourses } from "@/features/academic-structure/services/resolve-program-head-courses";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignableCourse } from "@/features/course-assignments/types";
import { loadCourseAssignmentListPage } from "@/features/course-assignments/services/load-course-assignment-list-page";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";

export const metadata = {
  title: "Course Assignments — Program Head | CLOIE",
};

export default async function CourseAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
    redirect("/unauthorized");
  }

  const [coursesResult, schoolYearsResult, listPage] = await Promise.all([
    listProgramHeadCourses(),
    listSchoolYears(),
    loadCourseAssignmentListPage({
      pathname: "/program-head/course-assignments",
      rawSearchParams: await searchParams,
      role: "program-head",
    }),
  ]);

  if (!coursesResult) {
    redirect("/unauthorized");
  }

  // Resolve faculty affiliated with the PH's programs for the filter dropdown
  const programIds = coursesResult.programs.map((p) => p.id);

  const affiliatedFaculty = await prisma.facultyProgramAffiliation.findMany({
    where: { program_id: { in: programIds }, is_active: true },
    select: {
      faculty: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
  });

  const availableFaculty = [
    ...new Map(
      affiliatedFaculty.map(({ faculty: f }) => [
        f.id,
        { id: f.id, firstName: f.first_name, lastName: f.last_name, email: f.email },
      ])
    ).values(),
  ].sort((a, b) => a.lastName.localeCompare(b.lastName));

  const termInstances: TermInstanceItem[] = schoolYearsResult.items.flatMap(
    (sy) => sy.termInstances
  );

  const availableCourses: AssignableCourse[] = coursesResult.courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    default_year_level: c.default_year_level,
    course_scope: c.course_scope,
    program_id: c.program_id,
  }));

  return (
    <CourseAssignmentsPageShell
      key={JSON.stringify(listPage.state)}
      pageTitle="Course Assignments"
      pageDescription="Manage faculty assignments for courses in your program"
      mode="program-head"
      availableCourses={availableCourses}
      availablePrograms={coursesResult.programs}
      availableFaculty={availableFaculty}
      termInstances={termInstances}
      initialData={listPage.result.success ? listPage.result.data : null}
      initialFilters={listPage.initialFilters}
      initialPage={listPage.state.page}
      initialError={listPage.result.success ? null : listPage.result.error}
    />
  );
}
