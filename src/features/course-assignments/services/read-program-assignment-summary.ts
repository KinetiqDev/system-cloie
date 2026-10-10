import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
import type { DashboardPeriodFilters } from "@/features/analytics/services/get-program-head-dashboard";
import type { AcademicSemester } from "@prisma/client";

export async function readProgramAssignmentSummary(
  programId: string,
  filters: DashboardPeriodFilters
) {
  const context = await resolveProgramHeadContext(programId);
  if (!context.success) return null;
  const hasPeriodFilter = Boolean(
    filters.termInstanceId || filters.schoolYearId || filters.semester
  );
  const termId = hasPeriodFilter ? filters.termInstanceId : await getActiveTermId();
  const where = {
    program_id: context.data.selectedProgram.id,
    is_active: true,
    ...(!hasPeriodFilter && !termId ? { id: "__no_active_period__" } : {}),
    ...(termId ? { term_instance_id: termId } : {}),
    term_instance: {
      ...(filters.schoolYearId ? { school_year_id: filters.schoolYearId } : {}),
      ...(filters.semester ? { semester: filters.semester as AcademicSemester } : {}),
    },
  };
  const [total, assignments] = await Promise.all([
    prisma.courseAssignment.count({ where }),
    prisma.courseAssignment.findMany({
      where,
      select: {
        id: true,
        year_level: true,
        section: true,
        course: { select: { code: true, title: true, course_scope: true } },
        faculty: { select: { name: true } },
        program: { select: { code: true } },
      },
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      take: 5,
    }),
  ]);
  return { total, assignments, termId };
}
