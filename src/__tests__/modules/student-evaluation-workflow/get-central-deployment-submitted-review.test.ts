import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCentralDeploymentSubmittedReview } from "@/features/responses/services/get-central-deployment-submitted-review";

const { findFirstMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("getCentralDeploymentSubmittedReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads submitted answers from questions[] snapshots for stakeholder reviews", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue({
      assignment: {
        central_deployment: {
          deployment_name: "Alumni Evaluation Tool",
          instrument: {
            structure_snapshot: [
              {
                key: "section-a",
                questions: [
                  { key: "q1", prompt: "Program effectiveness", type: "likert" },
                  { key: "remarks", prompt: "Narrative feedback", type: "guided_open_ended" },
                ],
                title: "Section A",
              },
            ],
            template: { name: "Alumni Evaluation Tool Template" },
          },
          major: null,
          program: { code: "BSED", name: "Values Education" },
          year_level: null,
        },
      },
      id: "response-1",
      qual_items: [
        { prompt_key: "remarks", section_key: "section-a", text_content: "Well structured." },
      ],
      quant_items: [{ item_key: "q1", rating_value: 4, section_key: "section-a" }],
      submitted_at: new Date("2026-05-20T10:00:00.000Z"),
    });

    await expect(getCentralDeploymentSubmittedReview("response-1")).resolves.toEqual(
      expect.objectContaining({
        evaluationTitle: "Alumni Evaluation Tool",
        responseId: "response-1",
        sections: [
          {
            description: "",
            id: "section-a",
            items: [
              {
                answer: 4,
                itemKey: "q1",
                kind: "quantitative",
                prompt: "Program effectiveness",
                scale: [],
              },
              {
                answer: "Well structured.",
                kind: "qualitative",
                prompt: "Narrative feedback",
                promptKey: "remarks",
              },
            ],
            name: "Section A",
          },
        ],
      })
    );
  });
});
