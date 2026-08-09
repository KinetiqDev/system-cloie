"use server";

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { ActiveTermContext } from "../types";
import { resolveActiveAcademicContext } from "./resolve-active-academic-context";

/**
 * Resolve the currently active Academic Period.
 * Uses React.cache for per-request memoization.
 * Returns null if no ACTIVE period is set.
 */
export const resolveActiveTerm = cache(async (): Promise<ActiveTermContext | null> => {
  const context = await resolveActiveAcademicContext();
  if (!context.assignmentPeriod) {
    return null;
  }

  const termInstance = await prisma.academicTermInstance.findUnique({
    where: { id: context.assignmentPeriod.id },
    include: {
      school_year: true,
    },
  });

  if (!termInstance) {
    return null;
  }

  return {
    schoolYear: {
      id: termInstance.school_year.id,
      code: termInstance.school_year.code,
      startDate: termInstance.school_year.start_date,
      endDate: termInstance.school_year.end_date,
      isArchived: termInstance.school_year.is_archived,
      archivedAt: termInstance.school_year.archived_at,
      archivedBy: null, // Not needed for active term context
      createdAt: termInstance.school_year.created_at,
      updatedAt: termInstance.school_year.updated_at,
    },
    termInstance: {
      id: termInstance.id,
      schoolYearId: termInstance.school_year_id,
      schoolYearCode: termInstance.school_year.code,
      semester: termInstance.semester,
      term: termInstance.term,
      startDate: termInstance.start_date,
      endDate: termInstance.end_date,
      status: termInstance.status,
      createdAt: termInstance.created_at,
      updatedAt: termInstance.updated_at,
    },
  };
});

/**
 * Check if an active period is configured.
 */
export async function hasActiveTerm(): Promise<boolean> {
  const context = await resolveActiveAcademicContext();
  return context.assignmentPeriod !== null;
}

/**
 * Get the active period ID, or null if none exists.
 */
export async function getActiveTermId(): Promise<string | null> {
  const context = await resolveActiveAcademicContext();
  return context.assignmentPeriod?.id ?? null;
}
