import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateGeneralEducationAnalyticsInsightAction } from "@/lib/actions/general-education-analytics-actions";

const { generateInsightMock } = vi.hoisted(() => ({
  generateInsightMock: vi.fn(),
}));

vi.mock("@/features/analytics/services/generate-general-education-analytics-insight", () => ({
  generateGeneralEducationAnalyticsInsight: generateInsightMock,
}));

const TAB = "outcomes";
const FILTERS = { tab: TAB };

describe("generateGeneralEducationAnalyticsInsightAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateInsightMock.mockResolvedValue({ ok: false, state: "disabled" });
  });

  it("passes only the requested view and validated filters to the service", async () => {
    await generateGeneralEducationAnalyticsInsightAction({ view: "outcomes", filters: FILTERS });

    expect(generateInsightMock).toHaveBeenCalledWith({ view: "outcomes", filters: FILTERS });
  });

  it("accepts every Coordinator view and every scope filter", async () => {
    for (const view of ["outcomes", "courses", "programs", "trends", "qualitative"]) {
      await generateGeneralEducationAnalyticsInsightAction({ view, filters: { tab: view } });
    }

    expect(generateInsightMock.mock.calls.map(([input]) => input.view)).toEqual([
      "outcomes",
      "courses",
      "programs",
      "trends",
      "qualitative",
    ]);
  });

  it("rejects client-supplied computed metrics, comments, or identities", async () => {
    const withAggregate = await generateGeneralEducationAnalyticsInsightAction({
      view: "outcomes",
      filters: { tab: "outcomes" },
      meanRating: 4.9,
    });
    const withComment = await generateGeneralEducationAnalyticsInsightAction({
      view: "qualitative",
      filters: { tab: "qualitative", comment: "respondent text" },
    });
    const withIdentity = await generateGeneralEducationAnalyticsInsightAction({
      view: "outcomes",
      filters: { tab: "outcomes" },
      respondentEmail: "student@example.test",
    });

    expect(withAggregate).toEqual({ ok: false, state: "invalid-request" });
    expect(withComment).toEqual({ ok: false, state: "invalid-request" });
    expect(withIdentity).toEqual({ ok: false, state: "invalid-request" });
    expect(generateInsightMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown view, an unknown tab, and a malformed filter value", async () => {
    const unknownView = await generateGeneralEducationAnalyticsInsightAction({
      view: "stakeholders",
      filters: FILTERS,
    });
    const unknownTab = await generateGeneralEducationAnalyticsInsightAction({
      view: "outcomes",
      filters: { tab: "ai" },
    });
    const badSemester = await generateGeneralEducationAnalyticsInsightAction({
      view: "outcomes",
      filters: { tab: "outcomes", semester: "THIRD" },
    });
    const badUuid = await generateGeneralEducationAnalyticsInsightAction({
      view: "outcomes",
      filters: { tab: "outcomes", courseId: "not-a-uuid" },
    });
    const missingView = await generateGeneralEducationAnalyticsInsightAction({ filters: FILTERS });

    for (const result of [unknownView, unknownTab, badSemester, badUuid, missingView]) {
      expect(result).toEqual({ ok: false, state: "invalid-request" });
    }
    expect(generateInsightMock).not.toHaveBeenCalled();
  });

  it("returns the service result unchanged when the request is valid", async () => {
    generateInsightMock.mockResolvedValue({ ok: true, data: { view: "trends" } });

    const result = await generateGeneralEducationAnalyticsInsightAction({
      view: "trends",
      filters: { tab: "trends" },
    });

    expect(result).toEqual({ ok: true, data: { view: "trends" } });
  });
});
