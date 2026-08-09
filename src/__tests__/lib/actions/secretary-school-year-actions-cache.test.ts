import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolveAuthSessionMock,
  revalidatePathMock,
  createSchoolYearMock,
  updateSchoolYearMock,
  archiveSchoolYearMock,
  activateSchoolYearMock,
  deactivateSchoolYearMock,
  setActiveSemesterMock,
  updateTermInstanceMock,
  deleteTermInstanceMock,
  setActiveTermInstanceMock,
  revalidateAcademicPeriodReadModelRoutesMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createSchoolYearMock: vi.fn(),
  updateSchoolYearMock: vi.fn(),
  archiveSchoolYearMock: vi.fn(),
  activateSchoolYearMock: vi.fn(),
  deactivateSchoolYearMock: vi.fn(),
  setActiveSemesterMock: vi.fn(),
  updateTermInstanceMock: vi.fn(),
  deleteTermInstanceMock: vi.fn(),
  setActiveTermInstanceMock: vi.fn(),
  revalidateAcademicPeriodReadModelRoutesMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-calendar/services/manage-school-years", () => ({
  createSchoolYear: createSchoolYearMock,
  updateSchoolYear: updateSchoolYearMock,
  archiveSchoolYear: archiveSchoolYearMock,
  activateSchoolYear: activateSchoolYearMock,
  deactivateSchoolYear: deactivateSchoolYearMock,
  setActiveSemester: setActiveSemesterMock,
}));
vi.mock("@/features/academic-calendar/services/manage-term-instances", () => ({
  updateTermInstance: updateTermInstanceMock,
  deleteTermInstance: deleteTermInstanceMock,
  setActiveTermInstance: setActiveTermInstanceMock,
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  revalidateAcademicPeriodReadModelRoutes: revalidateAcademicPeriodReadModelRoutesMock,
}));

import {
  activateSchoolYearAction,
  archiveSchoolYearAction,
  createSchoolYearAction,
  deactivateSchoolYearAction,
  deleteTermInstanceAction,
  setActiveSemesterAction,
  setActiveTermInstanceAction,
  updateSchoolYearAction,
  updateTermInstanceAction,
} from "@/lib/actions/secretary-school-year-actions";

const secretarySession = { roles: ["SECRETARY"], activeRole: "SECRETARY", userId: "secretary-1" };
const SCHOOL_YEAR_ID = "11111111-1111-4111-8111-111111111111";
const PERIOD_ID = "22222222-2222-4222-8222-222222222222";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("Secretary academic-period actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(secretarySession);
  });

  it.each([
    ["create school year", createSchoolYearAction, createSchoolYearMock, form({ startYear: "2026" })],
    [
      "update school year",
      updateSchoolYearAction,
      updateSchoolYearMock,
      form({ id: SCHOOL_YEAR_ID, startDate: "2026-08-01", endDate: "2027-05-31" }),
    ],
    ["archive school year", archiveSchoolYearAction, archiveSchoolYearMock, form({ id: "school-year-1" })],
    [
      "update term instance",
      updateTermInstanceAction,
      updateTermInstanceMock,
      form({ id: PERIOD_ID, startDate: "2026-08-01", endDate: "2026-12-31" }),
    ],
    ["delete term instance", deleteTermInstanceAction, deleteTermInstanceMock, form({ id: PERIOD_ID })],
    [
      "activate term instance",
      setActiveTermInstanceAction,
      setActiveTermInstanceMock,
      form({ termInstanceId: PERIOD_ID }),
    ],
  ])("revalidates the period routes after a successful %s mutation", async (_name, action, service, data) => {
    service.mockResolvedValue({ success: true, data: { id: "period-1" } });

    await action(data);

    expect(revalidateAcademicPeriodReadModelRoutesMock).toHaveBeenCalledTimes(1);
  });

  it("does not revalidate period routes when the service rejects a mutation", async () => {
    createSchoolYearMock.mockResolvedValue({ success: false, error: "invalid" });

    await createSchoolYearAction(form({ startYear: "2026" }));

    expect(revalidateAcademicPeriodReadModelRoutesMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("forwards an optional semester to activateSchoolYear", async () => {
    activateSchoolYearMock.mockResolvedValue({ success: true, data: { id: SCHOOL_YEAR_ID } });

    const result = await activateSchoolYearAction(form({ id: SCHOOL_YEAR_ID, semester: "SUMMER" }));

    expect(result.success).toBe(true);
    expect(activateSchoolYearMock).toHaveBeenCalledWith(SCHOOL_YEAR_ID, "SUMMER");
  });

  it("activates without a semester when none is provided", async () => {
    activateSchoolYearMock.mockResolvedValue({ success: true, data: { id: SCHOOL_YEAR_ID } });

    const result = await activateSchoolYearAction(form({ id: SCHOOL_YEAR_ID }));

    expect(result.success).toBe(true);
    expect(activateSchoolYearMock).toHaveBeenCalledWith(SCHOOL_YEAR_ID, undefined);
  });

  it("rejects an invalid semester value", async () => {
    const result = await activateSchoolYearAction(form({ id: SCHOOL_YEAR_ID, semester: "WINTER" }));

    expect(result).toEqual({ success: false, error: "Semester must be FIRST, SECOND, or SUMMER" });
    expect(activateSchoolYearMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed school year ID without calling the service", async () => {
    const activate = await activateSchoolYearAction(form({ id: "not-a-uuid" }));
    expect(activate).toEqual({ success: false, error: "Invalid school year ID" });
    expect(activateSchoolYearMock).not.toHaveBeenCalled();

    const deactivate = await deactivateSchoolYearAction(form({ id: "not-a-uuid" }));
    expect(deactivate).toEqual({ success: false, error: "Invalid school year ID" });
    expect(deactivateSchoolYearMock).not.toHaveBeenCalled();
  });

  it("delegates deactivation and semester changes to their services", async () => {
    deactivateSchoolYearMock.mockResolvedValue({ success: true, data: { id: SCHOOL_YEAR_ID } });
    setActiveSemesterMock.mockResolvedValue({ success: true, data: { id: SCHOOL_YEAR_ID } });

    await deactivateSchoolYearAction(form({ id: SCHOOL_YEAR_ID }));
    expect(deactivateSchoolYearMock).toHaveBeenCalledWith(SCHOOL_YEAR_ID);

    await setActiveSemesterAction(form({ schoolYearId: SCHOOL_YEAR_ID, semester: "SECOND" }));
    expect(setActiveSemesterMock).toHaveBeenCalledWith(SCHOOL_YEAR_ID, "SECOND");
  });

  it("rejects an invalid semester on setActiveSemester", async () => {
    const result = await setActiveSemesterAction(
      form({ schoolYearId: SCHOOL_YEAR_ID, semester: "NONE" })
    );

    expect(result.success).toBe(false);
    expect(setActiveSemesterMock).not.toHaveBeenCalled();
  });
});
