import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProgramHeadFeedback } from "@/features/analytics/services/get-program-head-analytics";
import {
  buildRedactedWordCloudTokens,
  redactPotentialIdentifiers,
} from "@/features/analytics/services/qualitative-analytics";

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    response: { count: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    qualitativeResponseItem: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const bsedContext = {
  success: true,
  data: {
    userId: "head-1",
    authorizedPrograms: [
      { code: "BEED", id: "program-beed", name: "Bachelor of Elementary Education" },
      { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
  },
};

const feedbackFilters = { tab: "feedback" as const };

const openPromptSnapshot = [
  {
    key: "open",
    title: "Comments",
    items: [
      { key: "open-1", kind: "qualitative", prompt: "What worked well?" },
      { key: "open-2", kind: "qualitative", prompt: "What should improve?" },
    ],
  },
];

const FEEDBACK_DTO_KEYS = [
  "emptyReason",
  "evidenceEvaluations",
  "periodOptions",
  "promptCounts",
  "qualitativeItemCount",
  "qualitativeResponseCount",
  "scope",
  "sourceCounts",
  "tokens",
].sort();

type FeedbackAssignment = {
  course_bound: {
    id: string;
    deployment_name: string;
    instrument: { id: string; structure_snapshot: unknown };
  } | null;
  central_deployment: {
    target_stakeholder: string;
    instrument: { id: string; structure_snapshot: unknown };
  } | null;
};

function courseBoundAssignment(opts: {
  evaluationId?: string;
  deploymentName?: string;
  instrumentId?: string;
} = {}): FeedbackAssignment {
  return {
    course_bound: {
      id: opts.evaluationId ?? "eval-1",
      deployment_name: opts.deploymentName ?? "CILO Evaluation",
      instrument: { id: opts.instrumentId ?? "instrument-course", structure_snapshot: openPromptSnapshot },
    },
    central_deployment: null,
  };
}

function qualitativeRow(opts: {
  text: string;
  responseId: string;
  sectionKey?: string;
  promptKey?: string;
  assignment?: FeedbackAssignment;
}) {
  return {
    text_content: opts.text,
    section_key: opts.sectionKey ?? "open",
    prompt_key: opts.promptKey ?? "open-1",
    response: {
      id: opts.responseId,
      assignment: opts.assignment ?? courseBoundAssignment(),
    },
  };
}

describe("redactPotentialIdentifiers", () => {
  it("strips email fragments before tokenization remnants remain", () => {
    expect(redactPotentialIdentifiers("Contact student@cloie.test for clarity")).toBe(
      "Contact for clarity"
    );
  });

  it("strips digit-bearing identifiers", () => {
    expect(redactPotentialIdentifiers("Student 2024-12345 and capstone2 showed clarity")).toBe(
      "Student and showed clarity"
    );
  });
});

describe("buildRedactedWordCloudTokens", () => {
  it("orders tokens by count descending then localeCompare", () => {
    expect(
      buildRedactedWordCloudTokens([
        "clarity support",
        "support clarity",
        "support banana apple",
        "banana apple",
      ])
    ).toEqual([
      { text: "support", value: 3 },
      { text: "apple", value: 2 },
      { text: "banana", value: 2 },
      { text: "clarity", value: 2 },
    ]);
  });
});

describe("getProgramHeadFeedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
    prismaMock.evaluationAssignment.count.mockResolvedValue(4);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
  });

  it("returns null and issues no qualitative query when the Program is unassigned", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    await expect(getProgramHeadFeedback("program-3", feedbackFilters)).resolves.toBeNull();
    expect(prismaMock.qualitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it("uses the submitted-only selected-Program scope for qualitative input", async () => {
    const submittedRow = qualitativeRow({
      text: "Submitted clarity",
      responseId: "response-submitted",
    });
    const draftRow = qualitativeRow({
      text: "Draft answer must stay excluded",
      responseId: "response-draft",
    });
    prismaMock.qualitativeResponseItem.findMany.mockImplementation(async ({ where }) => {
      return where.response.status === "SUBMITTED" ? [submittedRow] : [submittedRow, draftRow];
    });

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(prismaMock.qualitativeResponseItem.findMany).toHaveBeenCalledTimes(1);
    const where = prismaMock.qualitativeResponseItem.findMany.mock.calls[0]?.[0]?.where;
    expect(where.response.status).toBe("SUBMITTED");
    expect(JSON.stringify(where)).toContain("program-bsed");
    expect(JSON.stringify(where)).not.toContain("program-beed");
    expect(JSON.stringify(result)).not.toContain("Draft answer must stay excluded");
    expect(result?.tokens).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "draft" })])
    );
  });

  it("excludes empty qualitative items from tokens, counts, and links", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "   ", responseId: "response-empty" }),
      qualitativeRow({ text: "Excellent clarity in teaching", responseId: "response-1" }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.qualitativeItemCount).toBe(1);
    expect(result?.qualitativeResponseCount).toBe(1);
    expect(result?.tokens).toEqual(
      expect.arrayContaining([
        { text: "clarity", value: 1 },
        { text: "excellent", value: 1 },
        { text: "teaching", value: 1 },
      ])
    );
    expect(result?.emptyReason).toBeNull();
  });

  it("redacts email fragments and digit-bearing identifiers from tokens", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({
        text: "Email student@cloie.test about the capstone2 clarity in teaching",
        responseId: "response-1",
      }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.tokens.map((token) => token.text)).toEqual(["clarity", "email", "teaching"]);
    expect(result?.tokens).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "student" }),
        expect.objectContaining({ text: "cloie" }),
        expect.objectContaining({ text: "capstone" }),
      ])
    );
  });

  it("serializes a closed aggregate DTO without raw text or identifiers", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({
        text: "Supportive examples improved practical learning for student@cloie.test",
        responseId: "response-1",
        promptKey: "open-1",
      }),
      qualitativeRow({
        text: "Alumni feedback needs more practical examples",
        responseId: "response-2",
        promptKey: "open-2",
        assignment: {
          course_bound: null,
          central_deployment: {
            target_stakeholder: "ALUMNI",
            instrument: { id: "instrument-alumni", structure_snapshot: openPromptSnapshot },
          },
        },
      }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(Object.keys(result).sort()).toEqual(FEEDBACK_DTO_KEYS);
    expect(result.tokens.every((token) => Object.keys(token).sort().join(",") === "text,value")).toBe(
      true
    );
    expect(result.sourceCounts).toEqual([
      {
        sourceKey: "COURSE_STUDENT",
        sourceLabel: "Course-bound student evidence",
        itemCount: 1,
        responseCount: 1,
      },
      {
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        itemCount: 1,
        responseCount: 1,
      },
    ]);
    expect(result.promptCounts).toEqual([
      {
        sourceLabel: "Alumni evidence",
        promptLabel: "What should improve?",
        itemCount: 1,
        responseCount: 1,
      },
      {
        sourceLabel: "Course-bound student evidence",
        promptLabel: "What worked well?",
        itemCount: 1,
        responseCount: 1,
      },
    ]);
    expect(result.evidenceEvaluations).toEqual([
      { evaluationId: "eval-1", deploymentName: "CILO Evaluation" },
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Supportive examples improved practical learning");
    expect(serialized).not.toContain("Alumni feedback needs more practical examples");
    expect(serialized).not.toContain("response-1");
    expect(serialized).not.toContain("response-2");
    expect(serialized).not.toContain("student@cloie.test");
    expect(serialized).not.toContain("text_content");
    expect(serialized).not.toContain("qual_items");
    expect(serialized).not.toContain("assignments");
  });

  it("keeps same-key prompts from different instrument snapshots separate", async () => {
    const alumniSnapshot = [
      {
        key: "open",
        title: "Alumni comments",
        items: [{ key: "open-1", kind: "qualitative", prompt: "What should alumni improve?" }],
      },
    ];
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "Clear activities", responseId: "response-course" }),
      qualitativeRow({
        text: "More industry exposure",
        responseId: "response-alumni",
        assignment: {
          course_bound: null,
          central_deployment: {
            target_stakeholder: "ALUMNI",
            instrument: { id: "instrument-alumni", structure_snapshot: alumniSnapshot },
          },
        },
      }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.promptCounts).toEqual([
      {
        sourceLabel: "Alumni evidence",
        promptLabel: "What should alumni improve?",
        itemCount: 1,
        responseCount: 1,
      },
      {
        sourceLabel: "Course-bound student evidence",
        promptLabel: "What worked well?",
        itemCount: 1,
        responseCount: 1,
      },
    ]);
  });

  it("uses a generic label when a prompt is absent from its snapshot", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "Clear direction", responseId: "response-1", promptKey: "legacy-private-key" }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.promptCounts[0]?.promptLabel).toBe("Unlabeled prompt");
    expect(JSON.stringify(result)).not.toContain("legacy-private-key");
  });

  it("keeps aggregate evidence when redaction leaves no tokenizable terms", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "student123@example.test 20240123", responseId: "response-1" }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.emptyReason).toBeNull();
    expect(result?.tokens).toEqual([]);
    expect(result?.qualitativeItemCount).toBe(1);
    expect(result?.qualitativeResponseCount).toBe(1);
    expect(result?.sourceCounts[0]?.itemCount).toBe(1);
  });

  it("orders tokens deterministically by value then text", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "clarity support", responseId: "response-1" }),
      qualitativeRow({ text: "support clarity", responseId: "response-2" }),
      qualitativeRow({ text: "support banana apple", responseId: "response-3" }),
      qualitativeRow({ text: "banana apple", responseId: "response-4" }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.tokens).toEqual([
      { text: "support", value: 3 },
      { text: "apple", value: 2 },
      { text: "banana", value: 2 },
      { text: "clarity", value: 2 },
    ]);
  });

  it("returns no-qualitative-evidence when submissions have no non-empty comments", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      qualitativeRow({ text: "   ", responseId: "response-1" }),
    ]);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.emptyReason).toBe("no-qualitative-evidence");
    expect(result?.tokens).toEqual([]);
    expect(result?.evidenceEvaluations).toEqual([]);
  });

  it("returns no-assignments before querying meaning from empty comments", async () => {
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);

    const result = await getProgramHeadFeedback("program-bsed", feedbackFilters);

    expect(result?.emptyReason).toBe("no-assignments");
  });
});
