import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveCentralPublishReadiness } from "@/features/evaluations/services/resolve-central-publish-readiness";

const { instrumentTemplateFindManyMock, ploFindManyMock, resolveProgramHeadContextMock } =
  vi.hoisted(() => ({
    instrumentTemplateFindManyMock: vi.fn(),
    ploFindManyMock: vi.fn(),
    resolveProgramHeadContextMock: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    instrumentTemplate: { findMany: instrumentTemplateFindManyMock },
    pLO: { findMany: ploFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const STRUCTURE = [
  {
    key: "sec-1",
    title: "Outcomes",
    order: 0,
    questions: [
      {
        key: "q-1",
        prompt: "The program prepared me for employment",
        type: "likert" as const,
        order: 0,
        required: true,
      },
      {
        key: "q-2",
        prompt: "Overall satisfaction with the program",
        type: "likert" as const,
        order: 1,
        required: true,
      },
      {
        key: "q-3",
        prompt: "What should improve?",
        type: "guided_open_ended" as const,
        order: 2,
        required: false,
      },
    ],
  },
];

function mockTemplate(bindings: Array<{ plo_id: string | null; item_key: string }>) {
  instrumentTemplateFindManyMock.mockResolvedValue([
    {
      id: "template-1",
      structure: STRUCTURE,
      template_plo_question_bindings: bindings.map((binding) => ({
        ...binding,
        section_key: "sec-1",
      })),
    },
  ]);
}

describe("resolveCentralPublishReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ploFindManyMock.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-user-1",
        selectedProgram: { id: "program-1", code: "BSIT", name: "BS Information Technology" },
        authorizedPrograms: [],
      },
    });
  });

  it("reports the Likert questions a template leaves unbound and the PLOs it covers", async () => {
    mockTemplate([{ plo_id: "plo-1", item_key: "q-1" }]);
    ploFindManyMock.mockResolvedValue([
      { id: "plo-1", code: "BSIT-GO1", description: "Communicate effectively" },
    ]);

    const result = await resolveCentralPublishReadiness("program-1");

    expect(result).toEqual({
      success: true,
      data: {
        "template-1": {
          templateId: "template-1",
          likertCount: 2,
          boundQuestionCount: 1,
          coveredPlos: [{ code: "BSIT-GO1", description: "Communicate effectively" }],
          unboundQuestions: [
            {
              itemKey: "q-2",
              prompt: "Overall satisfaction with the program",
              sectionKey: "sec-1",
              sectionTitle: "Outcomes",
            },
          ],
          blockingError: null,
        },
      },
    });
  });

  it("reports a blocking binding problem without hiding the unbound questions", async () => {
    mockTemplate([{ plo_id: "plo-archived", item_key: "q-1" }]);
    ploFindManyMock.mockResolvedValue([]);

    const result = await resolveCentralPublishReadiness("program-1");

    expect(result.success).toBe(true);
    if (!result.success) return;
    const readiness = result.data["template-1"];
    expect(readiness.blockingError).toBe(
      "One or more bound PLOs are archived or no longer available. Update the template before publishing."
    );
    expect(readiness.unboundQuestions.map((question) => question.itemKey)).toEqual(["q-1", "q-2"]);
    expect(readiness.coveredPlos).toEqual([]);
  });
});
