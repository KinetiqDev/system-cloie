import { randomUUID } from "node:crypto";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { CourseScope } from "@prisma/client";
import { canDeployCourseBoundEvaluation } from "../policies";
import type {
  PreviewCourseBoundRespondentsInput,
  PreviewCourseBoundRespondentsResult,
  PreviewRespondent,
} from "../types";

/**
 * Preview respondents from the active Course-assignment roster.
 * StudentEnrollment is only a current eligibility input, not the roster source.
 */
export async function previewCourseBoundRespondents({
  assignmentId,
  programId,
}: PreviewCourseBoundRespondentsInput): Promise<PreviewCourseBoundRespondentsResult> {
  let actorId: string | undefined;

  try {
    const authSession = await resolveAuthSession();

    if (!authSession) {
      return {
        error: "Authentication required.",
        success: false,
      };
    }
    actorId = authSession.userId;

    const selectedProgram =
      authSession.activeRole === ROLES.PROGRAM_HEAD
        ? programId
          ? await resolveProgramHeadContext(programId)
          : null
        : null;

    if (
      authSession.activeRole === ROLES.PROGRAM_HEAD &&
      (!selectedProgram || !selectedProgram.success)
    ) {
      return { error: "Course assignment not found.", success: false };
    }

    // Resolve assignment identity before querying its roster.
    const assignment = await prisma.courseAssignment.findFirst({
      where: { id: assignmentId },
      include: {
        term_instance: {
          include: {
            school_year: true,
          },
        },
        program: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            course_scope: true,
          },
        },
      },
    });

    if (!assignment) {
      return {
        error: "Course assignment not found.",
        success: false,
      };
    }

    // Resolve scope only for the active portal role.
    const selectedProgramId = selectedProgram?.success
      ? selectedProgram.data.selectedProgram.id
      : undefined;
    const phProgramScope = selectedProgramId ? [selectedProgramId] : [];

    // Call policy for authorization
    const authCheck = canDeployCourseBoundEvaluation(
      authSession,
      {
        faculty_id: assignment.faculty_id,
        program_id: assignment.program_id,
        course_scope: assignment.course.course_scope as CourseScope,
      },
      phProgramScope
    );

    if (!authCheck.allowed) {
      return {
        error: "Course assignment not found.",
        success: false,
      };
    }

    if (selectedProgramId && assignment.program_id !== selectedProgramId) {
      return {
        error: "Course assignment not found.",
        success: false,
      };
    }

    if (!assignment.is_active) {
      return {
        error: "This course assignment is inactive.",
        success: false,
      };
    }

    const memberships = await prisma.courseAssignmentMembership.findMany({
      where: { course_assignment_id: assignment.id, is_active: true },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        student_user_id: true,
        student: {
          select: {
            email: true,
            name: true,
            student_profile: {
              select: {
                major_id: true,
                major: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const mappedRespondents: PreviewRespondent[] = memberships.map((membership) => ({
      email: membership.student.email,
      majorId: membership.student.student_profile?.major_id ?? null,
      majorName: membership.student.student_profile?.major?.name ?? null,
      membershipId: membership.id,
      name: membership.student.name,
      programCode: assignment.program.code,
      programId: assignment.program.id,
      programName: assignment.program.name,
      section: assignment.section,
      userId: membership.student_user_id,
      yearLevel: assignment.year_level,
    }));

    return {
      success: true,
      data: mappedRespondents,
    };
  } catch (error) {
    const referenceId = randomUUID();
    console.error("Failed to preview course-bound respondents", {
      operation: "preview_course_bound_respondents",
      actorId: actorId ?? null,
      assignmentId,
      referenceId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              code:
                typeof error === "object" && error !== null && "code" in error
                  ? String(error.code)
                  : undefined,
            }
          : { type: typeof error },
    });
    return {
      error: "Failed to load respondent preview. Please try again.",
      referenceId,
      success: false,
    };
  }
}
