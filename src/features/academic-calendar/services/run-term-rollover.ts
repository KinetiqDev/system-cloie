"use server";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { YearLevel, EnrollmentSource } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RolloverExceptionType = "GRADUATING" | "MISSING_DATA" | "DUPLICATE";

export type RolloverException = {
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  exceptionType: RolloverExceptionType;
  currentYearLevel: YearLevel;
  message: string;
};

export type RolloverResult =
  | {
      success: true;
      data: {
        processedCount: number;
        createdCount: number;
        skippedCount: number;
        exceptions: RolloverException[];
      };
    }
  | { success: false; error: string };

export type RunTermRolloverInput = {
  sourceTermInstanceId: string;
  targetTermInstanceId: string;
};

// ─── Cohort Promotion Map ────────────────────────────────────────────────────

const YEAR_LEVEL_PROMOTION: Record<YearLevel, YearLevel | null> = {
  FIRST_YEAR: "SECOND_YEAR",
  SECOND_YEAR: "THIRD_YEAR",
  THIRD_YEAR: "FOURTH_YEAR",
  FOURTH_YEAR: null, // Graduating
};

// ─── Main Service ──────────────────────────────────────────────────────────────

/**
 * Run term rollover: create next-term enrollments for active students.
 * Idempotent - safe to run multiple times.
 */
export async function runTermRollover({
  sourceTermInstanceId,
  targetTermInstanceId,
}: RunTermRolloverInput): Promise<RolloverResult> {
  // 1. Verify admin access
  const authSession = await resolveAuthSession();

  if (!authSession?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Admin access required." };
  }

  // 2. Validate source and target terms
  const [sourceTerm, targetTerm] = await Promise.all([
    prisma.academicTermInstance.findUnique({
      where: { id: sourceTermInstanceId },
      include: { school_year: true },
    }),
    prisma.academicTermInstance.findUnique({
      where: { id: targetTermInstanceId },
      include: { school_year: true },
    }),
  ]);

  if (!sourceTerm) {
    return { success: false, error: "Source term instance not found." };
  }

  if (!targetTerm) {
    return { success: false, error: "Target term instance not found." };
  }

  if (sourceTerm.school_year.is_archived || targetTerm.school_year.is_archived) {
    return { success: false, error: "Cannot rollover from/to archived school years." };
  }

  // Year levels advance only between School Years. A transition within the
  // same School Year (First Term -> Second Term, or semester to semester)
  // carries each student's year level unchanged.
  const sameSchoolYear = sourceTerm.school_year.id === targetTerm.school_year.id;

  // 3. Fetch active enrollments from source term
  const sourceEnrollments = await prisma.studentEnrollment.findMany({
    where: {
      term_instance_id: sourceTermInstanceId,
      is_active: true,
    },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      student: { last_name: "asc" },
    },
  });

  // 4. Check for existing enrollments in target term (idempotency)
  const existingTargetEnrollments = await prisma.studentEnrollment.findMany({
    where: {
      term_instance_id: targetTermInstanceId,
      student_user_id: { in: sourceEnrollments.map((e) => e.student_user_id) },
    },
    select: { student_user_id: true },
  });

  const existingStudentIds = new Set(existingTargetEnrollments.map((e) => e.student_user_id));

  // 5. Process each enrollment
  const exceptions: RolloverException[] = [];
  const enrollmentsToCreate: Array<{
    student_user_id: string;
    term_instance_id: string;
    program_id: string;
    major_id: string | null;
    year_level: YearLevel;
    section: import("@prisma/client").StudentSection | null;
    source: EnrollmentSource;
    is_active: boolean;
  }> = [];

  for (const enrollment of sourceEnrollments) {
    const student = enrollment.student;
    const nextYearLevel = sameSchoolYear
      ? enrollment.year_level
      : YEAR_LEVEL_PROMOTION[enrollment.year_level];

    // Check for graduating students (4th year)
    if (nextYearLevel === null) {
      exceptions.push({
        studentUserId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        exceptionType: "GRADUATING",
        currentYearLevel: enrollment.year_level,
        message: "Student is in 4th year and marked for graduation.",
      });
      continue;
    }

    // Check for missing program/major data
    if (!enrollment.program_id) {
      exceptions.push({
        studentUserId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        exceptionType: "MISSING_DATA",
        currentYearLevel: enrollment.year_level,
        message: "Missing program assignment.",
      });
      continue;
    }

    // Check if already enrolled in target term (idempotency)
    if (existingStudentIds.has(enrollment.student_user_id)) {
      continue; // Skip - already exists
    }

    // Prepare enrollment for creation
    enrollmentsToCreate.push({
      student_user_id: enrollment.student_user_id,
      term_instance_id: targetTermInstanceId,
      program_id: enrollment.program_id,
      major_id: enrollment.major_id,
      year_level: nextYearLevel,
      section: enrollment.section,
      source: "ROLLOVER" as EnrollmentSource,
      is_active: true,
    });
  }

  // 6. Create enrollments in transaction
  let createdCount = 0;

  if (enrollmentsToCreate.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        // Use createMany for efficiency
        const result = await tx.studentEnrollment.createMany({
          data: enrollmentsToCreate,
          skipDuplicates: true, // Extra safety for idempotency
        });

        createdCount = result.count;
      });
    } catch (error) {
      console.error("Rollover transaction failed:", error);
      return { success: false, error: "Failed to create enrollments. Please try again." };
    }
  }

  // 7. Return results
  const skippedCount = existingStudentIds.size;
  const processedCount = sourceEnrollments.length;

  return {
    success: true,
    data: {
      processedCount,
      createdCount,
      skippedCount,
      exceptions,
    },
  };
}

