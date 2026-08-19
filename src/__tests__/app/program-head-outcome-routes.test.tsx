import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, listGOsMock, listMappingsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  listGOsMock: vi.fn(),
  listMappingsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/outcomes/services/manage-program-head-outcomes", () => ({
  listProgramPLOs: listGOsMock,
  listCILOMappingsForProgram: listMappingsMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

async function renderToText(element: React.ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value);
  }
  return html;
}

describe("selected Program Outcome routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the route Program to the Outcome read", async () => {
    listGOsMock.mockResolvedValue({
      success: true,
      data: { gos: [], program: { id: PROGRAM_ID, code: "BSED", name: "Secondary Education" } },
    });
    const Page = (await import("@/app/(app)/program-head/programs/[programId]/outcomes/page"))
      .default;

    await Page({ params: Promise.resolve({ programId: PROGRAM_ID }) });

    expect(listGOsMock).toHaveBeenCalledWith(PROGRAM_ID);
  });

  it("does not render mapping data when the selected route is unavailable", async () => {
    listMappingsMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const Page = (
      await import("@/app/(app)/program-head/programs/[programId]/outcomes/mapping/page")
    ).default;

    await expect(Page({ params: Promise.resolve({ programId: PROGRAM_ID }) })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders a read-only mapping review with typed targets and readiness gaps", async () => {
    listMappingsMock.mockResolvedValue({
      success: true,
      data: [
        {
          courseId: "course-ge",
          courseCode: "GE101",
          courseTitle: "Purposive Communication",
          courseScope: "GENERAL_EDUCATION",
          cilos: [
            {
              id: "cilo-ge",
              description: "Communicate effectively",
              mappedTargets: [
                {
                  id: "ilo-1",
                  mappingId: "ilo-mapping-1",
                  code: "ILO-1",
                  description: "Communicate clearly",
                  kind: "ILO",
                  is_active: true,
                },
              ],
              readiness: "ready",
            },
          ],
        },
        {
          courseId: "course-ps",
          courseCode: "CS101",
          courseTitle: "Introduction to Computing",
          courseScope: "PROGRAM_SPECIFIC",
          cilos: [
            {
              id: "cilo-gap",
              description: "Design a solution",
              mappedTargets: [],
              readiness: "incomplete-mapping",
            },
          ],
        },
      ],
    });
    const Page = (
      await import("@/app/(app)/program-head/programs/[programId]/outcomes/mapping/page")
    ).default;

    const html = await renderToText(
      React.createElement(Page, { params: Promise.resolve({ programId: PROGRAM_ID }) })
    );

    expect(listMappingsMock).toHaveBeenCalledWith(PROGRAM_ID);
    expect(listGOsMock).not.toHaveBeenCalled();
    expect(html).toContain("CILO Mapping Review");
    expect(html).toContain("Shared General Education");
    expect(html).toContain("ILO-1");
    expect(html).toContain("Aligned");
    expect(html).toContain("Needs mapping");
    expect(html).toContain("Faculty or the Secretary can align this CILO to Program Learning Outcomes.");
    expect(html).not.toContain("<button");
  });
});
