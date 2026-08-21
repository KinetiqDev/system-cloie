import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const REDIRECT_ERROR = "NEXT_REDIRECT";
const { redirectMock, resolveAuthSessionMock, listCoursesMock, catalogMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`${REDIRECT_ERROR}:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  listCoursesMock: vi.fn(),
  catalogMock: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-structure/services/resolve-gen-ed-courses", () => ({
  listGenEdCourses: listCoursesMock,
}));
// fallow-ignore-next-line code-duplication
vi.mock("@/features/academic-structure/components/gen-ed-courses-catalog", () => ({
  GenEdCoursesCatalog: catalogMock,
}));

describe("gen-ed-coordinator/courses route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogMock.mockReturnValue(null);
    resolveAuthSessionMock.mockResolvedValue({
      userId: "ge-1",
      activeRole: ROLES.GEN_ED_COORDINATOR,
      roles: [ROLES.GEN_ED_COORDINATOR],
    });
    listCoursesMock.mockResolvedValue({
      success: true,
      data: { courses: [], summary: { total: 0, active: 0, archived: 0 } },
    });
  });

  async function loadPage() {
    return (await import("@/app/(app)/gen-ed-coordinator/courses/page")).default;
  }

  it("renders catalog for GEN_ED_COORDINATOR", async () => {
    const Page = await loadPage();
    const rendered = await Page();
    expect(listCoursesMock).toHaveBeenCalled();
    expect(rendered).toMatchObject({ props: { courses: expect.any(Array), summary: expect.any(Object) } });
  });

  it("redirects non-coordinator to /unauthorized before loading courses", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "f-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    const Page = await loadPage();
    await expect(Page()).rejects.toThrow(`${REDIRECT_ERROR}:/unauthorized`);
    expect(listCoursesMock).not.toHaveBeenCalled();
  });

  it("redirects unauth to portal", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    const Page = await loadPage();
    await expect(Page()).rejects.toThrow(`${REDIRECT_ERROR}:/portal/respondents`);
  });

  it("is read-only — catalog props have no program/major/mutation branch", async () => {
    listCoursesMock.mockResolvedValue({
      success: true,
      data: {
        courses: [{ id: "1", code: "GEMATH", title: "Math", is_active: true, updated_at: new Date() }],
        summary: { total: 1, active: 1, archived: 0 },
      },
    });
    const Page = await loadPage();
    const rendered = await Page();
    expect(rendered).toMatchObject({ props: { courses: expect.any(Array), summary: expect.any(Object) } });
    expect((rendered as { props: Record<string, unknown> }).props).not.toHaveProperty("program");
    expect((rendered as { props: Record<string, unknown> }).props).not.toHaveProperty("majors");
  });
});
