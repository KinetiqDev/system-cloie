import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const program = {
  id: "11111111-1111-4111-a111-111111111111",
  code: "BSCS",
  name: "Computer Science",
  is_active: false,
  updated_at: new Date("2026-07-11T00:00:00.000Z"),
};

const { counts, prismaMock } = vi.hoisted(() => {
  const counts = {
  major: { count: vi.fn() },
  course: { count: vi.fn() },
  pLO: { count: vi.fn() },
  studentAcademicProfile: { count: vi.fn() },
  studentEnrollment: { count: vi.fn() },
  alumniProfile: { count: vi.fn() },
  courseAssignment: { count: vi.fn() },
  facultyProgramAffiliation: { count: vi.fn() },
  programHeadAssignment: { count: vi.fn() },
  courseBoundEvaluationTarget: { count: vi.fn() },
  centralDeployment: { count: vi.fn() },
  instrumentTemplate: { count: vi.fn() },
  externalStakeholderInvite: { count: vi.fn() },
  industryPartnerProfile: { count: vi.fn() },
  };
  return {
    counts,
    prismaMock: {
       program: { findUnique: vi.fn(), delete: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn(),
      ...counts,
    },
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  deleteProgram,
  preflightProgramDeletion,
  toggleProgramActive,
} from "@/features/academic-structure/services/manage-programs";

function setCounts(value: number) {
  for (const model of Object.values(counts)) {
    for (const method of Object.values(model)) method.mockResolvedValue(value);
  }
}

describe("Program deletion service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCounts(0);
    counts.instrumentTemplate.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
  });

  it("returns inactive state and grouped dependency counts, counting a dual-linked template once", async () => {
    prismaMock.program.findUnique.mockResolvedValue(program);
    counts.major.count.mockResolvedValue(2);
    counts.instrumentTemplate.count
      .mockReset()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result = await preflightProgramDeletion(program.id);

    expect(result).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        isActive: false,
        blockers: { inactive: false, linkedRecords: true },
        dependencies: expect.objectContaining({
          academicSetup: expect.objectContaining({ majors: 2 }),
          evaluation: expect.objectContaining({ instrumentTemplates: 1 }),
        }),
      }),
    }));
  });

  it("counts every direct dependency category", async () => {
    prismaMock.program.findUnique.mockResolvedValue(program);
    counts.major.count.mockResolvedValue(1);
    counts.course.count.mockResolvedValue(2);
    counts.pLO.count.mockResolvedValue(3);
    counts.studentAcademicProfile.count.mockResolvedValue(4);
    counts.studentEnrollment.count.mockResolvedValue(5);
    counts.alumniProfile.count.mockResolvedValue(6);
    counts.courseAssignment.count.mockResolvedValue(7);
    counts.facultyProgramAffiliation.count.mockResolvedValue(8);
    counts.programHeadAssignment.count.mockResolvedValue(9);
    counts.courseBoundEvaluationTarget.count.mockResolvedValue(10);
    counts.centralDeployment.count.mockResolvedValue(11);
    counts.externalStakeholderInvite.count.mockResolvedValue(12);
    counts.industryPartnerProfile.count.mockResolvedValue(13);
    counts.instrumentTemplate.count.mockReset().mockResolvedValue(0);

    const result = await preflightProgramDeletion(program.id);

    expect(result).toHaveProperty("data.dependencies", {
      academicSetup: { majors: 1, courses: 2, plos: 3 },
      peopleAndHistory: { studentProfiles: 4, enrollments: 5, alumniProfiles: 6 },
      teaching: { courseAssignments: 7, facultyAffiliations: 8, programHeadAssignments: 9 },
      evaluation: { evaluationTargets: 10, centralDeployments: 11, instrumentTemplates: 0 },
      externalLinks: { stakeholderInvites: 12, industryPartnerProfiles: 13 },
    });
  });

  it("deletes empty inactive programs inside transaction after revision guard", async () => {
    counts.instrumentTemplate.count.mockReset().mockResolvedValue(0);
    const tx = {
      program: {
        findUnique: vi.fn().mockResolvedValue(program),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn(),
      },
      ...counts,
    };
    prismaMock.$transaction.mockImplementation((callback: (value: unknown) => unknown) => callback(tx));

    const result = await deleteProgram({
      id: program.id,
      confirmationCode: "BSCS",
      revision: program.updated_at.toISOString(),
    });

    expect(result).toEqual({ success: true, data: { id: program.id } });
    expect(tx.program.updateMany).toHaveBeenCalledWith({
      where: { id: program.id, is_active: false, updated_at: program.updated_at },
      data: { updated_at: program.updated_at },
    });
    expect(tx.program.delete).toHaveBeenCalledWith({ where: { id: program.id } });
  });

  it("rejects missing and active programs before deletion", async () => {
    prismaMock.program.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...program, is_active: true });
    expect(await preflightProgramDeletion(program.id)).toEqual({ success: false, error: "Program not found." });

    prismaMock.$transaction.mockImplementationOnce((callback: (value: unknown) => unknown) => callback({
      program: { findUnique: vi.fn().mockResolvedValue({ ...program, is_active: true }) },
    }));
    expect(await deleteProgram({ id: program.id, confirmationCode: "BSCS", revision: program.updated_at.toISOString() })).toEqual({
      success: false,
      error: "Program must be inactive before deletion.",
    });
  });

  it("rejects a stale revision before checking dependencies or deleting", async () => {
    const tx = {
      program: {
        findUnique: vi.fn().mockResolvedValue(program),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        delete: vi.fn(),
      },
      ...counts,
    };
    prismaMock.$transaction.mockImplementation((callback: (value: unknown) => unknown) => callback(tx));

    const result = await deleteProgram({
      id: program.id,
      confirmationCode: program.code,
      revision: "2026-07-10T00:00:00.000Z",
    });

    expect(result).toEqual({ success: false, error: "Program changed after preflight." });
    expect(tx.major.count).not.toHaveBeenCalled();
    expect(tx.program.delete).not.toHaveBeenCalled();
  });

  it("rejects a confirmation mismatch without deleting", async () => {
    counts.instrumentTemplate.count.mockReset().mockResolvedValue(0);
    const tx = {
      program: {
        findUnique: vi.fn().mockResolvedValue(program),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn(),
      },
      ...counts,
    };
    prismaMock.$transaction.mockImplementation((callback: (value: unknown) => unknown) => callback(tx));

    const result = await deleteProgram({
      id: program.id,
      confirmationCode: "bscs",
      revision: program.updated_at.toISOString(),
    });

    expect(result).toEqual({ success: false, error: "Program code confirmation does not match." });
    expect(tx.program.delete).not.toHaveBeenCalled();
  });

  it("returns refreshed blockers when database restriction wins a dependency race", async () => {
    prismaMock.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("blocked", { code: "P2003", clientVersion: "test" }));
    prismaMock.program.findUnique.mockResolvedValue(program);
    counts.course.count.mockResolvedValue(1);

    const result = await deleteProgram({ id: program.id, confirmationCode: "BSCS", revision: program.updated_at.toISOString() });

    expect(result).toEqual(expect.objectContaining({ success: false, error: "Program gained linked records." }));
    expect(result).toHaveProperty("data.dependencies.academicSetup.courses", 1);
  });

  it("rejects stale lifecycle status without overwriting the current status", async () => {
    prismaMock.program.updateMany.mockResolvedValue({ count: 0 });
    const result = await toggleProgramActive(program.id, false, true);

    expect(result).toEqual({ success: false, error: "Program status changed elsewhere." });
    expect(prismaMock.program.updateMany).toHaveBeenCalledWith({
      where: { id: program.id, is_active: true },
      data: { is_active: false },
    });
  });
});
