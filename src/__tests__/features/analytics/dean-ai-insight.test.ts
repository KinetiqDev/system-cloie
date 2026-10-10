import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDeanAiPacket,
  generateDeanAiInsight,
} from "@/features/analytics/services/dean-ai-insight";
const { auth, config, evidence } = vi.hoisted(() => ({
  auth: vi.fn(),
  config: vi.fn(),
  evidence: vi.fn(),
}));
vi.mock("@/features/analytics/services/dean-analytics", () => ({ requireDeanAnalytics: auth }));
vi.mock("@/features/analytics/services/dean-evidence", () => ({ getDeanEvidence: evidence }));
vi.mock("@/features/analytics/services/program-head-ai-schema", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadAiConfiguration: config,
}));
const college = {
  kind: "college" as const,
  invalidProgram: false,
  college: {
    summary: {
      submitted: 30,
      opportunities: 50,
      rate: 60,
      deployments: 3,
      active: 1,
      closedIncomplete: 1,
    },
    programRows: [],
    programs: [],
    periods: [],
    evidence: [],
    invalidPeriod: false,
  },
};
describe("Dean AI boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ activeRole: "DEAN" });
    config.mockReturnValue({
      apiKey: "test",
      baseUrl: "https://example.test",
      model: "test",
      minimumSubmittedResponses: 5,
      minimumQualitativeItems: 5,
      maxPacketChars: 16000,
    });
    evidence.mockResolvedValue(college);
  });
  it("authorizes before configuration or evidence", async () => {
    auth.mockResolvedValue(null);
    expect(await generateDeanAiInsight({ view: "college" })).toEqual({
      ok: false,
      state: "unauthorized",
    });
    expect(evidence).not.toHaveBeenCalled();
  });
  it("rejects client-supplied aggregates", async () => {
    expect(await generateDeanAiInsight({ view: "college", rawComments: ["private"] })).toEqual({
      ok: false,
      state: "invalid-request",
    });
    expect(evidence).not.toHaveBeenCalled();
  });
  it("handles disabled and missing config without provider calls", async () => {
    config.mockReturnValue(null);
    expect(await generateDeanAiInsight({ view: "college" })).toEqual({
      ok: false,
      state: "disabled",
    });
    expect(evidence).not.toHaveBeenCalled();
  });
  it("requires sufficient evidence", async () => {
    evidence.mockResolvedValue({
      ...college,
      college: { ...college.college, summary: { ...college.college.summary, submitted: 0 } },
    });
    expect(await generateDeanAiInsight({ view: "college" })).toEqual({
      ok: false,
      state: "insufficient-evidence",
    });
  });
  it.each([
    { timedOut: true, state: "timeout" },
    { timedOut: false, state: "provider-error" },
  ])("handles $state", async ({ timedOut, state }) => {
    expect(
      await generateDeanAiInsight({ view: "college" }, async () => ({ ok: false, timedOut }))
    ).toEqual({ ok: false, state });
  });
  it("rejects malformed output", async () => {
    expect(
      await generateDeanAiInsight({ view: "college" }, async () => ({ ok: true, content: "wrong" }))
    ).toEqual({ ok: false, state: "invalid-output" });
  });
  it("returns bounded validated interpretation over rebuilt evidence", async () => {
    const transport = vi.fn().mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        observation: "Evidence is incomplete.",
        evidence: ["30 submissions among 50 opportunities"],
        limitation: "Different populations",
        reviewQuestion: "Which cycles remain open?",
      }),
    });
    const result = await generateDeanAiInsight({ view: "college" }, transport);
    expect(result.ok).toBe(true);
    expect(evidence).toHaveBeenCalledWith({ view: "college" });
    expect(transport.mock.calls[0][0].userMessage).not.toMatch(/respondent_id|text_content|email/);
  });
  it("projects only allowlisted aggregates and bounds rows", () => {
    const result = buildDeanAiPacket({
      ...college,
      college: {
        ...college.college,
        programRows: Array.from({ length: 50 }, () => ({
          id: "secret",
          name: "private",
          code: "X".repeat(500),
          is_active: true,
          courseAssignmentCount: 1,
          unevaluatedAssignmentCount: 0,
          submitted: 3,
          opportunities: 5,
          rate: 60,
          deployments: 1,
          active: 0,
          closedIncomplete: 1,
        })),
      },
    });
    expect(result.programs).toHaveLength(20);
    expect(result.programs[0].code).toHaveLength(120);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("private");
  });
});

it("withholds a sparse selected program despite abundant college submissions", async () => {
  auth.mockResolvedValue({ activeRole: "DEAN" });
  config.mockReturnValue({
    minimumSubmittedResponses: 5,
    minimumQualitativeItems: 5,
    maxPacketChars: 16000,
  });
  evidence.mockResolvedValue(college);
  const transport = vi.fn();
  expect(
    await generateDeanAiInsight(
      { view: "outcomes", programId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      transport
    )
  ).toEqual({ ok: false, state: "insufficient-evidence" });
  expect(transport).not.toHaveBeenCalled();
});
