"use server";

import { prisma } from "@/lib/db/prisma";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import type {
  ListSchoolYearsFilter,
  ListSchoolYearsResult,
  SchoolYearWithTerms,
  TermInstanceItem,
} from "../types";

/**
 * List School Years with their term instances.
 * Supports pagination and filtering by archived status.
 */
export async function listSchoolYears(
  filter: ListSchoolYearsFilter = {}
): Promise<ListSchoolYearsResult> {
  const {
    includeArchived = false,
    page = 1,
    pageSize = DEFAULT_TABLE_PAGE_SIZE,
  } = filter;

  const where = includeArchived ? {} : { is_archived: false };

  const [items, total] = await Promise.all([
    prisma.schoolYear.findMany({
      where,
      include: {
        term_instances: {
          orderBy: [
            { semester: "asc" },
            { term: "asc" },
          ],
        },
        archived_by_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.schoolYear.count({ where }),
  ]);

  const mappedItems: SchoolYearWithTerms[] = items.map((sy) => ({
    id: sy.id,
    code: sy.code,
    startDate: sy.start_date,
    endDate: sy.end_date,
    isArchived: sy.is_archived,
    isActive: sy.is_active,
    activeSemester: sy.active_semester,
    archivedAt: sy.archived_at,
    archivedBy: sy.archived_by_user
      ? {
          id: sy.archived_by_user.id,
          firstName: sy.archived_by_user.first_name,
          lastName: sy.archived_by_user.last_name,
        }
      : null,
    createdAt: sy.created_at,
    updatedAt: sy.updated_at,
    termInstances: sy.term_instances.map<TermInstanceItem>((ti) => ({
      id: ti.id,
      schoolYearId: ti.school_year_id,
      schoolYearCode: sy.code,
      semester: ti.semester,
      term: ti.term,
      startDate: ti.start_date,
      endDate: ti.end_date,
      status: ti.status,
      createdAt: ti.created_at,
      updatedAt: ti.updated_at,
    })),
  }));

  return {
    items: mappedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single School Year by ID with its term instances.
 */
export async function getSchoolYearById(
  id: string
): Promise<SchoolYearWithTerms | null> {
  const sy = await prisma.schoolYear.findUnique({
    where: { id },
    include: {
      term_instances: {
        orderBy: [
          { semester: "asc" },
          { term: "asc" },
        ],
      },
      archived_by_user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  if (!sy) return null;

  return {
    id: sy.id,
    code: sy.code,
    startDate: sy.start_date,
    endDate: sy.end_date,
    isArchived: sy.is_archived,
    isActive: sy.is_active,
    activeSemester: sy.active_semester,
    archivedAt: sy.archived_at,
    archivedBy: sy.archived_by_user
      ? {
          id: sy.archived_by_user.id,
          firstName: sy.archived_by_user.first_name,
          lastName: sy.archived_by_user.last_name,
        }
      : null,
    createdAt: sy.created_at,
    updatedAt: sy.updated_at,
    termInstances: sy.term_instances.map<TermInstanceItem>((ti) => ({
      id: ti.id,
      schoolYearId: ti.school_year_id,
      schoolYearCode: sy.code,
      semester: ti.semester,
      term: ti.term,
      startDate: ti.start_date,
      endDate: ti.end_date,
      status: ti.status,
      createdAt: ti.created_at,
      updatedAt: ti.updated_at,
    })),
  };
}
