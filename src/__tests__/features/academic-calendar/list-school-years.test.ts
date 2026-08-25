import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  schoolYear: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";

type FindManyCall = { where: Record<string, unknown> };

const whereOfLastCall = (): Record<string, unknown> => {
  const call = vi.mocked(prismaMock.schoolYear.findMany).mock.calls.at(-1)?.[0] as
    | FindManyCall
    | undefined;
  if (!call) throw new Error("findMany was not called");
  return call.where;
};

describe("listSchoolYears / archived filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prismaMock.schoolYear.findMany).mockResolvedValue([]);
    vi.mocked(prismaMock.schoolYear.count).mockResolvedValue(0);
  });

  it("excludes archived school years by default", async () => {
    await listSchoolYears();

    expect(whereOfLastCall()).toEqual({ is_archived: false });
  });

  it("returns only archived school years with onlyArchived", async () => {
    await listSchoolYears({ onlyArchived: true });

    expect(whereOfLastCall()).toEqual({ is_archived: true });
  });

  it("returns archived and active school years with includeArchived", async () => {
    await listSchoolYears({ includeArchived: true });

    expect(whereOfLastCall()).toEqual({});
  });

  it("counts with the same filter as the listing", async () => {
    await listSchoolYears({ onlyArchived: true });

    expect(vi.mocked(prismaMock.schoolYear.count)).toHaveBeenCalledWith({
      where: { is_archived: true },
    });
  });
});
