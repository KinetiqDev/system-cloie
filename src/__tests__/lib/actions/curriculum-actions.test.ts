import { ROLES } from "@/lib/constants/roles";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
const resolveProgramHeadContextMock = vi.hoisted(() => vi.fn());
const createCurriculumVersionMock = vi.hoisted(() => vi.fn());
const updateCurriculumVersionMock = vi.hoisted(() => vi.fn());
const publishCurriculumVersionMock = vi.hoisted(() => vi.fn());
const retireCurriculumVersionMock = vi.hoisted(() => vi.fn());
const cloneCurriculumVersionMock = vi.hoisted(() => vi.fn());
const addCurriculumCourseMock = vi.hoisted(() => vi.fn());
const removeCurriculumCourseMock = vi.hoisted(() => vi.fn());
const updateCurriculumCourseMock = vi.hoisted(() => vi.fn());
const getCurriculumCourseProgramIdMock = vi.hoisted(() => vi.fn());
const getCurriculumVersionDetailMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/curriculum/services/manage-curriculum-versions", () => ({
  createCurriculumVersion: createCurriculumVersionMock,
  updateCurriculumVersion: updateCurriculumVersionMock,
  publishCurriculumVersion: publishCurriculumVersionMock,
  retireCurriculumVersion: retireCurriculumVersionMock,
  cloneCurriculumVersion: cloneCurriculumVersionMock,
}));
vi.mock("@/features/curriculum/services/manage-curriculum-courses", () => ({
  addCurriculumCourse: addCurriculumCourseMock,
  removeCurriculumCourse: removeCurriculumCourseMock,
  updateCurriculumCourse: updateCurriculumCourseMock,
}));
vi.mock("@/features/curriculum/services/read-curriculum", () => ({
  getCurriculumVersionDetail: getCurriculumVersionDetailMock,
  getCurriculumVersionProgramId: vi.fn(),
  getCurriculumCourseProgramId: getCurriculumCourseProgramIdMock,
}));
vi.mock("@/features/curriculum/services/read-curriculum-pages", () => ({
  listProgramCurriculaSummary: vi.fn(),
  listCurriculumCourseOptions: vi.fn(),
}));

import {
  createCurriculumVersionAction,
  updateCurriculumVersionAction,
  addCurriculumCourseAction,
  cloneCurriculumVersionAction,
  publishCurriculumVersionAction,
  removeCurriculumCourseAction,
  retireCurriculumVersionAction,
  updateCurriculumCourseAction,
} from "@/lib/actions/curriculum-actions";
import { getCurriculumVersionProgramId } from "@/features/curriculum/services/read-curriculum";

