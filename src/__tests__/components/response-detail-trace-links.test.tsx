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
              type: "PLO",
              ploBindings: [
                { key: "22222222-2222-4222-8222-222222222222", code: "PLO-1", description: "Graduate outcomes" },
                { key: "PLO-9", code: "PLO-9", description: "Retired outcome" },
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
  it("deep-links PLO bindings with a live plo id and preserves source and period", () => {
    render(
      <ResponseDetail
        response={responseDTO()}
        evaluationHref="/responses/program-wide/d-1"
        analyticsHref="/analytics"
        programId="program-1"
      />
    );

    const ploLink = screen.getByRole("link", { name: "PLO-1" });
    const href = ploLink.getAttribute("href") ?? "";
    expect(href).toContain("tab=outcomes");
    expect(href).toContain("evidenceSource=ALUMNI");
    expect(href).toContain("stakeholder=ALUMNI");
    expect(href).toContain("ploId=22222222-2222-4222-8222-222222222222");
    expect(href).toContain("termInstanceId=11111111-1111-4111-8111-111111111111");
  });

  it("renders snapshot-only PLO codes as plain text instead of dead links", () => {
    render(
      <ResponseDetail
        response={responseDTO()}
        evaluationHref="/responses/program-wide/d-1"
        analyticsHref="/analytics"
        programId="program-1"
      />
    );

    expect(screen.queryByRole("link", { name: "PLO-9" })).not.toBeInTheDocument();
    expect(screen.getByText("PLO-9")).toBeInTheDocument();
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
                ploMappings: [{ ploId: "33333333-3333-4333-8333-333333333333", ploCode: "PLO 1", ploDescription: "Outcome", manifestation: "LEARNING" }],
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

    const href = screen.getByRole("link", { name: "PLO 1" }).getAttribute("href") ?? "";
    expect(href).toContain("evidenceSource=COURSE");
    expect(href).not.toContain("stakeholder=");
    expect(href).toContain("ploId=33333333-3333-4333-8333-333333333333");
  });
});
