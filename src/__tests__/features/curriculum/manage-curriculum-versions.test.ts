import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    curriculumVersion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    curriculumCourse: {
      count: vi.fn(),
    },
    programHeadAssignment: {
      findFirst: vi.fn(),
    },
    major: {
      findFirst: vi.fn(),
    },
  },
}));

import * as authModule from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import {
  cloneCurriculumVersion,
  createCurriculumVersion,
  publishCurriculumVersion,
  retireCurriculumVersion,
} from "@/features/curriculum/services/manage-curriculum-versions";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const MAJOR_ID = "33333333-3333-4333-8333-333333333333";

const secretary = createAuthSessionSnapshot({
  userId: "secretary-1",
  roles: [ROLES.SECRETARY],
});
const programHead = createAuthSessionSnapshot({
  userId: "ph-1",
  roles: [ROLES.PROGRAM_HEAD],
});
const faculty = createAuthSessionSnapshot({
  userId: "faculty-1",
  roles: [ROLES.FACULTY],
});

const publishedVersion = {
  id: VERSION_ID,
  status: "PUBLISHED",
  program_id: PROGRAM_ID,
  major_id: MAJOR_ID,
  code: "BSIT-2026",
  name: "BSIT 2026",
  courses: [
    {
      course_id: "44444444-4444-4444-8444-444444444444",
      year_level: YearLevel.FIRST_YEAR,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
      course_code_snapshot: "IT101",
      course_title_snapshot: "Intro to Programming",
    },
  ],
};

describe("manage-curriculum-versions / createCurriculumVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("creates a DRAFT version for a program", async () => {
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({ id: VERSION_ID } as never);

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result).toEqual({ success: true, data: { id: VERSION_ID } });
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith({
      data: {
        program_id: PROGRAM_ID,
        major_id: null,
        code: "BSIT-2030",
        name: null,
        effective_from_school_year_id: null,
        status: "DRAFT",
      },
      select: { id: true },
    });
  });

  it("accepts an optional major and name", async () => {
    vi.mocked(prisma.major.findFirst).mockResolvedValue({ id: MAJOR_ID } as never);
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({ id: VERSION_ID } as never);

    const result = await createCurriculumVersion({
      programId: PROGRAM_ID,
      majorId: MAJOR_ID,
      code: "BSIT-2030-ENT",
      name: "BSIT 2030",
    });

    expect(result.success).toBe(true);
    expect(prisma.major.findFirst).toHaveBeenCalledWith({
      where: { id: MAJOR_ID, program_id: PROGRAM_ID },
      select: { id: true },
    });
  });

  it("rejects a major that does not belong to the program", async () => {
    vi.mocked(prisma.major.findFirst).mockResolvedValue(null);

    const result = await createCurriculumVersion({
      programId: PROGRAM_ID,
      majorId: MAJOR_ID,
      code: "BSIT-2030",
    });

    expect(result).toEqual({
      success: false,
      error: "Major does not belong to the selected program",
    });
    expect(prisma.curriculumVersion.create).not.toHaveBeenCalled();
  });

  it("rejects a Program Head operating outside their assignment set", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHead);
    vi.mocked(prisma.programHeadAssignment.findFirst).mockResolvedValue(null);

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result).toEqual({
      success: false,
      error: "Program Head access is limited to assigned programs",
    });
    expect(prisma.curriculumVersion.create).not.toHaveBeenCalled();
  });

  it("allows a Program Head assigned to the program", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHead);
    vi.mocked(prisma.programHeadAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({ id: VERSION_ID } as never);

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result.success).toBe(true);
    expect(prisma.programHeadAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        program_head_id: "ph-1",
        program_id: PROGRAM_ID,
        is_active: true,
      },
      select: { id: true },
    });
  });

  it("rejects roles without curriculum write authority", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(faculty);

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result).toEqual({
      success: false,
      error: "Secretary or Program Head access required",
    });
  });

  it("rejects unauthenticated callers", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result).toEqual({ success: false, error: "Authentication is required" });
  });

  it("maps a duplicate code to a friendly error", async () => {
    vi.mocked(prisma.curriculumVersion.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );

    const result = await createCurriculumVersion({ programId: PROGRAM_ID, code: "BSIT-2030" });

    expect(result).toEqual({
      success: false,
      error: 'A curriculum with code "BSIT-2030" already exists for this program',
    });
  });
});

