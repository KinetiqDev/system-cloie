import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateProgramHeadAnalyticsInsightAction } from "@/lib/actions/program-head-analytics-actions";

const { generateProgramHeadAnalyticsInsightMock } = vi.hoisted(() => ({
  generateProgramHeadAnalyticsInsightMock: vi.fn(),
}));

vi.mock("@/features/analytics/services/generate-program-head-analytics-insight", () => ({
  generateProgramHeadAnalyticsInsight: generateProgramHeadAnalyticsInsightMock,
}));

describe("generateProgramHeadAnalyticsInsightAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateProgramHeadAnalyticsInsightMock.mockResolvedValue({ ok: false, state: "disabled" });
  });

  it("passes only the validated program id and filter state to the service", async () => {
    const input = {
      programId: "11111111-1111-4111-8111-111111111111",
      filters: {
        tab: "ai",
        schoolYearId: "22222222-2222-4222-8222-222222222222",
        semester: "FIRST",
        termInstanceId: "33333333-3333-4333-8333-333333333333",
      },
    };
    await generateProgramHeadAnalyticsInsightAction(input);

    expect(generateProgramHeadAnalyticsInsightMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
      tab: "ai",
      schoolYearId: "22222222-2222-4222-8222-222222222222",
      semester: "FIRST",
      termInstanceId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("rejects client-supplied computed metrics or identities", async () => {
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: "11111111-1111-4111-8111-111111111111",
      filters: { tab: "ai" },
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
      filters: { tab: "ai" },
    });

    expect(result).toEqual({ ok: false, state: "invalid-request" });
    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid filter value", async () => {
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: "11111111-1111-4111-8111-111111111111",
      filters: { tab: "ai", semester: "SPRING" },
    });

    expect(result).toEqual({ ok: false, state: "invalid-request" });
    expect(generateProgramHeadAnalyticsInsightMock).not.toHaveBeenCalled();
  });

  it("returns the service result unchanged", async () => {
    generateProgramHeadAnalyticsInsightMock.mockResolvedValue({ ok: true, data: {} });
    const result = await generateProgramHeadAnalyticsInsightAction({
      programId: "11111111-1111-4111-8111-111111111111",
      filters: { tab: "ai" },
    });

    expect(result).toEqual({ ok: true, data: {} });
  });
});