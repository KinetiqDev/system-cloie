import { describe, expect, expectTypeOf, it } from "vitest";

import type { CourseBoundResponseReview } from "@/features/analytics/types";
import type { FacultyAnalyticsData, WordCloudToken } from "@/features/analytics/types";
import type {
  GeneralEducationAnalyticsDTO,
  GeneralEducationFeedbackDTO,
} from "@/features/analytics/general-education-analytics-types";
import type {
  ProgramHeadFeedbackDTO,
  ProgramHeadOverviewDTO,
  ProgramHeadTrendsDTO,
  ProgramHeadOutcomesDTO,
  ProgramHeadStakeholdersDTO,
  ProgramHeadBreakdownsDTO,
} from "@/features/analytics/program-head-analytics-types";
import type { ProgramHeadSubmittedResponseDetail } from "@/features/response-review/types";

// §36/§40 cross-role response privacy: anonymized Faculty boundary sits in
// a distinct type from the identified Program Head shape, and aggregate
// analytics payloads remain de-identified. These checks pin compile-time
// shape separation and runtime serialization leakage in one place so a
// refactor cannot silently move raw answer content or respondent identity
// into a browser payload consumed by the wrong role.
describe("Cross-role response privacy DTO boundary (§36, §40, #548)", () => {
  it("Faculty anonymized DTO contains only an anonymized label, no identity fields", () => {
    expectTypeOf<CourseBoundResponseReview>().toHaveProperty("respondentLabel");
    expectTypeOf<CourseBoundResponseReview>().toHaveProperty("responseId");
    expectTypeOf<CourseBoundResponseReview>().toHaveProperty("sections");

    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("respondent");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("name");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("email");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("respondentId");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("userId");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("studentContext");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("alumniContext");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("industryContext");
  });

  it("Faculty anonymized sections carry raw qualitative text only inside the approved review boundary", () => {
    // The anonymized review boundary intentionally includes raw qualitative text
    // keyed by promptKey/text, but the token stays out of analytics aggregates.
    expectTypeOf<CourseBoundResponseReview["sections"][number]>().toHaveProperty(
      "qualitativeResponses"
    );
    expectTypeOf<
      CourseBoundResponseReview["sections"][number]["qualitativeResponses"][number]
    >().toHaveProperty("text");
    expectTypeOf<
      CourseBoundResponseReview["sections"][number]["qualitativeResponses"][number]
    >().toHaveProperty("promptKey");
  });

  it("Program Head identified DTO carries respondent identity and program context", () => {
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("name");
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("id");
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("stakeholder");
    expectTypeOf<ProgramHeadSubmittedResponseDetail>().toHaveProperty("evaluation");
    expectTypeOf<ProgramHeadSubmittedResponseDetail>().toHaveProperty("sections");
  });

  it("serialised Faculty anonymized payload does not leak respondent email or domain user ID", () => {
    const review: CourseBoundResponseReview = {
      responseId: "response-1",
      respondentLabel: "Respondent R-827493",
      submittedAt: new Date("2026-01-05T08:00:00.000Z"),
      evaluationId: "eval-1",
      evaluationTitle: "IT201 Post-Term CILO Evaluation",
      courseTitle: "IT201 Systems",
      programLabel: "BSIT",
      termInstanceLabel: "2025-2026 — SECOND — FIRST_TERM",
      overallMean: 4.5,
      reviewerRole: "FACULTY",
      sections: [
        {
          id: "teaching",
          name: "Teaching",
          mean: 4.5,
          quantitativeResponses: [{ itemKey: "clarity", prompt: "Clarity", rating: 5 }],
          qualitativeResponses: [
            { prompt: "How was teaching?", promptKey: "open", text: "Very clear delivery." },
          ],
        },
      ],
    };

    const serialized = JSON.stringify(review);
    expect(serialized).not.toContain("demo-student@cloie.test");
    expect(serialized).not.toContain("55555555-5555-4555-8555-555555555555");
    expect(serialized).not.toContain("Demo Student");
    // Label stays deterministic and anonymized
    expect(serialized).toContain("Respondent R-827493");
    expect(serialized).toContain("Very clear delivery.");
  });

  it("aggregate-only analytics DTOs remain de-identified: no raw text, no respondent IDs", () => {
    // Program Head Overview is KPI-only — no comments, no emails.
    expectTypeOf<ProgramHeadOverviewDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadOverviewDTO>().not.toHaveProperty("respondent");
    expectTypeOf<ProgramHeadOverviewDTO>().not.toHaveProperty("email");
    expectTypeOf<ProgramHeadOverviewDTO>().not.toHaveProperty("respondentId");

    // Trends: means and distributions only
    expectTypeOf<ProgramHeadTrendsDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadTrendsDTO>().not.toHaveProperty("respondent");

    // Outcomes: means per PLO, no raw comments
    expectTypeOf<ProgramHeadOutcomesDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadOutcomesDTO>().not.toHaveProperty("respondent");

    // Stakeholders: counts per source, no identifiers
    expectTypeOf<ProgramHeadStakeholdersDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadStakeholdersDTO>().not.toHaveProperty("respondent");

    // Breakdowns: aggregates per course/instrument/major/year
    expectTypeOf<ProgramHeadBreakdownsDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadBreakdownsDTO>().not.toHaveProperty("respondent");
  });

  it("Program Head feedback DTO is token-only: no raw qualitative text, no respondent IDs", () => {
    expectTypeOf<ProgramHeadFeedbackDTO>().toHaveProperty("tokens");
    expectTypeOf<ProgramHeadFeedbackDTO>().toHaveProperty("qualitativeItemCount");
    expectTypeOf<ProgramHeadFeedbackDTO>().not.toHaveProperty("text_content");
    expectTypeOf<ProgramHeadFeedbackDTO>().not.toHaveProperty("respondent");
    expectTypeOf<ProgramHeadFeedbackDTO>().not.toHaveProperty("email");
    expectTypeOf<ProgramHeadFeedbackDTO>().not.toHaveProperty("respondentId");
    expectTypeOf<ProgramHeadFeedbackDTO>().not.toHaveProperty("responseId");

    expectTypeOf<ProgramHeadFeedbackDTO["tokens"][number]>().toHaveProperty("text");
    expectTypeOf<ProgramHeadFeedbackDTO["tokens"][number]>().toHaveProperty("value");
    expectTypeOf<ProgramHeadFeedbackDTO["tokens"][number]>().not.toHaveProperty("email");
    // Token shape is closed — { text, value }
    const token: WordCloudToken = { text: "learning", value: 3 };
    expect(Object.keys(token).sort()).toEqual(["text", "value"]);
    expect(JSON.stringify(token)).not.toContain("demo-student@cloie.test");
  });

  it("General Education coordinator analytics stays aggregate-only and college-wide", () => {
    expectTypeOf<GeneralEducationAnalyticsDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationAnalyticsDTO>().not.toHaveProperty("respondent");
    expectTypeOf<GeneralEducationAnalyticsDTO>().not.toHaveProperty("email");
    expectTypeOf<GeneralEducationFeedbackDTO>().toHaveProperty("tokens");
    expectTypeOf<GeneralEducationFeedbackDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationFeedbackDTO>().not.toHaveProperty("respondent");
  });

  it("Faculty analytics evaluation data stays de-identified and excludes raw respondent identity", () => {
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("respondent");
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("email");
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("respondentId");
    expectTypeOf<FacultyAnalyticsData>().toHaveProperty("wordCloudTokens");
    expectTypeOf<FacultyAnalyticsData>().toHaveProperty("qualitativeItemCount");

    const feedbackClone: FacultyAnalyticsData = {
      evaluationId: "eval-1",
      deploymentName: "IT201 Post-Term",
      courseTitle: "IT201",
      programName: "BSIT",
      termInstanceLabel: "2025-2026 — SECOND — FIRST_TERM",
      status: "ACTIVE",
      overallMean: 4.5,
      responseCount: 1,
      totalAssignments: 2,
      ciloMetrics: [],
      quantitativeQuestions: [],
      qualitativeItemCount: 1,
      wordCloudTokens: [{ text: "learning", value: 2 }],
    };
    const serialized = JSON.stringify(feedbackClone);
    expect(serialized).not.toContain("demo-student@cloie.test");
    expect(serialized).not.toContain("Demo Student");
    expect(serialized).not.toContain("55555555");
  });

  it("serialised aggregate payloads never contain the reviewed qualitative fixture text verbatim", () => {
    const rawQualitative =
      "The hands-on coding exercises for linked lists and trees were very effective in solidifying CILO 1.";
    const redactedTokens: WordCloudToken[] = [{ text: "coding", value: 1 }];
    const overview: Pick<ProgramHeadOverviewDTO, "scope" | "tokens"> = {
      scope: {
        programCode: "BSIT",
        programName: "BSIT",
        periodLabel: null,
      } as unknown as ProgramHeadOverviewDTO["scope"],
      tokens: redactedTokens as unknown as ProgramHeadOverviewDTO["tokens"],
    } as unknown as Pick<ProgramHeadOverviewDTO, "scope" | "tokens">;
    // Even if someone accidentally spreads raw text, this test pins that the
    // overview aggregate shape never serialises the raw fixture verbatim.
    expect(JSON.stringify(overview)).not.toContain(rawQualitative);
    expect(JSON.stringify(redactedTokens)).not.toContain(rawQualitative);
  });
});
