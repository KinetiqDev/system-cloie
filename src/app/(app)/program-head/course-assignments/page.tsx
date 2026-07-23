import { redirect } from "next/navigation";
import { listProgramHeadCourses } from "@/features/academic-structure/services/resolve-program-head-courses";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { CourseAssignmentsClientPage } from "./client-page";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignableCourse } from "@/features/course-assignments/types";

export const metadata = {
  title: "Course Assignments — Program Head | CLOIE",
};

export default async function CourseAssignmentsPage() {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
    redirect("/unauthorized");
  }

  const [coursesResult, schoolYearsResult] = await Promise.all([
    listProgramHeadCourses(),
    listSchoolYears(),
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
    <CourseAssignmentsClientPage
      availableCourses={availableCourses}
      availablePrograms={coursesResult.programs}
      availableFaculty={availableFaculty}
      termInstances={termInstances}
    />
  );
}
