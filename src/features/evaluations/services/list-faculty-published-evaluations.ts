import { AcademicSemester, AcademicTerm, CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { parseCourseInfoSnapshot } from "./course-info-snapshot";
import type {
  FacultyPublishedEvaluationItem,
  ListFacultyPublishedEvaluationsResult,
} from "../types";

export async function listFacultyPublishedEvaluations(): Promise<ListFacultyPublishedEvaluationsResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Unauthorized. Faculty role required." };
  }

  // Resolve faculty's active program affiliations
  const affiliations = await prisma.facultyProgramAffiliation.findMany({
    where: {
      faculty_id: session.userId,
      is_active: true,
    },
    select: {
      program: { select: { id: true, code: true, name: true } },
    },
  });

  if (affiliations.length === 0) {
    return {
      success: false,
      error: "No active program affiliation found.",
    };
  }

  // Use first affiliation's program
  const program = affiliations[0].program;

  // Find course assignments for this faculty member. Published evaluations are
  // historical records and must remain visible after an assignment is deactivated.
  const facultyAssignments = await prisma.courseAssignment.findMany({
    where: {
      faculty_id: session.userId,
    },
    select: {
      id: true,
    },
  });

  if (facultyAssignments.length === 0) {
    return {
      success: true,
      data: { evaluations: [], program },
    };
  }

  // Fetch evaluations for those assignments via course_assignment relation
  const rawEvaluations = await prisma.courseBoundEvaluation.findMany({
    where: {
      course_assignment_id: {
        in: facultyAssignments.map((a) => a.id),
      },
    },
    include: {
      course_assignment: {
        select: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              course_scope: true,
              major_id: true,
              major: { select: { id: true, name: true } },
            },
          },
          program: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      targets: true,
      _count: {
        select: {
          assignments: true,
        },
      },
      term_instance: {
        include: {
          school_year: true,
        },
      },
      assignments: {
        where: {
          response: {
            status: "SUBMITTED",
          },
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const evaluations: FacultyPublishedEvaluationItem[] = rawEvaluations.map((evalItem) => {
    const courseInfo = parseCourseInfoSnapshot(evalItem.course_info_snapshot);
    const ti = evalItem.term_instance;
    const termInstanceLabel = formatTermInstanceLabel(
      courseInfo?.schoolYearCode ?? ti.school_year.code,
      (courseInfo?.semester as AcademicSemester | null) ?? ti.semester,
      (courseInfo?.term as AcademicTerm | null) ?? ti.term
    );
    const ca = evalItem.course_assignment;
    return {
      termInstanceLabel,
      activationAt: evalItem.activation_at,
      courseCode: courseInfo?.courseCode ?? ca.course.code,
      courseId: ca.course.id,
      courseScope: (courseInfo?.courseScope as CourseScope | null) ?? ca.course.course_scope,
      courseTitle: courseInfo?.courseTitle ?? ca.course.title,
      deadlineAt: evalItem.deadline_at,
      deploymentName: evalItem.deployment_name,
      evaluationId: evalItem.id,
      majorId: ca.course.major_id,
      majorName: courseInfo?.majorName ?? ca.course.major?.name ?? null,
      programCode: courseInfo?.programCode ?? ca.program.code,
      programId: ca.program.id,
      programName: courseInfo?.programName ?? ca.program.name,
      publishedAt: evalItem.published_at,
      responseCount: evalItem.assignments.length,
      status: evalItem.status,
      targetYearLevels: evalItem.targets
        .map((t) => t.year_level)
        .filter((yl): yl is NonNullable<typeof yl> => yl !== null),
      totalAssignments: evalItem._count.assignments,
    };
  });

  return {
    success: true,
    data: {
      evaluations,
      program,
    },
  };
}
