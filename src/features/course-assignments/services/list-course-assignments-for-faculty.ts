import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { SystemRole } from "@prisma/client";
import type { CourseAssignmentResult } from "../types";

/**
 * Grouped course assignment for faculty view.
 */
export type FacultyCourseGroup = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  assignments: Array<{
    id: string;
    termLabel: string;
    yearLevel: string;
    section: string | null;
    programCode: string;
  }>;
};

/**
 * List course assignments for a faculty member.
 * Grouped by course with class identity badges.
 */
export async function listCourseAssignmentsForFaculty(
  facultyId?: string
): Promise<CourseAssignmentResult<FacultyCourseGroup[]>> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { success: false, error: "Authentication required." };
  }

  // Check if user has faculty or admin roles
  const allowedRoles: SystemRole[] = [ROLES.FACULTY, ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  const activeRole = authSession.activeRole;
  if (!activeRole || !allowedRoles.includes(activeRole)) {
    return { success: false, error: "Access denied." };
  }

  // If no facultyId provided, use current user's ID
  const targetFacultyId = facultyId ?? authSession.userId;

  // Check if user can view this faculty's assignments
  if (targetFacultyId !== authSession.userId) {
    // Only admin, dean, or program head can view other faculty's assignments
    const adminRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
    if (!activeRole || !adminRoles.includes(activeRole)) {
      return { success: false, error: "Access denied." };
    }
  }

  try {
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        faculty_id: targetFacultyId,
        is_active: true,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        program: {
          select: {
            code: true,
          },
        },
        term_instance: {
          include: {
            school_year: true,
          },
        },
      },
      orderBy: [
        { course: { code: "asc" } },
        { term_instance: { school_year: { start_date: "desc" } } },
      ],
    });

    // Group by course
    const grouped = new Map<string, FacultyCourseGroup>();

    for (const assignment of assignments) {
      const courseId = assignment.course_id;
      
      if (!grouped.has(courseId)) {
        grouped.set(courseId, {
          courseId,
          courseCode: assignment.course?.code ?? "Unknown",
          courseTitle: assignment.course?.title ?? "Unknown Course",
          assignments: [],
        });
      }

      const group = grouped.get(courseId)!;
      group.assignments.push({
        id: assignment.id,
        termLabel: assignment.term_instance?.school_year?.code ?? "Unknown Term",
        yearLevel: assignment.year_level,
        section: assignment.section,
        programCode: assignment.program?.code ?? "Unknown",
      });
    }

    return {
      success: true,
      data: Array.from(grouped.values()),
    };
  } catch {
    return { success: false, error: "Failed to list faculty assignments." };
  }
}
