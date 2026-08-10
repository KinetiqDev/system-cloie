import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    program: { upsert: vi.fn() },
    major: { upsert: vi.fn() },
    course: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { seedFoundation } from "../../../../prisma/seed/runners/seed-foundation";

describe("seed-foundation course reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.course.findMany.mockResolvedValue([]);
    prisma.program.upsert.mockImplementation(async ({ where }: { where: { code: string } }) => ({
      id: `program-${where.code}`,
      code: where.code,
    }));
    prisma.major.upsert.mockImplementation(async ({ where }: { where: { program_id_name: { name: string } } }) => ({
      id: `major-${where.program_id_name.name}`,
    }));
    prisma.course.upsert.mockImplementation(async ({ where }: { where: { code: string } }) => ({
      id: `course-${where.code}`,
      code: where.code,
      title: where.code,
    }));
    prisma.course.updateMany.mockResolvedValue({ count: 1 });
  });

  it("reconciles only courses carrying immutable seed provenance", async () => {
    await seedFoundation();

    const managedCourseCreate = prisma.course.upsert.mock.calls[0][0].create;
    expect(managedCourseCreate).toEqual(expect.objectContaining({ seed_source: "ACD_DEMO_CATALOG" }));
    expect(prisma.course.updateMany).toHaveBeenCalledWith({
      where: {
        is_active: true,
        seed_source: "ACD_DEMO_CATALOG",
        NOT: expect.objectContaining({ code: expect.any(Object) }),
      },
      data: { is_active: false },
    });

    const filter = prisma.course.updateMany.mock.calls[0][0].where;
    expect(filter).not.toHaveProperty("description");
  });

  it("fails closed when a fixture code belongs to an unprovenanced course", async () => {
    prisma.course.findMany.mockResolvedValue([{ code: "IT101" }]);

    await expect(seedFoundation()).rejects.toThrow(
      "unprovenanced course code collision: IT101"
    );
    expect(prisma.program.upsert).not.toHaveBeenCalled();
    expect(prisma.course.upsert).not.toHaveBeenCalled();
  });
});
