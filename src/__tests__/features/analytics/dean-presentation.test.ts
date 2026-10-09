import { describe, expect, it } from "vitest";
import {
  deanScaleDomain,
  deanScopedParticipation,
} from "@/features/analytics/components/dean-presentation";
import type { DeanDeploymentEvidence } from "@/features/analytics/services/dean-analytics";

const deployment = (
  id: string,
  source: DeanDeploymentEvidence["source"],
  submitted: number,
  opportunities: number,
  programId = "p"
): DeanDeploymentEvidence => ({
  id,
  source,
  submitted,
  opportunities,
  programId,
  courseId: null,
  courseLabel: null,
  name: id,
  status: "CLOSED",
  periodId: "term",
  periodLabel: "Period",
  instrument: "Survey",
});

describe("Dean participation scope", () => {
  const rows = [
    deployment("course", "COURSE", 8, 10),
    deployment("alumni", "ALUMNI", 2, 4),
    deployment("ge", "GENERAL_EDUCATION", 10, 10),
    deployment("other", "ALUMNI", 9, 9, "other"),
  ];
  it("excludes General Education and other programs from program participation", () => {
    expect(deanScopedParticipation(rows, "p", { view: "outcomes" })).toEqual({
      submitted: 10,
      opportunities: 14,
      rate: (10 / 14) * 100,
    });
  });
  it("uses only the selected source and evaluation, including their intersection", () => {
    expect(deanScopedParticipation(rows, "p", { view: "outcomes", source: "ALUMNI" })).toEqual({
      submitted: 2,
      opportunities: 4,
      rate: 50,
    });
    expect(
      deanScopedParticipation(rows, "p", { view: "outcomes", evaluationId: "course" })
    ).toEqual({ submitted: 8, opportunities: 10, rate: 80 });
    expect(
      deanScopedParticipation(rows, "p", {
        view: "outcomes",
        source: "ALUMNI",
        evaluationId: "course",
      })
    ).toEqual({ submitted: 0, opportunities: 0, rate: null });
  });
});

describe("Dean frozen scale axes", () => {
  it("covers mixed five-point and ten-point evidence without clipping", () => {
    expect(deanScaleDomain(["1–5 (5-point)", "0–10 (11-point)"], [4.1, 8.2])).toEqual([0, 10]);
  });
  it("preserves negative and nonconsecutive descriptor values", () => {
    expect(deanScaleDomain(["3-point (-2, 0, 7)"], [3])).toEqual([-2, 7]);
  });
  it("uses actual means when scale metadata is unavailable", () => {
    expect(deanScaleDomain([null], [null, 8])).toEqual([8, 8]);
  });
});