describe("manage-curriculum-versions / publishCurriculumVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("promotes a non-empty DRAFT to PUBLISHED with publish metadata", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "DRAFT",
      program_id: PROGRAM_ID,
    } as never);
    vi.mocked(prisma.curriculumCourse.count).mockResolvedValue(2);
    vi.mocked(prisma.curriculumVersion.updateMany).mockResolvedValue({ count: 1 } as never);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({ success: true, data: { id: VERSION_ID, status: "PUBLISHED" } });
    expect(prisma.curriculumVersion.updateMany).toHaveBeenCalledWith({
      where: { id: VERSION_ID, status: "DRAFT" },
      data: {
        status: "PUBLISHED",
        published_at: expect.any(Date),
        published_by: "secretary-1",
      },
    });
  });

  it("rejects publishing an empty DRAFT", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "DRAFT",
      program_id: PROGRAM_ID,
    } as never);
    vi.mocked(prisma.curriculumCourse.count).mockResolvedValue(0);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "A curriculum must contain at least one course",
    });
    expect(prisma.curriculumVersion.updateMany).not.toHaveBeenCalled();
  });

  it("rejects publishing an already immutable version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "PUBLISHED",
      program_id: PROGRAM_ID,
    } as never);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
  });

  it("rejects unknown versions", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(null);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({ success: false, error: "Curriculum version not found" });
  });

  it("rejects a malformed version ID before touching the database", async () => {
    const result = await publishCurriculumVersion("not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: "Invalid curriculum version ID",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a Program Head publishing outside their assignment set", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHead);
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "DRAFT",
      program_id: PROGRAM_ID,
    } as never);
    vi.mocked(prisma.programHeadAssignment.findFirst).mockResolvedValue(null);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Program Head access is limited to assigned programs",
    });
  });

  it("reports a concurrent transition as a retryable error", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "DRAFT",
      program_id: PROGRAM_ID,
    } as never);
    vi.mocked(prisma.curriculumCourse.count).mockResolvedValue(1);
    vi.mocked(prisma.curriculumVersion.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await publishCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Curriculum version changed; retry the publish",
    });
  });
});

describe("manage-curriculum-versions / retireCurriculumVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("promotes a PUBLISHED version to RETIRED", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "PUBLISHED",
      program_id: PROGRAM_ID,
    } as never);
    vi.mocked(prisma.curriculumVersion.updateMany).mockResolvedValue({ count: 1 } as never);

    const result = await retireCurriculumVersion(VERSION_ID);

    expect(result).toEqual({ success: true, data: { id: VERSION_ID, status: "RETIRED" } });
    expect(prisma.curriculumVersion.updateMany).toHaveBeenCalledWith({
      where: { id: VERSION_ID, status: "PUBLISHED" },
      data: { status: "RETIRED" },
    });
  });

  it("rejects retiring a DRAFT", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "DRAFT",
      program_id: PROGRAM_ID,
    } as never);

    const result = await retireCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Only published curricula can be retired",
    });
  });

  it("rejects retiring an already RETIRED version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      id: VERSION_ID,
      status: "RETIRED",
      program_id: PROGRAM_ID,
    } as never);

    const result = await retireCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Published curricula are immutable",
    });
  });

  it("rejects a malformed version ID before touching the database", async () => {
    const result = await retireCurriculumVersion("not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: "Invalid curriculum version ID",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("manage-curriculum-versions / cloneCurriculumVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
    vi.mocked(prisma.$transaction).mockImplementation((callback) =>
      callback(prisma as never)
    );
  });

  it("clones a PUBLISHED version into a new DRAFT with identical courses", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(publishedVersion as never);
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      code: "BSIT-2026-COPY",
    } as never);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: true,
      data: { id: "55555555-5555-4555-8555-555555555555", code: "BSIT-2026-COPY" },
    });
    expect(prisma.curriculumVersion.create).toHaveBeenCalledWith({
      data: {
        program_id: PROGRAM_ID,
        major_id: MAJOR_ID,
        code: "BSIT-2026-COPY",
        name: "BSIT 2026",
        status: "DRAFT",
        courses: {
          create: [
            {
              course_id: publishedVersion.courses[0].course_id,
              year_level: publishedVersion.courses[0].year_level,
              semester: publishedVersion.courses[0].semester,
              term: publishedVersion.courses[0].term,
              course_code_snapshot: "IT101",
              course_title_snapshot: "Intro to Programming",
            },
          ],
        },
      },
      select: { id: true, code: true },
    });
  });

  it("clones a RETIRED version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...publishedVersion,
      status: "RETIRED",
    } as never);
    vi.mocked(prisma.curriculumVersion.create).mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      code: "BSIT-2026-COPY",
    } as never);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result.success).toBe(true);
  });

  it("rejects cloning a DRAFT version", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue({
      ...publishedVersion,
      status: "DRAFT",
    } as never);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Only published or retired curricula can be cloned",
    });
    expect(prisma.curriculumVersion.create).not.toHaveBeenCalled();
  });

  it("rejects unknown versions", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(null);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result).toEqual({ success: false, error: "Curriculum version not found" });
  });

  it("rejects a malformed version ID before touching the database", async () => {
    const result = await cloneCurriculumVersion("not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: "Invalid curriculum version ID",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("falls back to a suffixed code when the clone code is taken", async () => {
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(publishedVersion as never);
    vi.mocked(prisma.curriculumVersion.create)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
      )
      .mockResolvedValueOnce({
        id: "55555555-5555-4555-8555-555555555555",
        code: "BSIT-2026-COPY-2",
      } as never);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result.success).toBe(true);
    expect(prisma.curriculumVersion.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "BSIT-2026-COPY-2" }),
      })
    );
  });

  it("rejects a Program Head cloning outside their assignment set", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHead);
    vi.mocked(prisma.curriculumVersion.findUnique).mockResolvedValue(publishedVersion as never);
    vi.mocked(prisma.programHeadAssignment.findFirst).mockResolvedValue(null);

    const result = await cloneCurriculumVersion(VERSION_ID);

    expect(result).toEqual({
      success: false,
      error: "Program Head access is limited to assigned programs",
    });
  });
});
