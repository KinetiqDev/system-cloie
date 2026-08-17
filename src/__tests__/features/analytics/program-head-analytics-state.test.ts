import { describe, expect, it } from "vitest";
import {
  ANALYTICS_TABS,
  ANALYTICS_TAB_LABELS,
  buildAnalyticsFilterFingerprint,
  buildAnalyticsTabUrl,
  buildAnalyticsUrl,
  parseAnalyticsSearchParams,
  rawAnalyticsSearchParamsToQueryString,
} from "@/features/analytics/services/program-head-analytics-state";

describe("parseAnalyticsSearchParams", () => {
  it("defaults missing tab to overview", () => {
    expect(parseAnalyticsSearchParams({})).toEqual({ tab: "overview" });
  });

  it("defaults invalid tab to overview", () => {
    expect(parseAnalyticsSearchParams({ tab: "invalid" })).toEqual({ tab: "overview" });
  });

  it("accepts all valid tabs", () => {
    for (const tab of ANALYTICS_TABS) {
      expect(parseAnalyticsSearchParams({ tab })).toEqual(
        expect.objectContaining({ tab })
      );
    }
  });

  it("drops invalid UUID schoolYearId", () => {
    const result = parseAnalyticsSearchParams({ schoolYearId: "not-a-uuid" });
    expect(result.schoolYearId).toBeUndefined();
  });

  it("keeps valid UUID schoolYearId", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const result = parseAnalyticsSearchParams({ schoolYearId: uuid });
    expect(result.schoolYearId).toBe(uuid);
  });

  it("drops invalid semester", () => {
    const result = parseAnalyticsSearchParams({ semester: "INVALID" });
    expect(result.semester).toBeUndefined();
  });

  it("keeps valid semester values", () => {
    for (const semester of ["FIRST", "SECOND", "SUMMER"]) {
      const result = parseAnalyticsSearchParams({ semester });
      expect(result.semester).toBe(semester);
    }
  });

  it("drops invalid UUID termInstanceId", () => {
    const result = parseAnalyticsSearchParams({ termInstanceId: "bad" });
    expect(result.termInstanceId).toBeUndefined();
  });

  it("keeps valid UUID termInstanceId", () => {
    const uuid = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
    const result = parseAnalyticsSearchParams({ termInstanceId: uuid });
    expect(result.termInstanceId).toBe(uuid);
  });

  it("handles array values by taking the first non-empty entry", () => {
    const result = parseAnalyticsSearchParams({ tab: ["outcomes", "trends"] });
    expect(result.tab).toBe("outcomes");
  });

  it("handles empty string values", () => {
    const result = parseAnalyticsSearchParams({ tab: "" });
    expect(result.tab).toBe("overview");
  });
});

describe("rawAnalyticsSearchParamsToQueryString", () => {
  it("preserves duplicate values for canonicalization checks", () => {
    expect(
      rawAnalyticsSearchParamsToQueryString({ tab: ["outcomes", "trends"] })
    ).toBe("tab=outcomes&tab=trends");
  });

  it("preserves whitespace for canonicalization checks", () => {
    expect(rawAnalyticsSearchParamsToQueryString({ tab: " outcomes " })).toBe(
      "tab=+outcomes+"
    );
  });
});

describe("buildAnalyticsUrl", () => {
  const programId = "program-1";

  it("returns the base analytics path with no params", () => {
    expect(buildAnalyticsUrl(programId)).toBe(
      "/program-head/programs/program-1/analytics"
    );
  });

  it("omits tab=overview from the URL since it is the default", () => {
    expect(buildAnalyticsUrl(programId, { tab: "overview" })).toBe(
      "/program-head/programs/program-1/analytics"
    );
  });

  it("includes non-default tab", () => {
    const url = buildAnalyticsUrl(programId, { tab: "outcomes" });
    expect(url).toContain("tab=outcomes");
  });

  it("includes all filter params when present", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const url = buildAnalyticsUrl(programId, {
      tab: "trends",
      schoolYearId: uuid,
      semester: "FIRST",
      termInstanceId: uuid,
    });
    expect(url).toContain("tab=trends");
    expect(url).toContain(`schoolYearId=${uuid}`);
    expect(url).toContain("semester=FIRST");
    expect(url).toContain(`termInstanceId=${uuid}`);
  });

  it("omits undefined filter params", () => {
    const url = buildAnalyticsUrl(programId, { tab: "outcomes" });
    expect(url).not.toContain("schoolYearId");
    expect(url).not.toContain("semester");
    expect(url).not.toContain("termInstanceId");
  });
});

describe("buildAnalyticsTabUrl", () => {
  it("changes the tab while preserving existing filters", () => {
    const url = buildAnalyticsTabUrl("program-1", "outcomes", {
      tab: "overview",
      schoolYearId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    expect(url).toContain("tab=outcomes");
    expect(url).toContain("schoolYearId=a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });
});

describe("ANALYTICS_TAB_LABELS", () => {
  it("has a label for every tab", () => {
    for (const tab of ANALYTICS_TABS) {
      expect(ANALYTICS_TAB_LABELS[tab]).toBeTruthy();
    }
  });

  it("labels the ai tab as AI Insights", () => {
    expect(ANALYTICS_TAB_LABELS.ai).toBe("AI Insights");
  });
});

describe("buildAnalyticsFilterFingerprint", () => {
  it("is deterministic for an empty scope", () => {
    expect(buildAnalyticsFilterFingerprint({})).toBe("||");
    expect(buildAnalyticsFilterFingerprint({})).toBe(buildAnalyticsFilterFingerprint({}));
  });

  it("joins the canonical period filter fields in a stable order", () => {
    expect(
      buildAnalyticsFilterFingerprint({
        schoolYearId: "school-year-1",
        semester: "FIRST",
        termInstanceId: "term-1",
      })
    ).toBe("school-year-1|FIRST|term-1");
  });

  it("distinguishes scopes that differ by any single filter", () => {
    const base = { schoolYearId: "school-year-1", semester: "FIRST", termInstanceId: "term-1" };
    expect(buildAnalyticsFilterFingerprint(base)).not.toBe(
      buildAnalyticsFilterFingerprint({ ...base, termInstanceId: "term-2" })
    );
    expect(buildAnalyticsFilterFingerprint(base)).not.toBe(
      buildAnalyticsFilterFingerprint({ ...base, semester: "SECOND" })
    );
    expect(buildAnalyticsFilterFingerprint(base)).not.toBe(
      buildAnalyticsFilterFingerprint({ ...base, schoolYearId: "school-year-2" })
    );
  });

  it("is stable across repeated computations for the same scope", () => {
    const filters = { schoolYearId: "school-year-1", semester: "SECOND", termInstanceId: "term-9" };
    expect(buildAnalyticsFilterFingerprint(filters)).toBe(buildAnalyticsFilterFingerprint(filters));
  });
});
