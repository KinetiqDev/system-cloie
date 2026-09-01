import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGenEdDashboard } from "@/features/course-assignments/services/read-gen-ed-dashboard";

const {
  resolveAuthSessionMock,
  resolveActiveAcademicContextMock,
  getEvidencePulseMock,
  prismaMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  resolveActiveAcademicContextMock: vi.fn(),
  getEvidencePulseMock: vi.fn(),
  prismaMock: {
    course: { count: vi.fn() },
    courseAssignment: { count: vi.fn(), groupBy: vi.fn() },
    program: { count: vi.fn() },
    cILO: { count: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-calendar/services/resolve-active-academic-context", () => ({
  resolveActiveAcademicContext: resolveActiveAcademicContextMock,
}));
vi.mock("@/features/analytics/services/general-education-dashboard-evidence", () => ({
  getGeneralEducationDashboardEvidence: getEvidencePulseMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("getGenEdDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "coord-1",
      activeRole: "GEN_ED_COORDINATOR",
      roles: ["GEN_ED_COORDINATOR"],
    });
    resolveActiveAcademicContextMock.mockResolvedValue({
      schoolYear: { id: "sy-1", code: "2026-2027" },
      semester: "FIRST",
      assignmentPeriod: { id: "term-1", semester: "FIRST", term: "FIRST_TERM" },
    });
    getEvidencePulseMock.mockResolvedValue({
      submittedResponseCount: 42,
      evaluationOpportunityCount: 58,
      responseRate: 42 / 58,
      ratingCount: 120,
      meanRating: 4.18,
    });
    prismaMock.courseAssignment.count.mockResolvedValue(5);
    prismaMock.courseAssignment.groupBy.mockResolvedValue([{ program_id: "p1", _count: 2 }]);
    prismaMock.course.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    prismaMock.program.count.mockResolvedValue(3);
    prismaMock.cILO.count.mockResolvedValue(2);
  });

  it("rejects unauthenticated callers before querying", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(getGenEdDashboard()).rejects.toThrow("Authentication required");
    expect(prismaMock.course.count).not.toHaveBeenCalled();
    expect(getEvidencePulseMock).not.toHaveBeenCalled();
  });

  it("rejects non-coordinators before querying", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "u",
      activeRole: "PROGRAM_HEAD",
      roles: ["PROGRAM_HEAD"],
    });

    await expect(getGenEdDashboard()).rejects.toThrow(
      "General Education Coordinator access required"
    );
    expect(prismaMock.course.count).not.toHaveBeenCalled();
  });

  it("returns balanced coverage, attention, and current-period evidence", async () => {
    const result = await getGenEdDashboard();

    expect(result.period).toEqual({ id: "term-1", label: "2026-2027 — 1st Semester — 1st Term" });
    expect(result.coverage).toEqual({
      activeCourseCount: 5,
      activeAssignmentCount: 5,
      reachedProgramCount: 1,
      activeProgramCount: 3,
      assignedCourseCount: 4,
      assignmentCoverageRate: 0.8,
    });
    expect(result.attention).toEqual({
      unassignedCourseCount: 1,
      unmappedCiloCount: 2,
      unreachedProgramCount: 2,
      opportunitiesWithoutSubmissions: false,
    });
    expect(result.evidence).toEqual({
      submittedResponseCount: 42,
      evaluationOpportunityCount: 58,
      responseRate: 42 / 58,
      ratingCount: 120,
      meanRating: 4.18,
    });
    expect(result.evidenceState).toBe("available");
    expect(result.emptyReason).toBeNull();
    expect(getEvidencePulseMock).toHaveBeenCalledWith("term-1");
  });

  it("uses active General Education predicates for coverage and mapping attention", async () => {
    await getGenEdDashboard();

    expect(prismaMock.courseAssignment.count).toHaveBeenCalledWith({
      where: {
        is_active: true,
        term_instance_id: "term-1",
        course: { course_scope: "GENERAL_EDUCATION", is_active: true },
      },
    });
    expect(prismaMock.cILO.count).toHaveBeenCalledWith({
      where: {
        is_active: true,
        course: { is_active: true, course_scope: "GENERAL_EDUCATION" },
        cilo_institutional_outcome_mappings: {
          none: {
            manifestation: { not: null },
            institutional_outcome: { is_active: true },
          },
        },
      },
    });
  });

  it("reports unavailable current-period values when there is no active period", async () => {
    resolveActiveAcademicContextMock.mockResolvedValue({
      schoolYear: null,
      semester: null,
      assignmentPeriod: null,
    });
    getEvidencePulseMock.mockResolvedValue(null);
    prismaMock.courseAssignment.count.mockResolvedValue(0);
    prismaMock.courseAssignment.groupBy.mockResolvedValue([]);
    prismaMock.course.count
      .mockReset()
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);

    const result = await getGenEdDashboard();

    expect(result.period).toBeNull();
    expect(result.coverage.assignmentCoverageRate).toBeNull();
    expect(result.coverage.activeAssignmentCount).toBe(0);
    expect(result.attention.unassignedCourseCount).toBe(0);
    expect(result.attention.unreachedProgramCount).toBe(0);
    expect(result.evidence).toBeNull();
    expect(result.evidenceState).toBe("no-active-period");
    expect(result.emptyReason).toBe("no-active-period");
    expect(getEvidencePulseMock).not.toHaveBeenCalled();
  });

  it("keeps coverage available when the evidence read fails", async () => {
    getEvidencePulseMock.mockRejectedValue(new Error("analytics unavailable"));

    const result = await getGenEdDashboard();

    expect(result.coverage.activeCourseCount).toBe(5);
    expect(result.evidence).toBeNull();
    expect(result.evidenceState).toBe("read-failed");
  });

  it("reports no courses with zero empty reason otherwise", async () => {
    prismaMock.course.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(getGenEdDashboard()).resolves.toMatchObject({ emptyReason: "no-courses" });

    prismaMock.course.count
      .mockReset()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    await expect(getGenEdDashboard()).resolves.toMatchObject({ emptyReason: null });
  });
});
