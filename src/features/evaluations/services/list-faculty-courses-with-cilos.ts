import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FacultyCourseReadiness = "missing-cilos" | "incomplete-mapping" | "ready";

export type FacultyCourseWithCiloCount = {
  id: string;
  code: string;
  title: string;
  courseScope: CourseScope;
  courseScopeLabel: string;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorId: string | null;
  majorName: string | null;
  ciloCount: number;
  readiness: FacultyCourseReadiness;
  coveredCiloCount: number;
};

export type FacultyCourseWithCilosResult = ServiceResult<{
  courses: FacultyCourseWithCiloCount[];
  programs: Array<{ id: string; code: string; name: string }>;
}>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

import { resolveFacultyCourseIds } from "./resolve-faculty-course-ids";

/**
 * List faculty courses with CILO counts.
 * If termInstanceId is provided, returns courses assigned to faculty for that term.
 * Otherwise, falls back to program-affiliated courses (legacy behavior).
 */
export async function listFacultyCoursesWithCilos(
  termInstanceId?: string
): Promise<FacultyCourseWithCilosResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty authentication is required." };
  }

  const courseIds = await resolveFacultyCourseIds(session.userId, termInstanceId);

  if (courseIds.length === 0) {
    return {
      success: true,
      data: {
        courses: [],
        programs: [],
      },
    };
  }

  // Fetch full course details with CILO counts
  const [rawCourses, activeIloIds, activePlos, ciloRows] = await Promise.all([
    prisma.course.findMany({
      where: {
        id: { in: courseIds },
        is_active: true,
      },
      include: {
        program: { select: { id: true, code: true, name: true } },
        major: { select: { id: true, name: true } },
        _count: { select: { cilos: { where: { is_active: true } } } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.institutionalOutcome.findMany({
      where: { is_active: true },
      select: { id: true },
    }),
    prisma.pLO.findMany({
      where: { is_active: true },
      select: { id: true, program_id: true },
    }),
    prisma.cILO.findMany({
      where: { course_id: { in: courseIds }, is_active: true },
      select: {
        id: true,
        course_id: true,
        cilo_mappings: { select: { plo_id: true, manifestation: true } },
        cilo_institutional_outcome_mappings: {
          select: { institutional_outcome_id: true, manifestation: true },
        },
      },
    }),
  ]);

  const activeIloIdSet = new Set(activeIloIds.map((row) => row.id));
  const plosByProgram = new Map<string, Set<string>>();
  for (const plo of activePlos) {
    const set = plosByProgram.get(plo.program_id) ?? new Set<string>();
    set.add(plo.id);
    plosByProgram.set(plo.program_id, set);
  }
  const cilosByCourse = new Map<string, typeof ciloRows>();
  for (const row of ciloRows) {
    const list = cilosByCourse.get(row.course_id) ?? [];
    list.push(row);
    cilosByCourse.set(row.course_id, list);
  }

  // Build unique programs list
  const programsMap = new Map<string, { id: string; code: string; name: string }>();
  rawCourses.forEach((c) => {
    if (c.program) {
      programsMap.set(c.program.id, c.program);
    }
  });

  const courses: FacultyCourseWithCiloCount[] = rawCourses.map((c) => {
    const { readiness, coveredCiloCount } = getCourseReadiness({
      courseScope: c.course_scope,
      programId: c.program?.id ?? null,
      courseCilos: cilosByCourse.get(c.id) ?? [],
      activeIloIdSet,
      plosByProgram,
    });

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      courseScope: c.course_scope,
      courseScopeLabel: getCourseScopeLabel(c.course_scope, c.major_id),
      programId: c.program?.id ?? null,
      programCode: c.program?.code ?? null,
      programName: c.program?.name ?? null,
      majorId: c.major?.id ?? null,
      majorName: c.major?.name ?? null,
      ciloCount: c._count.cilos,
      readiness,
      coveredCiloCount,
    };
  });

  return {
    success: true,
    data: {
      courses,
      programs: Array.from(programsMap.values()),
    },
  };
}

function getCourseScopeLabel(courseScope: CourseScope, majorId: string | null): string {
  if (courseScope === CourseScope.GENERAL_EDUCATION) return "General Education";
  if (majorId) return "Major-Specific";
  return "Program-Specific";
}

type FacultyCiloReadinessRow = {
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome_id: string;
    manifestation: string | null;
  }>;
  cilo_mappings: Array<{ plo_id: string; manifestation: string | null }>;
};

function getCourseReadiness({
  courseScope,
  programId,
  courseCilos,
  activeIloIdSet,
  plosByProgram,
}: {
  courseScope: CourseScope;
  programId: string | null;
  courseCilos: FacultyCiloReadinessRow[];
  activeIloIdSet: Set<string>;
  plosByProgram: Map<string, Set<string>>;
}): Pick<FacultyCourseWithCiloCount, "readiness" | "coveredCiloCount"> {
  if (courseCilos.length === 0) {
    return { readiness: "missing-cilos", coveredCiloCount: 0 };
  }

  if (courseScope === CourseScope.GENERAL_EDUCATION) {
    const coveredCiloCount = courseCilos.filter((cilo) =>
      cilo.cilo_institutional_outcome_mappings.some(
        (mapping) =>
          mapping.manifestation !== null && activeIloIdSet.has(mapping.institutional_outcome_id)
      )
    ).length;
    return {
      readiness: coveredCiloCount === courseCilos.length ? "ready" : "incomplete-mapping",
      coveredCiloCount,
    };
  }

  const programPlos = programId ? (plosByProgram.get(programId) ?? new Set<string>()) : new Set();
  if (programPlos.size === 0) {
    return { readiness: "incomplete-mapping", coveredCiloCount: 0 };
  }

  const coveredCiloCount = courseCilos.filter((cilo) =>
    [...programPlos].every((ploId) =>
      cilo.cilo_mappings.some(
        (mapping) => mapping.plo_id === ploId && mapping.manifestation !== null
      )
    )
  ).length;

  return {
    readiness: coveredCiloCount === courseCilos.length ? "ready" : "incomplete-mapping",
    coveredCiloCount,
  };
}
