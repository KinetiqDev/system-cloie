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
  listProgramGOs: listGOsMock,
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

  it("renders a read-only manifestation review with every GO, full labels, and exhaustive readiness", async () => {
    listMappingsMock.mockResolvedValue({
      success: true,
      data: [
        {
          courseId: "course-ps",
          courseCode: "CS101",
          courseTitle: "Introduction to Computing",
          gos: [
            { id: "go-1", code: "GO-1", description: "Analyze problems" },
            { id: "go-2", code: "GO-2", description: "Design solutions" },
          ],
          archivedGos: [{ id: "go-9", code: "GO-9", description: "Retired outcome" }],
          cilos: [
            {
              id: "cilo-complete",
              description: "Design a solution",
              manifestations: [
                { goId: "go-1", manifestation: "LEARNING" },
                { goId: "go-2", manifestation: "PRACTICE" },
              ],
              archivedManifestations: [{ goId: "go-9", manifestation: "OPPORTUNITY" }],
              readiness: "ready",
            },
            {
              id: "cilo-gap",
              description: "Evaluate outcomes",
              manifestations: [
                { goId: "go-1", manifestation: null },
                { goId: "go-2", manifestation: null },
              ],
              archivedManifestations: [],
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
    expect(html).not.toContain("Shared General Education");
    expect(html).not.toContain("ILO-1");
    expect(html).toContain("GO-1");
    expect(html).toContain("GO-2");
    expect(html).toContain("Analyze problems");
    expect(html).toContain("Design solutions");
    expect(html).toContain("Learning (L)");
    expect(html).toContain("Practice (P)");
    expect(html).toContain("Unanswered");
    expect(html).toContain("Aligned");
    expect(html).toContain("Needs mapping");
    expect(html).toContain("bg-success-soft");
    expect(html).toContain("bg-warning-soft");
    expect(html).toContain("GO-9");
    expect(html).toContain("Archived Graduate Outcomes");
    expect(html).toContain("Opportunity (O)");
    expect(html).toContain("This review is read-only.");
    expect(html).not.toContain("Secretary");
    expect(html).not.toContain("<button");
  });
});