// ─── Preview Rollover (Dry Run) ──────────────────────────────────────────────

export type PreviewRolloverResult =
  | {
      success: true;
      data: {
        wouldProcessCount: number;
        wouldCreateCount: number;
        wouldSkipCount: number;
        exceptions: RolloverException[];
      };
    }
  | { success: false; error: string };

/**
 * Preview rollover without creating enrollments.
 */
export async function previewTermRollover({
  sourceTermInstanceId,
  targetTermInstanceId,
}: RunTermRolloverInput): Promise<PreviewRolloverResult> {
  // 1. Verify admin access
  const authSession = await resolveAuthSession();

  if (!authSession?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Admin access required." };
  }

  // 2. Validate terms
  const [sourceTerm, targetTerm] = await Promise.all([
    prisma.academicTermInstance.findUnique({
      where: { id: sourceTermInstanceId },
      include: { school_year: { select: { id: true, is_archived: true } } },
    }),
    prisma.academicTermInstance.findUnique({
      where: { id: targetTermInstanceId },
      include: { school_year: { select: { id: true, is_archived: true } } },
    }),
  ]);

  if (!sourceTerm || !targetTerm) {
    return { success: false, error: "Term instance not found." };
  }

  if (sourceTerm.school_year.is_archived || targetTerm.school_year.is_archived) {
    return { success: false, error: "Cannot rollover from/to archived school years." };
  }

  // Year levels advance only between School Years; within one School Year the
  // year level is carried over unchanged.
  const sameSchoolYear = sourceTerm.school_year.id === targetTerm.school_year.id;

  // 3. Fetch source enrollments
  const sourceEnrollments = await prisma.studentEnrollment.findMany({
    where: {
      term_instance_id: sourceTermInstanceId,
      is_active: true,
    },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  // 4. Check existing target enrollments
  const existingTargetEnrollments = await prisma.studentEnrollment.findMany({
    where: {
      term_instance_id: targetTermInstanceId,
      student_user_id: { in: sourceEnrollments.map((e) => e.student_user_id) },
    },
    select: { student_user_id: true },
  });

  const existingStudentIds = new Set(existingTargetEnrollments.map((e) => e.student_user_id));

  // 5. Simulate processing
  const exceptions: RolloverException[] = [];
  let wouldCreateCount = 0;

  for (const enrollment of sourceEnrollments) {
    const student = enrollment.student;
    const nextYearLevel = sameSchoolYear
      ? enrollment.year_level
      : YEAR_LEVEL_PROMOTION[enrollment.year_level];

    if (nextYearLevel === null) {
      exceptions.push({
        studentUserId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        exceptionType: "GRADUATING",
        currentYearLevel: enrollment.year_level,
        message: "Student is in 4th year and marked for graduation.",
      });
      continue;
    }

    if (!enrollment.program_id) {
      exceptions.push({
        studentUserId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        exceptionType: "MISSING_DATA",
        currentYearLevel: enrollment.year_level,
        message: "Missing program assignment.",
      });
      continue;
    }

    if (existingStudentIds.has(enrollment.student_user_id)) {
      continue; // Would skip
    }

    wouldCreateCount++;
  }

  return {
    success: true,
    data: {
      wouldProcessCount: sourceEnrollments.length,
      wouldCreateCount,
      wouldSkipCount: existingStudentIds.size,
      exceptions,
    },
  };
}
