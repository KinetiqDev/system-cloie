"use server";

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { ActiveAcademicContext } from "../types";

/**
 * Resolve the active academic context: the active School Year, the active
 * Semester, and the ACTIVE assignment period in a single read.
 *
 * Uses React.cache for per-request memoization. Null-safe: when no ACTIVE
 * period exists every projection is null. The School Year is only reported
 * when its `is_active` flag is set — an ACTIVE period in an inactive School
 * Year still resolves the period, but not the School Year (the period's
 * semester is the authority for the `semester` projection).
 */
export const resolveActiveAcademicContext = cache(async (): Promise<ActiveAcademicContext> => {
  const termInstance = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    include: {
      school_year: { select: { id: true, code: true, is_active: true } },
    },
  });

  if (!termInstance) {
    return { schoolYear: null, semester: null, assignmentPeriod: null };
  }

  return {
    schoolYear: termInstance.school_year.is_active
      ? { id: termInstance.school_year.id, code: termInstance.school_year.code }
      : null,
    semester: termInstance.semester,
    assignmentPeriod: {
      id: termInstance.id,
      semester: termInstance.semester,
      term: termInstance.term,
    },
  };
});
