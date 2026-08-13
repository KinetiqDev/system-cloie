import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import type {
  EnrollmentItem,
  ListEnrollmentsFilter,
  ListEnrollmentsOptions,
  ListEnrollmentsResult,
  EnrollmentResult,
} from "../types";

/**
 * List enrollments with optional filtering.
 */
export async function listEnrollments(
  filter: ListEnrollmentsFilter,
  options?: ListEnrollmentsOptions
): Promise<EnrollmentResult<ListEnrollmentsResult>> {
  const authSession = await resolveAuthSession();

  if (!authSession?.roles?.includes(ROLES.SECRETARY)) {
    // Non-admins can only view their own enrollments
    if (filter.studentUserId !== authSession?.userId) {
      return { success: false, error: "Access denied." };
    }
  }

  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;

  const where = {
    ...(filter.studentUserId && { student_user_id: filter.studentUserId }),
    ...(filter.termInstanceId && { term_instance_id: filter.termInstanceId }),
    ...(filter.programId && { program_id: filter.programId }),
    ...(filter.yearLevel && { year_level: filter.yearLevel }),
    ...(filter.section && { section: filter.section }),
    ...(filter.isActive !== undefined && { is_active: filter.isActive }),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where,
        include: {
          student: {
            select: {
              name: true,
            },
          },
          term: {
            include: {
              school_year: true,
            },
          },
          program: {
            select: {
              code: true,
              name: true,
            },
          },
          major: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: pageSize,
        skip: page * pageSize,
      }),
      prisma.studentEnrollment.count({ where }),
    ]);

    const mappedItems: EnrollmentItem[] = items.map((e) => ({
      id: e.id,
      studentUserId: e.student_user_id,
      termInstanceId: e.term_instance_id,
      programId: e.program_id,
      majorId: e.major_id,
      yearLevel: e.year_level,
      section: e.section,
      source: e.source,
      isActive: e.is_active,
      createdBy: e.created_by,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      studentName: e.student?.name,
      termLabel: e.term?.school_year?.code,
      programCode: e.program?.code,
      majorName: e.major?.name ?? null,
    }));

    return {
      success: true,
      data: {
        items: mappedItems,
        total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to list enrollments." };
  }
}

/**
 * List enrollments for a specific user.
 */
export async function listEnrollmentsForUser(
  userId: string,
  options?: ListEnrollmentsOptions
): Promise<EnrollmentResult<ListEnrollmentsResult>> {
  return listEnrollments({ studentUserId: userId }, options);
}

/**
 * List enrollments for a specific term.
 */
export async function listEnrollmentsForTerm(
  termInstanceId: string,
  options?: ListEnrollmentsOptions
): Promise<EnrollmentResult<ListEnrollmentsResult>> {
  const authSession = await resolveAuthSession();

  if (!authSession?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Admin access required." };
  }

  return listEnrollments({ termInstanceId }, options);
}
