import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, findUniqueMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: {
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
    },
  },
}));

import { resolveActiveAcademicContext } from "@/features/academic-calendar/services/resolve-active-academic-context";
import {
  getActiveTermId,
  hasActiveTerm,
  resolveActiveTerm,
} from "@/features/academic-calendar/services/resolve-active-term";

const activeTerm = (overrides: Record<string, unknown> = {}) => ({
  id: "period-1",
  semester: "FIRST",
  term: "FIRST_TERM",
  status: "ACTIVE",
  school_year: { id: "sy-1", code: "2025-2026", is_active: true },
  ...overrides,
});

describe("resolveActiveAcademicContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the full context when the school year is active", async () => {
    findFirstMock.mockResolvedValue(activeTerm());

    await expect(resolveActiveAcademicContext()).resolves.toEqual({
      schoolYear: { id: "sy-1", code: "2025-2026" },
      semester: "FIRST",
      assignmentPeriod: { id: "period-1", semester: "FIRST", term: "FIRST_TERM" },
    });
  });

  it("returns null projections when no active period exists", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(resolveActiveAcademicContext()).resolves.toEqual({
      schoolYear: null,
      semester: null,
      assignmentPeriod: null,
    });
  });

  it("returns the period but no school year when the school year is inactive", async () => {
    findFirstMock.mockResolvedValue(
      activeTerm({ school_year: { id: "sy-1", code: "2025-2026", is_active: false } })
    );

    await expect(resolveActiveAcademicContext()).resolves.toEqual({
      schoolYear: null,
      semester: "FIRST",
      assignmentPeriod: { id: "period-1", semester: "FIRST", term: "FIRST_TERM" },
    });
  });

  it("treats the active period as the semester authority on mismatch", async () => {
    findFirstMock.mockResolvedValue(activeTerm({ semester: "SECOND", term: "SECOND_TERM" }));

    await expect(resolveActiveAcademicContext()).resolves.toEqual({
      schoolYear: { id: "sy-1", code: "2025-2026" },
      semester: "SECOND",
      assignmentPeriod: { id: "period-1", semester: "SECOND", term: "SECOND_TERM" },
    });
  });
});

describe("active-term compatibility seams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActiveTermId returns the active period id or null", async () => {
    findFirstMock.mockResolvedValue(activeTerm());
    await expect(getActiveTermId()).resolves.toBe("period-1");

    findFirstMock.mockResolvedValue(null);
    await expect(getActiveTermId()).resolves.toBeNull();
  });

  it("hasActiveTerm mirrors the presence of an active period", async () => {
    findFirstMock.mockResolvedValue(activeTerm());
    await expect(hasActiveTerm()).resolves.toBe(true);

    findFirstMock.mockResolvedValue(null);
    await expect(hasActiveTerm()).resolves.toBe(false);
  });

  it("resolveActiveTerm returns the full context shape and null when inactive", async () => {
    findFirstMock.mockResolvedValue(activeTerm());
    findUniqueMock.mockResolvedValue({
      id: "period-1",
      school_year_id: "sy-1",
      semester: "FIRST",
      term: "FIRST_TERM",
      start_date: null,
      end_date: null,
      status: "ACTIVE",
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      school_year: {
        id: "sy-1",
        code: "2025-2026",
        start_date: null,
        end_date: null,
        is_archived: false,
        archived_at: null,
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-01-01"),
      },
    });

    const context = await resolveActiveTerm();
    expect(context).not.toBeNull();
    expect(context?.schoolYear).toMatchObject({ id: "sy-1", code: "2025-2026" });
    expect(context?.termInstance).toMatchObject({
      id: "period-1",
      schoolYearId: "sy-1",
      semester: "FIRST",
      term: "FIRST_TERM",
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "period-1" },
      include: { school_year: true },
    });

    findFirstMock.mockResolvedValue(null);
    await expect(resolveActiveTerm()).resolves.toBeNull();
  });
});
