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

const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("parseAnalyticsSearchParams", () => {
  it("defaults missing and invalid tabs to outcomes", () => {
    expect(parseAnalyticsSearchParams({})).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ tab: "invalid" })).toEqual({ tab: "outcomes" });
  });
  it("accepts canonical tabs", () => {
    for (const tab of ANALYTICS_TABS) expect(parseAnalyticsSearchParams({ tab })).toEqual({ tab });
  });
  it("sanitizes malformed values", () => {
    expect(parseAnalyticsSearchParams({ schoolYearId: "bad", termInstanceId: "bad", semester: "bad" })).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ schoolYearId: uuid, semester: "FIRST", termInstanceId: uuid })).toEqual({ tab: "outcomes", schoolYearId: uuid, semester: "FIRST", termInstanceId: uuid });
  });
  it("takes the first non-empty array value", () => {
    expect(parseAnalyticsSearchParams({ tab: ["", "trends"], schoolYearId: ["", uuid] })).toEqual({ tab: "trends", schoolYearId: uuid });
  });
  it("drops individual invalid values while keeping valid neighbors", () => {
    expect(parseAnalyticsSearchParams({ semester: "SPRING" })).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ schoolYearId: "bad" })).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ evidenceSource: "BOGUS" })).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ stakeholder: "BOGUS" })).toEqual({ tab: "outcomes" });
    expect(parseAnalyticsSearchParams({ schoolYearId: "bad", semester: "FIRST" })).toEqual({ tab: "outcomes", semester: "FIRST" });
  });
  it("drops incompatible stakeholder values", () => {
    expect(parseAnalyticsSearchParams({ evidenceSource: "COURSE", stakeholder: "ALUMNI" })).toEqual({ tab: "outcomes", evidenceSource: "COURSE" });
    expect(parseAnalyticsSearchParams({ evidenceSource: "ALUMNI", stakeholder: "STUDENT" })).toEqual({ tab: "outcomes", evidenceSource: "ALUMNI" });
    expect(parseAnalyticsSearchParams({ evidenceSource: "ALUMNI", stakeholder: "ALUMNI" })).toEqual({ tab: "outcomes", evidenceSource: "ALUMNI", stakeholder: "ALUMNI" });
  });
});

describe("analytics URLs", () => {
  it("omits the default outcomes tab", () => expect(buildAnalyticsUrl("program-1")).toBe("/program-head/programs/program-1/analytics"));
  it("keeps an explicit outcomes tab for reset links", () => expect(buildAnalyticsUrl("program-1", { tab: "outcomes" })).toBe("/program-head/programs/program-1/analytics?tab=outcomes"));
  it("omits undefined filter fields from the query string", () => {
    const url = buildAnalyticsUrl("program-1", { tab: "trends", semester: undefined });
    expect(url).toBe("/program-head/programs/program-1/analytics?tab=trends");
  });
  it("serializes filters", () => {
    const url = buildAnalyticsUrl("program-1", { tab: "trends", schoolYearId: uuid, semester: "FIRST", evidenceSource: "COURSE" });
    expect(url).toContain("tab=trends"); expect(url).toContain(`schoolYearId=${uuid}`); expect(url).toContain("semester=FIRST"); expect(url).toContain("evidenceSource=COURSE");
  });
  it("preserves filters on tab navigation", () => expect(buildAnalyticsTabUrl("program-1", "trends", { tab: "outcomes", termInstanceId: uuid })).toBe(`/program-head/programs/program-1/analytics?tab=trends&termInstanceId=${uuid}`));
  it("keeps raw duplicates for canonicalization", () => expect(rawAnalyticsSearchParamsToQueryString({ tab: ["trends", "outcomes"] })).toBe("tab=trends&tab=outcomes"));
  it("builds stable scope fingerprints from period and evidence fields", () => {
    expect(buildAnalyticsFilterFingerprint({ schoolYearId: uuid, semester: "FIRST", termInstanceId: uuid })).toBe(`${uuid}|FIRST|${uuid}||`);
    expect(buildAnalyticsFilterFingerprint({ schoolYearId: uuid, semester: "FIRST", termInstanceId: uuid, evidenceSource: "ALUMNI" })).toBe(`${uuid}|FIRST|${uuid}|ALUMNI|`);
    expect(buildAnalyticsFilterFingerprint({ schoolYearId: uuid, semester: "FIRST", termInstanceId: uuid, evidenceSource: "ALUMNI", stakeholder: "ALUMNI" })).toBe(`${uuid}|FIRST|${uuid}|ALUMNI|ALUMNI`);
    expect(buildAnalyticsFilterFingerprint({ evidenceSource: "ALUMNI" })).not.toBe(buildAnalyticsFilterFingerprint({ evidenceSource: "COURSE" }));
  });
});

describe("labels", () => {
  it("maps every canonical tab to its display label", () => {
    expect(ANALYTICS_TAB_LABELS).toEqual({
      outcomes: "Outcomes",
      courses: "Courses",
      stakeholders: "Stakeholders",
      trends: "Trends",
      qualitative: "Qualitative",
      ai: "AI Insights",
    });
  });
});
