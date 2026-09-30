import type { EnrollmentSource, YearLevel, StudentSection } from "@prisma/client";

/**
 * Input for creating/updating an enrollment.
 */
export type UpsertEnrollmentInput = {
  studentUserId: string;
  termInstanceId: string;
  programId: string;
  majorId?: string | null;
  yearLevel: YearLevel;
  section?: StudentSection | null;
  source: EnrollmentSource;
};

/**
 * Result of an enrollment operation.
 */
export type EnrollmentResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Student record returned by class lookup.
 */
export type StudentRecord = {
  userId: string;
  email: string;
  /** Opaque canonical account name (ADR 0014). No first/last aliases. */
  name: string;
  enrollmentId: string;
  majorId: string | null;
  majorName: string | null;
};

/**
 * Filter for class lookup.
 */
export type ListStudentsForClassFilter = {
  termInstanceId: string;
  programId: string;
  yearLevel: YearLevel;
  section?: StudentSection | null;
  majorId?: string | null;
};
