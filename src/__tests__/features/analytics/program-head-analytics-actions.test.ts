import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateProgramHeadAnalyticsInsightAction } from "@/lib/actions/program-head-analytics-actions";

const { generateProgramHeadAnalyticsInsightMock } = vi.hoisted(() => ({
  generateProgramHeadAnalyticsInsightMock: vi.fn(),
}));

vi.mock("@/features/analytics/services/generate-program-head-analytics-insight", () => ({
  generateProgramHeadAnalyticsInsight: generateProgramHeadAnalyticsInsightMock,
}));

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

describe("generateProgramHeadAnalyticsInsightAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateProgramHeadAnalyticsInsightMock.mockResolvedValue({ ok: false, state: "disabled" });
  });

  it("passes the validated program id, analytics view, and filter state to the service", async () => {
    const input = {
      programId: PROGRAM_ID,
      analyticsView: "outcomes",
      filters: {
        tab: "outcomes",
        schoolYearId: "22222222-2222-4222-8222-222222222222",
        semester: "FIRST",
        termInstanceId: "33333333-3333-4333-8333-333333333333",
      },
    };
    await generateProgramHeadAnalyticsInsightAction(input);

    expect(generateProgramHeadAnalyticsInsightMock).toHaveBeenCalledWith(
      PROGRAM_ID,
      {
        tab: "outcomes",
        schoolYearId: "22222222-2222-4222-8222-222222222222",
        semester: "FIRST",
        termInstanceId: "33333333-3333-4333-8333-333333333333",
      },
      "outcomes"
    );
  });

  it("rejects client-supplied computed metrics or identities", async () => {
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      analyticsView: "outcomes",
      filters: { tab: "outcomes" },
      submittedResponseCount: 9999,
      comments: ["raw comment"],
      identity: { email: "head@example.com" },
    });

    expect(result).toEqual({ ok: false, state: "invalid-request" });
    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed program id", async () => {
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: "not-a-uuid",
      analyticsView: "outcomes",
      filters: { tab: "outcomes" },
    });

    expect(result).toEqual({ ok: false, state: "invalid-request" });
    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid filter value", async () => {
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      analyticsView: "outcomes",
      filters: { tab: "outcomes", semester: "SPRING" },
    });

    expect(result).toEqual({ ok: false, state: "invalid-request" });
    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("rejects the removed AI tab and unknown analytics views", async () => {
    const removedTab = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      analyticsView: "outcomes",
      filters: { tab: "ai" },
    });
    expect(removedTab).toEqual({ ok: false, state: "invalid-request" });

    const unknownView = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      analyticsView: "ai",
      filters: { tab: "outcomes" },
    });
    expect(unknownView).toEqual({ ok: false, state: "invalid-request" });

    const missingView = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      filters: { tab: "outcomes" },
    });
    expect(missingView).toEqual({ ok: false, state: "invalid-request" });

    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("returns the service result unchanged", async () => {
    generateProgramHeadAnalyticsInsightMock.mockResolvedValue({ ok: true, data: {} });
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: PROGRAM_ID,
      analyticsView: "trends",
      filters: { tab: "trends" },
    });

    expect(result).toEqual({ ok: true, data: {} });
  });
});
