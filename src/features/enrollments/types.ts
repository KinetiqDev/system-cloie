import type { EnrollmentSource, YearLevel, StudentSection } from "@prisma/client";

/**
 * Student enrollment record with related data.
 */
export type EnrollmentItem = {
  id: string;
  studentUserId: string;
  termInstanceId: string;
  programId: string;
  majorId: string | null;
  yearLevel: YearLevel;
  section: StudentSection | null;
  source: EnrollmentSource;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Hydrated fields
  studentName?: string;
  termLabel?: string;
  programCode?: string;
  majorName?: string | null;
};

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
 * Input for admin creating/updating an enrollment (same as UpsertEnrollmentInput).
 */
export type AdminUpsertEnrollmentInput = UpsertEnrollmentInput;

/**
 * Result of an enrollment operation.
 */
export type EnrollmentResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Filter options for listing enrollments.
 */
export type ListEnrollmentsFilter = {
  studentUserId?: string;
  termInstanceId?: string;
  programId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  isActive?: boolean;
};

/**
 * Pagination options for enrollment lists.
 */
export type ListEnrollmentsOptions = {
  page?: number;
  pageSize?: number;
};

/**
 * Result of listing enrollments.
 */
export type ListEnrollmentsResult = {
  items: EnrollmentItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Student record returned by class lookup.
 */
export type StudentRecord = {
  userId: string;
  email: string;
  /** Opaque canonical account name (ADR 0014). No first/last aliases. */
  name: string;
  studentIdNumber: string | null;
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
