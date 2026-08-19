import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecretaryProgramSummaryItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  majorNames: string[]; // e.g., ["English", "Mathematics", ...]
  majorCount: number;
  courseCount: number;
  ploCount: number;
  studentCount: number;
  facultyCount: number;
  majors: Array<{ id: string; name: string; is_active: boolean }>;
};

export type SecretaryProgramsKPI = {
  totalPrograms: number;
  activePrograms: number;
  programsWithMajors: number;
  totalMajors: number;
};

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function listSecretaryProgramsSummary(): Promise<{
  programs: SecretaryProgramSummaryItem[];
  kpi: SecretaryProgramsKPI;
}> {
  const rawPrograms = await prisma.program.findMany({
    include: {
      majors: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, is_active: true },
      },
      _count: {
        select: {
          courses: true,
          plos: true,
          student_profiles: true,
          faculty_program_affiliations: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });

  // KPI accumulators
  let activePrograms = 0;
  let programsWithMajors = 0;
  let totalMajors = 0;

  const programs: SecretaryProgramSummaryItem[] = rawPrograms.map((p) => {
    if (p.is_active) activePrograms++;
    if (p.majors.length > 0) programsWithMajors++;
    totalMajors += p.majors.length;

    const activeMajorNames = p.majors.filter((m) => m.is_active).map((m) => m.name);

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      isActive: p.is_active,
      majorNames: activeMajorNames,
      majorCount: p.majors.length,
      courseCount: p._count.courses,
      ploCount: p._count.plos,
      studentCount: p._count.student_profiles,
      facultyCount: p._count.faculty_program_affiliations,
      majors: p.majors,
    };
  });

  return {
    programs,
    kpi: {
      totalPrograms: rawPrograms.length,
      activePrograms,
      programsWithMajors,
      totalMajors,
    },
  };
}
