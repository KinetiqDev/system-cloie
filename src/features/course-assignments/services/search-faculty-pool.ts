import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { SystemRole } from "@prisma/client";
import { MAX_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import type { FacultySearchResult, CourseAssignmentResult } from "../types";

/**
 * Search faculty pool by name or email.
 * Cross-program faculty search with affiliation hints.
 */
export async function searchFacultyPool(
  query: string,
  page: number = 0,
  pageSize: number = 20
): Promise<CourseAssignmentResult<{ items: FacultySearchResult[]; total: number }>> {
  const authSession = await resolveAuthSession();

  // Only PH, Admin, Dean can search faculty pool
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!authSession?.activeRole || !allowedRoles.includes(authSession.activeRole)) {
    return { success: false, error: "Access denied." };
  }

  const effectivePageSize = Math.min(pageSize, MAX_TABLE_PAGE_SIZE);
  const skip = page * effectivePageSize;

  try {
    // Search faculty by name or email
    const where = {
      is_active: true,
      roles: {
        some: {
          role: ROLES.FACULTY,
        },
      },
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [faculty, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          faculty_program_affiliations: {
            where: { is_active: true },
            select: {
              program: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              is_primary: true,
            },
          },
        },
        take: effectivePageSize,
        skip,
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      prisma.user.count({ where }),
    ]);

    const items: FacultySearchResult[] = faculty.map((f) => {
      const affiliations = f.faculty_program_affiliations.map((a) => a.program.name);
      const primaryAffiliation = f.faculty_program_affiliations.find((a) => a.is_primary);

      return {
        id: f.id,
        email: f.email,
        name: f.name,
        primaryAffiliation: primaryAffiliation?.program.name,
        primaryAffiliationCode: primaryAffiliation?.program.code,
        affiliations,
      };
    });

    return {
      success: true,
      data: { items, total },
    };
  } catch {
    return { success: false, error: "Failed to search faculty pool." };
  }
}
