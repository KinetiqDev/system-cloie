import { AcademicSemester, AcademicTerm } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { parseCourseInfoSnapshot } from "@/features/evaluations/services/course-info-snapshot";
import type {
  FacultyAnalyticsEvaluationItem,
  ListFacultyAnalyticsEvaluationsResult,
} from "../types";

export type FacultyAnalyticsFilters = {
  schoolYearCode?: string;
  courseIds?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
};

export async function listFacultyAnalyticsEvaluations(
  filters: FacultyAnalyticsFilters = {}
): Promise<ListFacultyAnalyticsEvaluationsResult> {
  const session = await resolveAuthSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  if (session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty access required" };
  }

  try {
    // Build where clause with filters
    const where: Record<string, unknown> = {
      course_assignment: {
        faculty_id: session.userId,
      },
    };

    // Status filter - if not specified, include all except ARCHIVED by default
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    if (filters.schoolYearCode) {
      where.term_instance = { school_year: { code: filters.schoolYearCode } };
    }

    if (filters.courseIds && filters.courseIds.length > 0) {
      (where.course_assignment as Record<string, unknown>).course_id = {
        in: filters.courseIds,
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.published_at = {};
      if (filters.dateFrom) {
        (where.published_at as Record<string, Date>).gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        (where.published_at as Record<string, Date>).lte = filters.dateTo;
      }
    }

    const evaluations = await prisma.courseBoundEvaluation.findMany({
      where,
      orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
      include: {
        course_assignment: {
          select: {
            course: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
            program: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        term_instance: {
          include: {
            school_year: true,
          },
        },
        assignments: {
          select: {
            id: true,
            response: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    const items: FacultyAnalyticsEvaluationItem[] = evaluations.map((evalItem) => {
      const courseInfo = parseCourseInfoSnapshot(evalItem.course_info_snapshot);
      const responseCount = evalItem.assignments.filter(
        (a) => a.response?.status === "SUBMITTED"
      ).length;
      const ti = evalItem.term_instance;
      const schoolYearCode = courseInfo?.schoolYearCode ?? ti.school_year.code;
      const termInstanceLabel = formatTermInstanceLabel(
        schoolYearCode,
        (courseInfo?.semester as AcademicSemester | null) ?? ti.semester,
        (courseInfo?.term as AcademicTerm | null) ?? ti.term
      );
      const ca = evalItem.course_assignment;
      return {
        id: evalItem.id,
        deploymentName: evalItem.deployment_name,
        courseId: ca.course.id,
        courseCode: courseInfo?.courseCode ?? ca.course.code,
        courseTitle: courseInfo?.courseTitle ?? ca.course.title,
        programId: ca.program.id,
        programName: courseInfo?.programName ?? ca.program.name,
        termInstanceLabel,
        schoolYearCode,
        status: evalItem.status,
        publishedAt: evalItem.published_at,
        responseCount,
        totalAssignments: evalItem._count.assignments,
      };
    });

    return { success: true, evaluations: items };
  } catch (error) {
    console.error("listFacultyAnalyticsEvaluations error:", error);
    return { success: false, error: "Failed to load evaluations" };
  }
}
