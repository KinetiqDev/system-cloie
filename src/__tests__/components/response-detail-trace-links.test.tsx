import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import type { ProgramHeadSubmittedResponseDetail } from "@/features/response-review/types";

function responseDTO(
  overrides: Partial<ProgramHeadSubmittedResponseDetail> = {}
): ProgramHeadSubmittedResponseDetail {
  return {
    responseId: "response-1",
    submittedAt: new Date("2026-08-24T00:00:00Z"),
    respondent: { id: "u-1", name: "Maria Gomez", stakeholder: "ALUMNI" },
    evaluation: {
      id: "deployment-1",
      type: "PROGRAM_WIDE",
      title: "Alumni Survey",
      context: {
        stakeholder: "ALUMNI",
        targetProgramLabel: null,
        targetMajorLabel: null,
        targetYearLevel: null,
        instrumentVersion: 1,
        periodLabel: "2025-2026",
        termInstanceId: "11111111-1111-4111-8111-111111111111",
      },
    },
    quantitativeMean: 4.5,
    sections: [
      {
        key: "outcomes",
        title: "Outcomes",
        items: [
          {
            kind: "quantitative",
            itemKey: "q1",
            prompt: "Rate the outcome",
            rating: 5,
            scaleLabel: null,
            binding: {
              type: "GO",
              goBindings: [
                {
                  key: "22222222-2222-4222-8222-222222222222",
                  code: "GO-1",
                  description: "Graduate outcomes",
                },
                {
                  key: "snapshot:GO-9:Retired outcome",
                  code: "GO-9",
                  description: "Retired outcome",
                },
              ],
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("ResponseDetail reverse trace links", () => {
  it("deep-links GO bindings with a live GO id and preserves source and period", () => {
    render(
      <ResponseDetail
        response={responseDTO()}
        evaluationHref="/responses/program-wide/d-1"
        analyticsHref="/analytics"
        programId="program-1"
      />
    );

    const goLink = screen.getByRole("link", { name: "GO-1" });
    const href = goLink.getAttribute("href") ?? "";
    expect(href).toContain("tab=outcomes");
    expect(href).toContain("evidenceSource=ALUMNI");
    expect(href).toContain("stakeholder=ALUMNI");
    expect(href).toContain("goId=22222222-2222-4222-8222-222222222222");
    expect(href).toContain("termInstanceId=11111111-1111-4111-8111-111111111111");
  });

  it("deep-links retired snapshot GOs through their analytics snapshot key", () => {
    render(
      <ResponseDetail
        response={responseDTO()}
        evaluationHref="/responses/program-wide/d-1"
        analyticsHref="/analytics"
        programId="program-1"
      />
    );

    const retiredLink = screen.getByRole("link", { name: "GO-9" });
    const href = retiredLink.getAttribute("href") ?? "";
    expect(href).toContain("tab=outcomes");
    expect(href).toContain("evidenceSource=ALUMNI");
    expect(href).toContain("goId=snapshot%3AGO-9%3ARetired+outcome");
  });

  it("keeps course-bound responses scoped to the COURSE source without a stakeholder", () => {
    const courseResponse = responseDTO({
      evaluation: {
        id: "eval-1",
        type: "COURSE_BOUND",
        title: "EDUC 7",
        context: {
          courseCode: "EDUC 7",
          courseTitle: "Education 7",
          facultyName: null,
          yearLevel: null,
          section: null,
          majorLabel: null,
          periodLabel: "2025-2026",
          termInstanceId: "11111111-1111-4111-8111-111111111111",
        },
      },
      sections: [
        {
          key: "cilo-items",
          title: "CILO",
          items: [
            {
              kind: "quantitative",
              itemKey: "q1",
              prompt: "Rate",
              rating: 4,
              scaleLabel: null,
              binding: {
                type: "CILO",
                ciloId: "cilo-1",
                ciloLabel: "Achieve outcomes",
                goMappings: [
                  {
                    goId: "33333333-3333-4333-8333-333333333333",
                    goCode: "GO 1",
                    goDescription: "Outcome",
                    manifestation: "LEARNING",
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    render(
      <ResponseDetail
        response={courseResponse}
        evaluationHref="/responses/course/eval-1"
        analyticsHref="/analytics"
        programId="program-1"
      />
    );

    const href = screen.getByRole("link", { name: "GO 1" }).getAttribute("href") ?? "";
    expect(href).toContain("evidenceSource=COURSE");
    expect(href).not.toContain("stakeholder=");
    expect(href).toContain("goId=33333333-3333-4333-8333-333333333333");
  });
});
