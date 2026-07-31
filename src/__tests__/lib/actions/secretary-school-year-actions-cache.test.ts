import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolveAuthSessionMock,
  revalidatePathMock,
  createSchoolYearMock,
  updateSchoolYearMock,
  archiveSchoolYearMock,
  addTermInstanceMock,
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
  addTermInstanceMock: vi.fn(),
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
}));
vi.mock("@/features/academic-calendar/services/manage-term-instances", () => ({
  addTermInstance: addTermInstanceMock,
  updateTermInstance: updateTermInstanceMock,
  deleteTermInstance: deleteTermInstanceMock,
  setActiveTermInstance: setActiveTermInstanceMock,
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  revalidateAcademicPeriodReadModelRoutes: revalidateAcademicPeriodReadModelRoutesMock,
}));

import {
  addTermInstanceAction,
  archiveSchoolYearAction,
  createSchoolYearAction,
  deleteTermInstanceAction,
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
      "add term instance",
      addTermInstanceAction,
      addTermInstanceMock,
      form({ schoolYearId: SCHOOL_YEAR_ID, semester: "SUMMER" }),
    ],
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
});
