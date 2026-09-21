import { CourseScope } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveFacultyCourseContextScope } from "@/features/evaluations/services/resolve-faculty-course-context-scope";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import type { ProgramGoOption } from "../types";

/**
 * The Graduate Outcome catalog a Course-bound template editor may bind to,
 * plus why that catalog is unavailable when it is.
 *
 * `general-education` carries the rule rather than an empty list: a General
 * Education Course has no owning Program and its CILOs align to Institutional
 * Outcomes, so the builder explains the boundary instead of showing an empty
 * picker (ADR 0005, ADR 0031). A program-specific Course whose Program simply
 * has no active GOs reports an empty list with no reason, because that is a
 * catalog state the Program Head can change.
 */
export type FacultyCourseGoOptions = {
  items: ProgramGoOption[];
  unavailableReason: "general-education" | null;
};

/**
 * Resolves the active Graduate Outcomes of the bound Course's owning Program
 * for one authorized Faculty Course context. The Course scope and Program are
 * read from the Course record, never from the client payload, so a crafted
 * request cannot widen the pool to another Program's catalog.
 */
export async function listFacultyCourseGoOptions(context: {
  courseId: string;
  majorId: string | null;
  programId: string;
}): Promise<ServiceResult<FacultyCourseGoOptions>> {
  const authSession = await resolveAuthSession();

  if (authSession?.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty authentication is required." };
  }

  const scopedContext = await resolveFacultyCourseContextScope(context);

  if (!scopedContext) {
    return {
      success: false,
      error: "You do not have permission to manage this course context.",
    };
  }

  const course = await prisma.course.findUnique({
    where: { id: scopedContext.courseId },
    select: { course_scope: true, program_id: true },
  });

  if (!course) {
    return { success: false, error: "Selected course is unavailable." };
  }

  if (course.course_scope === CourseScope.GENERAL_EDUCATION) {
    return { success: true, data: { items: [], unavailableReason: "general-education" } };
  }

  if (!course.program_id) {
    return { success: true, data: { items: [], unavailableReason: null } };
  }

  const items = await prisma.gO.findMany({
    where: { program_id: course.program_id, is_active: true },
    orderBy: [{ order: "asc" }, { code: "asc" }],
    select: { id: true, code: true, description: true },
  });

  return { success: true, data: { items, unavailableReason: null } };
}
