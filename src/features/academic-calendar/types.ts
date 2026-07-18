import { AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";

/**
 * Represents a School Year entity.
 */
export interface SchoolYearItem {
  id: string;
  code: string;
  startDate: Date | null;
  endDate: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a School Year with its term instances.
 */
export interface SchoolYearWithTerms extends SchoolYearItem {
  termInstances: TermInstanceItem[];
}

/**
 * Represents an Academic Term Instance entity.
 */
export interface TermInstanceItem {
  id: string;
  schoolYearId: string;
  schoolYearCode: string;
  semester: AcademicSemester;
  term: AcademicTerm | null;
  startDate: Date | null;
  endDate: Date | null;
  status: AcademicPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context returned by resolveActiveTerm().
 */
export interface ActiveTermContext {
  schoolYear: SchoolYearItem;
  termInstance: TermInstanceItem;
}

/**
 * Input for creating a School Year.
 */
export interface CreateSchoolYearInput {
  startYear: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Input for updating a School Year.
 */
export interface UpdateSchoolYearInput {
  id: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Input for creating a Term Instance.
 */
export interface CreateTermInstanceInput {
  schoolYearId: string;
  semester: AcademicSemester;
  term?: AcademicTerm | null;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Input for updating a Term Instance.
 */
export interface UpdateTermInstanceInput {
  id: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Input for setting the active term instance.
 */
export interface SetActiveTermInput {
  termInstanceId: string;
}

/**
 * Filter options for listing School Years.
 */
export interface ListSchoolYearsFilter {
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Result of listing School Years.
 */
export interface ListSchoolYearsResult {
  items: SchoolYearWithTerms[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