describe("curriculum actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      activeRole: ROLES.SECRETARY,
    });
  });

  it("revalidates Secretary and Program Head curriculum routes after create", async () => {
    createCurriculumVersionMock.mockResolvedValue({ success: true, data: { id: VERSION_ID } });

    const result = await createCurriculumVersionAction({
      programId: PROGRAM_ID,
      code: "BSIT-2030",
    });

    expect(result).toEqual({ success: true, data: { id: VERSION_ID } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/secretary/curricula");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/curricula`
    );
  });

  it("does not revalidate after a failed mutation", async () => {
    createCurriculumVersionMock.mockResolvedValue({
      success: false,
      error: "Secretary or Program Head access required",
    });

    const result = await createCurriculumVersionAction({
      programId: PROGRAM_ID,
      code: "BSIT-2030",
    });

    expect(result.success).toBe(false);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("authorizes an id-only mutation against its version program", async () => {
    vi.mocked(getCurriculumVersionProgramId).mockResolvedValue(PROGRAM_ID);
    publishCurriculumVersionMock.mockResolvedValue({
      success: true,
      data: { id: VERSION_ID, status: "PUBLISHED" },
    });

    await publishCurriculumVersionAction(VERSION_ID);

    expect(publishCurriculumVersionMock).toHaveBeenCalledWith(VERSION_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/curricula`
    );
  });

  it("blocks Program Head mutations outside selected program scope", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "ph-1", activeRole: ROLES.PROGRAM_HEAD });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    vi.mocked(getCurriculumVersionProgramId).mockResolvedValue(PROGRAM_ID);

    const result = await publishCurriculumVersionAction(VERSION_ID);

    expect(result).toEqual({ success: false, error: "Selected Program is not assigned." });
    expect(publishCurriculumVersionMock).not.toHaveBeenCalled();
  });

  it("revalidates both routes for every curriculum mutation", async () => {
    vi.mocked(getCurriculumVersionProgramId).mockResolvedValue(PROGRAM_ID);
    getCurriculumCourseProgramIdMock.mockResolvedValue(PROGRAM_ID);
    updateCurriculumVersionMock.mockResolvedValue({ success: true, data: { id: VERSION_ID } });
    retireCurriculumVersionMock.mockResolvedValue({ success: true, data: { id: VERSION_ID, status: "RETIRED" } });
    cloneCurriculumVersionMock.mockResolvedValue({ success: true, data: { id: VERSION_ID, code: "COPY" } });
    addCurriculumCourseMock.mockResolvedValue({ success: true, data: { id: VERSION_ID } });
    removeCurriculumCourseMock.mockResolvedValue({ success: true, data: { id: VERSION_ID } });
    updateCurriculumCourseMock.mockResolvedValue({ success: true, data: { id: VERSION_ID } });

    await updateCurriculumVersionAction(VERSION_ID, { code: "BSIT-2031" });
    await retireCurriculumVersionAction(VERSION_ID);
    await cloneCurriculumVersionAction(VERSION_ID);
    await addCurriculumCourseAction({
      curriculumVersionId: VERSION_ID,
      courseId: "33333333-3333-4333-8333-333333333333",
      yearLevel: "FIRST_YEAR",
      semester: "FIRST",
      term: "FIRST_TERM",
    });
    await removeCurriculumCourseAction(VERSION_ID);
    await updateCurriculumCourseAction(VERSION_ID, { yearLevel: "SECOND_YEAR" });

    expect(updateCurriculumVersionMock).toHaveBeenCalledWith(VERSION_ID, { code: "BSIT-2031" });
    expect(revalidatePathMock).toHaveBeenCalledTimes(12);
  });

  it("rejects a malformed version metadata update before calling its service", async () => {
    const result = await updateCurriculumVersionAction("not-a-uuid", { code: "BSIT-2031" });

    expect(result).toEqual({ success: false, error: "Invalid curriculum version ID" });
    expect(updateCurriculumVersionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns null detail for an unknown version without exposing data", async () => {
    vi.mocked(getCurriculumVersionProgramId).mockResolvedValue(null);
    getCurriculumVersionDetailMock.mockResolvedValue({
      id: VERSION_ID,
      programId: PROGRAM_ID,
    });

    const { getCurriculumVersionDetailAction } = await import("@/lib/actions/curriculum-actions");
    const result = await getCurriculumVersionDetailAction(VERSION_ID);

    expect(result).toEqual({ success: true, data: null });
    expect(getCurriculumVersionDetailMock).not.toHaveBeenCalled();
  });

  it("rejects an out-of-scope detail read before loading detail data", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "ph-1", activeRole: ROLES.PROGRAM_HEAD });
    vi.mocked(getCurriculumVersionProgramId).mockResolvedValue(PROGRAM_ID);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const { getCurriculumVersionDetailAction } = await import("@/lib/actions/curriculum-actions");
    const result = await getCurriculumVersionDetailAction(VERSION_ID);

    expect(result).toEqual({ success: false, error: "Selected Program is not assigned." });
    expect(getCurriculumVersionDetailMock).not.toHaveBeenCalled();
  });

  it("rejects an empty course update before calling its service", async () => {
    const { updateCurriculumCourseAction } = await import("@/lib/actions/curriculum-actions");

    const result = await updateCurriculumCourseAction(VERSION_ID, {});

    expect(result).toEqual({
      success: false,
      error: "At least one placement field is required",
    });
    expect(updateCurriculumCourseMock).not.toHaveBeenCalled();
  });

  it("authorizes the on-demand curricula summary read for the requested program", async () => {
    const {
      listProgramCurriculaSummaryAction,
    } = await import("@/lib/actions/curriculum-actions");
    const pagesModule = await import(
      "@/features/curriculum/services/read-curriculum-pages"
    );
    const summaryMock = vi.mocked(pagesModule.listProgramCurriculaSummary);
    summaryMock.mockResolvedValue([
      {
        id: VERSION_ID,
        programId: PROGRAM_ID,
        majorId: null,
        code: "BSIT-2030",
        name: null,
        status: "DRAFT",
        effectiveFromSchoolYearId: null,
        publishedAt: null,
        publishedBy: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        courseCount: 1,
      },
    ]);

    const result = await listProgramCurriculaSummaryAction(PROGRAM_ID);

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: VERSION_ID,
          programId: PROGRAM_ID,
          majorId: null,
          code: "BSIT-2030",
          name: null,
          status: "DRAFT",
          effectiveFromSchoolYearId: null,
          publishedAt: null,
          publishedBy: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          courseCount: 1,
        },
      ],
    });
    expect(summaryMock).toHaveBeenCalledWith(PROGRAM_ID);
  });

  it("authorizes the scoped course options read for the requested program", async () => {
    const { listProgramCourseOptionsAction } = await import("@/lib/actions/curriculum-actions");
    const pagesModule = await import(
      "@/features/curriculum/services/read-curriculum-pages"
    );
    const optionsMock = vi.mocked(pagesModule.listCurriculumCourseOptions);
    optionsMock.mockResolvedValue([
      { id: "course-1", code: "CS-101", title: "Intro", programId: PROGRAM_ID },
    ]);

    const result = await listProgramCourseOptionsAction(PROGRAM_ID);

    expect(result).toEqual({
      success: true,
      data: [{ id: "course-1", code: "CS-101", title: "Intro", programId: PROGRAM_ID }],
    });
    expect(optionsMock).toHaveBeenCalledWith(PROGRAM_ID);
  });

  it("rejects an invalid program id for on-demand reads before calling services", async () => {
    const {
      listProgramCurriculaSummaryAction,
      listProgramCourseOptionsAction,
    } = await import("@/lib/actions/curriculum-actions");
    const pagesModule = await import(
      "@/features/curriculum/services/read-curriculum-pages"
    );
    const summaryMock = vi.mocked(pagesModule.listProgramCurriculaSummary);
    const optionsMock = vi.mocked(pagesModule.listCurriculumCourseOptions);

    expect(await listProgramCurriculaSummaryAction("not-a-uuid")).toEqual({
      success: false,
      error: "Invalid program ID.",
    });
    expect(await listProgramCourseOptionsAction("not-a-uuid")).toEqual({
      success: false,
      error: "Invalid program ID.",
    });
    expect(summaryMock).not.toHaveBeenCalled();
    expect(optionsMock).not.toHaveBeenCalled();
  });

  it("blocks out-of-scope on-demand reads for Program Heads", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "ph-1", activeRole: ROLES.PROGRAM_HEAD });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const {
      listProgramCurriculaSummaryAction,
      listProgramCourseOptionsAction,
    } = await import("@/lib/actions/curriculum-actions");
    const pagesModule = await import(
      "@/features/curriculum/services/read-curriculum-pages"
    );
    const summaryMock = vi.mocked(pagesModule.listProgramCurriculaSummary);
    const optionsMock = vi.mocked(pagesModule.listCurriculumCourseOptions);

    expect(await listProgramCurriculaSummaryAction(PROGRAM_ID)).toEqual({
      success: false,
      error: "Selected Program is not assigned.",
    });
    expect(await listProgramCourseOptionsAction(PROGRAM_ID)).toEqual({
      success: false,
      error: "Selected Program is not assigned.",
    });
    expect(summaryMock).not.toHaveBeenCalled();
    expect(optionsMock).not.toHaveBeenCalled();
  });
});
