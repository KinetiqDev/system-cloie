import { redirect } from "next/navigation";
import { ensureRoleAccess } from "@/features/auth/policies/ensure-role-access";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyAnalyticsEvaluations } from "@/features/analytics/services/list-faculty-analytics-evaluations";
import { FacultyAnalyticsDashboard } from "@/features/analytics/components/faculty-analytics-dashboard";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";

// The route shells auth guards, deep-link hydration, and filter-option reads in one server component;
// each guard is the page's Faculty authorization contract.
// fallow-ignore-next-line complexity
export default async function FacultyAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string | string[] }>;
}) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const redirectPath = ensureRoleAccess({
    activeRole: session.activeRole,
    allowedRoles: [ROLES.FACULTY],
  });

  if (redirectPath) {
    redirect(redirectPath);
  }

  // Honor a course-scoped deep link from the Faculty dashboard evidence rows.
  const raw = await searchParams;
  const requestedCourseId = Array.isArray(raw.courseId) ? raw.courseId[0] : raw.courseId;
  const initialCourseIds = requestedCourseId ? [requestedCourseId] : undefined;
  const evaluationsResult = await listFacultyAnalyticsEvaluations(
    initialCourseIds ? { courseIds: initialCourseIds } : {}
  );

  if (!evaluationsResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-heading-lg">Analytics</h1>
        <p className="text-body-md text-text-secondary">{evaluationsResult.error}</p>
      </div>
    );
  }

  // Get available filter options
  const [termInstances, courses] = await Promise.all([
    prisma.courseBoundEvaluation.findMany({
      where: {
        course_assignment: {
          faculty_id: session.userId,
        },
      },
      select: {
        term_instance: {
          select: {
            school_year: { select: { code: true } },
          },
        },
      },
      distinct: ["term_instance_id"],
    }),
    prisma.course.findMany({
      where: {
        program_id: {
          in: (
            await prisma.facultyProgramAffiliation.findMany({
              where: { faculty_id: session.userId },
              select: { program_id: true },
            })
          ).map((a) => a.program_id),
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const availableAcademicYears = [
    ...new Set(termInstances.map((t) => t.term_instance.school_year.code)),
  ].sort((a, b) => b.localeCompare(a));
  const availableCourses = courses.map((c) => ({
    id: c.id,
    label: `${c.code} - ${c.title}`,
  }));

  return (
    <FacultyAnalyticsDashboard
      initialEvaluations={evaluationsResult.evaluations}
      availableAcademicYears={availableAcademicYears}
      availableCourses={availableCourses}
      initialCourseIds={initialCourseIds}
    />
  );
}
