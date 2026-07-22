import { CourseScope } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import type { FacultyCourseContext } from "../types";
import { type ServiceResult } from "@/lib/utils/service-result";
import { resolveFacultyCourseIds } from "./resolve-faculty-course-ids";

/**
 * List faculty course contexts.
 * If termInstanceId is provided, returns courses assigned to faculty for that term.
 * Otherwise, falls back to program-affiliated courses (legacy behavior).
 */
export async function listFacultyCourseContexts(
  termInstanceId?: string
): Promise<ServiceResult<FacultyCourseContext[]>> {
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty authentication is required." };
  }

  const courseIds = await resolveFacultyCourseIds(authSession.userId, termInstanceId);

  if (courseIds.length === 0) {
    return { success: true, data: [] };
  }

  // Fetch full course details
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      is_active: true,
    },
    include: {
      major: true,
      program: true,
    },
    orderBy: [{ course_scope: "asc" }, { code: "asc" }],
  });

  const contexts: FacultyCourseContext[] = courses.map((course) => {
    const isGeneralEducation = course.course_scope === CourseScope.GENERAL_EDUCATION;
    const isMajorSpecific = Boolean(course.major_id);

    return {
      courseCode: course.code,
      courseId: course.id,
      courseTitle: course.title,
      courseType: course.course_scope,
      majorId: course.major_id,
      majorName: course.major?.name ?? null,
      programCode: course.program?.code ?? "",
      programId: course.program?.id ?? "",
      programName: course.program?.name ?? "",
      scopeLabel: isGeneralEducation
        ? `${course.program?.code ?? ""} - General Education`
        : isMajorSpecific && course.major?.name
          ? `${course.program?.code ?? ""} - ${course.major.name}`
          : `${course.program?.code ?? ""} - Shared Program Course`,
    };
  });

  return { success: true, data: contexts };
}
