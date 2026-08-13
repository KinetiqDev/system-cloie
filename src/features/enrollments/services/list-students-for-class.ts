import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { SystemRole } from "@prisma/client";
import type {
  StudentRecord,
  ListStudentsForClassFilter,
  EnrollmentResult,
} from "../types";

/**
 * List students for a class (program/year/section combination).
 * Used in Phase 6-7 publish flows for targeting.
 */
export async function listStudentsForClass(
  filter: ListStudentsForClassFilter
): Promise<EnrollmentResult<StudentRecord[]>> {
  const authSession = await resolveAuthSession();

  // PH and Faculty can view class rosters
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD, ROLES.FACULTY];
  if (!authSession?.roles?.some((r) => allowedRoles.includes(r))) {
    return { success: false, error: "Access denied." };
  }

  try {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        term_instance_id: filter.termInstanceId,
        program_id: filter.programId,
        year_level: filter.yearLevel,
        is_active: true,
        ...(filter.section ? { section: filter.section } : {}),
        ...(filter.majorId ? { major_id: filter.majorId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
            student_profile: {
              select: {
                student_id_number: true,
              },
            },
          },
        },
        major: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { student: { name: "asc" } },
        { student_user_id: "asc" },
      ],
    });

    const students: StudentRecord[] = enrollments.map((e) => ({
      userId: e.student_user_id,
      email: e.student.email,
      name: e.student.name,
      studentIdNumber: e.student.student_profile?.student_id_number ?? null,
      enrollmentId: e.id,
      majorId: e.major_id,
      majorName: e.major?.name ?? null,
    }));

    return { success: true, data: students };
  } catch (error) {
    return { success: false, error: "Failed to list students for class." };
  }
}
