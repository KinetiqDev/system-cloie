import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { curriculumVersion: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/db/prisma";
import { getCurriculumVersionDetail } from "@/features/curriculum/services/read-curriculum";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";

const rawVersion = {
  id: VERSION_ID,
  program_id: PROGRAM_ID,
  major_id: null,
  code: "BSIT-2030",
  name: "BSIT 2030",
  status: "PUBLISHED",
  effective_from_school_year_id: null,
  published_at: null,
  published_by: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

describe("read-curriculum / getCurriculumVersionDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns version context and course snapshots", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...rawVersion,
      program: { id: PROGRAM_ID, code: "BSIT", name: "BS Information Technology" },
      major: null,
      courses: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          curriculum_version_id: VERSION_ID,
          course_id: "44444444-4444-4444-8444-444444444444",
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

    expect(result?.programId).toBe(PROGRAM_ID);
    expect(result?.courses[0]?.courseCodeSnapshot).toBe("IT101");
  });

  it("returns null for an unknown version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(null);
    await expect(getCurriculumVersionDetail(VERSION_ID)).resolves.toBeNull();
  });
});
