import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    curriculumVersion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { getCurriculumVersionDetail, listProgramCurricula } from "@/features/curriculum/services/read-curriculum";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const COURSE_ID = "44444444-4444-4444-8444-444444444444";

const rawVersion = {
  id: VERSION_ID,
  program_id: PROGRAM_ID,
  major_id: null,
  code: "BSIT-2030",
  name: "BSIT 2030",
  status: "DRAFT",
  effective_from_school_year_id: null,
  published_at: null,
  published_by: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

describe("read-curriculum / listProgramCurricula", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists versions of a program mapped to camelCase items", async () => {
    vi.mocked(prisma.curriculumVersion.findMany).mockResolvedValue([rawVersion] as never);

    const result = await listProgramCurricula(PROGRAM_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: VERSION_ID,
      programId: PROGRAM_ID,
      majorId: null,
      code: "BSIT-2030",
      name: "BSIT 2030",
      status: "DRAFT",
      effectiveFromSchoolYearId: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: rawVersion.created_at,
      updatedAt: rawVersion.updated_at,
    });
    expect(prisma.curriculumVersion.findMany).toHaveBeenCalledWith({
      where: { program_id: PROGRAM_ID },
      orderBy: { created_at: "desc" },
    });
  });
});

describe("read-curriculum / getCurriculumVersionDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a version with courses and program/major context", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...rawVersion,
      status: "PUBLISHED",
      major_id: "33333333-3333-4333-8333-333333333333",
      program: { id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" },
      major: { id: "33333333-3333-4333-8333-333333333333", name: "Enterprise Track" },
      courses: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          curriculum_version_id: VERSION_ID,
          course_id: COURSE_ID,
          year_level: YearLevel.FIRST_YEAR,
          semester: AcademicSemester.FIRST,
          term: AcademicTerm.FIRST_TERM,
          course_code_snapshot: "IT101",
          course_title_snapshot: "Intro to Programming",
          created_at: rawVersion.created_at,
          updated_at: rawVersion.updated_at,
        },
      ],
    } as never);

    const result = await getCurriculumVersionDetail(VERSION_ID);

    expect(result).not.toBeNull();
    expect(result?.programId).toBe(PROGRAM_ID);
    expect(result?.program?.code).toBe("BSIT");
    expect(result?.major?.name).toBe("Enterprise Track");
    expect(result?.courses).toEqual([
      {
        id: "55555555-5555-4555-8555-555555555555",
        curriculumVersionId: VERSION_ID,
        courseId: COURSE_ID,
        yearLevel: YearLevel.FIRST_YEAR,
        semester: AcademicSemester.FIRST,
        term: AcademicTerm.FIRST_TERM,
        courseCodeSnapshot: "IT101",
        courseTitleSnapshot: "Intro to Programming",
        createdAt: rawVersion.created_at,
        updatedAt: rawVersion.updated_at,
      },
    ]);
  });

  it("returns null for an unknown version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(null);

    const result = await getCurriculumVersionDetail(VERSION_ID);

    expect(result).toBeNull();
  });

  it("returns a retired version with its courses (historical visibility)", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...rawVersion,
      status: "RETIRED",
      program: { id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" },
      major: null,
      courses: [],
    } as never);

    const result = await getCurriculumVersionDetail(VERSION_ID);

    expect(result?.status).toBe("RETIRED");
    expect(result?.courses).toEqual([]);
  });
});
