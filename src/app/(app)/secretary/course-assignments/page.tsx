import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { ROLES } from "@/lib/constants/roles";
import { CourseAssignmentsClientPage } from "./client-page";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignableCourse } from "@/features/course-assignments/types";

export const metadata = {
  title: "Course Assignments — Secretary | CLOIE",
};

export default async function SecretaryCourseAssignmentsPage() {
  const [session, schoolYearsResult] = await Promise.all([
    resolveAuthSession(),
    listSchoolYears(),
  ]);

  if (!session || !session.roles.includes(ROLES.SECRETARY)) {
    redirect("/unauthorized");
  }

  const [programs, courses, faculty] = await Promise.all([
    prisma.program.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.course.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        title: true,
        default_year_level: true,
        course_scope: true,
        program_id: true,
      },
      orderBy: { code: "asc" },
    }),
    prisma.facultyProgramAffiliation.findMany({
      where: { is_active: true },
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
    }),
  ]);

  const availableFaculty = [
    ...new Map(
      faculty.map(({ faculty: f }) => [
        f.id,
        { id: f.id, firstName: f.first_name, lastName: f.last_name, email: f.email },
      ])
    ).values(),
  ].sort((a, b) => a.lastName.localeCompare(b.lastName));

  const termInstances: TermInstanceItem[] = schoolYearsResult.items.flatMap(
    (sy) => sy.termInstances
  );

  const availableCourses: AssignableCourse[] = courses.map((c) => ({
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
      availablePrograms={programs}
      availableFaculty={availableFaculty}
      termInstances={termInstances}
    />
  );
}
