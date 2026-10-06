import { describe, expect, expectTypeOf, it } from "vitest";

import type { FacultyAnalyticsData, WordCloudToken } from "@/features/analytics/types";
import type {
  GeneralEducationAnalyticsFrameDTO,
  GeneralEducationCoursesDTO,
  GeneralEducationFeedbackDTO,
  GeneralEducationOutcomesDTO,
  GeneralEducationProgramsDTO,
  GeneralEducationTrendsDTO,
} from "@/features/analytics/general-education-analytics-types";
import type {
  ProgramHeadFeedbackDTO,
  ProgramHeadOverviewDTO,
  ProgramHeadTrendsDTO,
  ProgramHeadOutcomesDTO,
  ProgramHeadStakeholdersDTO,
  ProgramHeadBreakdownsDTO,
} from "@/features/analytics/program-head-analytics-types";
import type {
  IdentifiedCourseEvaluationDetail,
  IdentifiedSubmittedResponseDetail,
  SubmittedCiloAnswerBinding,
} from "@/features/response-review/types";

// §31/§36/§40 cross-role response privacy: identified Program Head shapes are
// pinned separately from aggregate analytics payloads, and aggregate
// analytics payloads remain de-identified. These checks pin compile-time
// shape separation and runtime serialization leakage in one place so a
// refactor cannot silently move raw answer content or respondent identity
// into a browser payload consumed by the wrong role.
describe("Cross-role response privacy DTO boundary (§36, §40, #548)", () => {
  it("Program Head identified DTO carries respondent identity and program context", () => {
    expectTypeOf<IdentifiedSubmittedResponseDetail["respondent"]>().toHaveProperty("name");
    expectTypeOf<IdentifiedSubmittedResponseDetail["respondent"]>().toHaveProperty("id");
    expectTypeOf<IdentifiedSubmittedResponseDetail["respondent"]>().toHaveProperty("stakeholder");
    expectTypeOf<IdentifiedSubmittedResponseDetail>().toHaveProperty("evaluation");
    expectTypeOf<IdentifiedSubmittedResponseDetail>().toHaveProperty("sections");
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

    // Outcomes: means per GO, no raw comments
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
    expectTypeOf<ProgramHeadFeedbackDTO["tokens"][number]>().toHaveProperty("responseCount");
    expectTypeOf<ProgramHeadFeedbackDTO>().toHaveProperty("tone");
    expectTypeOf<ProgramHeadFeedbackDTO["tokens"][number]>().not.toHaveProperty("email");
    // Token shape is closed — { text, value, responseCount }
    const token: WordCloudToken = { text: "learning", value: 3, responseCount: 1 };
    expect(Object.keys(token).sort()).toEqual(["responseCount", "text", "value"]);
    expect(JSON.stringify(token)).not.toContain("demo-student@cloie.test");
  });

  it("General Education coordinator analytics stays aggregate-only and college-wide", () => {
    expectTypeOf<GeneralEducationAnalyticsFrameDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationAnalyticsFrameDTO>().not.toHaveProperty("respondent");
    expectTypeOf<GeneralEducationOutcomesDTO>().not.toHaveProperty("respondent");
    expectTypeOf<GeneralEducationCoursesDTO>().not.toHaveProperty("respondent");
    expectTypeOf<GeneralEducationCoursesDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationProgramsDTO>().not.toHaveProperty("email");
    expectTypeOf<GeneralEducationTrendsDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationFeedbackDTO>().toHaveProperty("tokens");
    expectTypeOf<GeneralEducationFeedbackDTO>().not.toHaveProperty("text_content");
    expectTypeOf<GeneralEducationFeedbackDTO>().not.toHaveProperty("respondent");

    // A real Courses payload — the widest Coordinator DTO, since it carries
    // class-context section detail — must serialize without respondent
    // identity, raw ratings, or comment text.
    const courses: GeneralEducationCoursesDTO = {
      emptyReason: null,
      rows: [
        {
          courseId: "course-1",
          courseCode: "GEETHICS",
          courseTitle: "Ethics",
          sectionCount: 1,
          programCount: 1,
          evaluationOpportunityCount: 2,
          submittedResponseCount: 1,
          responseRate: 0.5,
          meanRating: 4.3125,
          ratingCount: 16,
          excludedRatingCount: 0,
          spansMultipleScales: false,
          instrumentContext: "GE CILO Evaluation v1",
          scaleGroups: [
            {
              scaleKey: "[[1,null],[2,null],[3,null],[4,null],[5,null]]",
              scaleLabel: "1–5 (5-point)",
              meanRating: 4.3125,
              ratingCount: 16,
              submittedResponseCount: 1,
              distribution: {
                scaleLabel: "1–5 (5-point)",
                maxValue: 5,
                categories: [{ value: 5, label: null, count: 16, percentage: 1 }],
              },
            },
          ],
          alignedIlos: [{ id: "ilo-1", code: "ILO 1" }],
          previousComparable: {
            periodLabel: "2025-2026 · 1st Semester · 1st Term",
            meanRating: 4.1,
            change: 0.21250000000000006,
          },
          evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "Ethics Post-Term" }],
          sections: [
            {
              evaluationId: "eval-1",
              programCode: "BSED",
              yearLevel: "1st Year",
              section: "Morning",
              facultyName: "Prof. Dela Cruz",
              submittedResponseCount: 1,
              evaluationOpportunityCount: 2,
              meanRating: 4.3125,
            },
          ],
        },
      ],
    };

    const serialized = JSON.stringify(courses);
    expect(serialized).not.toContain("55555555");
    expect(serialized).not.toContain("demo-student@cloie.test");
    expect(serialized).not.toContain("responseId");
    expect(serialized).not.toContain("rating_value");
    // Faculty name is class context for the section that produced the evidence,
    // never a ranking or a respondent.
    expect(serialized).toContain("Prof. Dela Cruz");
  });

  it("a submitted CILO answer names its typed layer and can carry only that layer's data", () => {
    // ADR 0035: the layer is the discriminator. A General Education answer
    // reaches ILOs and holds no GO fields; a Program-specific answer reaches
    // GOs and holds no ILO fields. One shape with both lists renamed would let
    // ILO rows ride in a GO field, so the variants are structurally distinct.
    expectTypeOf<SubmittedCiloAnswerBinding["layer"]>().toEqualTypeOf<
      "GRADUATE_OUTCOME" | "INSTITUTIONAL_OUTCOME"
    >();

    const institutional: SubmittedCiloAnswerBinding = {
      type: "CILO",
      layer: "INSTITUTIONAL_OUTCOME",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      iloMappings: [
        { iloId: "ilo-1", iloCode: "ILO1", iloDescription: "Think", manifestation: "LEARNING" },
      ],
    };
    expect(
      institutional.layer === "INSTITUTIONAL_OUTCOME" ? institutional.iloMappings : []
    ).toHaveLength(1);
    // The GO field is absent on this variant at both compile and run time, so
    // a General Education answer can never surface a Graduate Outcome row.
    // @ts-expect-error ILO rows must not be readable through a GO field name.
    expect(institutional.goMappings).toBeUndefined();

    const graduate: SubmittedCiloAnswerBinding = {
      type: "CILO",
      layer: "GRADUATE_OUTCOME",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      goMappings: [],
      directGoBindings: [],
    };
    // @ts-expect-error GO rows must not be readable through an ILO field name.
    expect(graduate.iloMappings).toBeUndefined();
  });

  it("a course evaluation detail declares which alignment layer its surfaces use", () => {
    expectTypeOf<IdentifiedCourseEvaluationDetail["alignmentLayer"]>().toEqualTypeOf<
      "GRADUATE_OUTCOME" | "INSTITUTIONAL_OUTCOME"
    >();
    // Identified review stays identified: the layer and ILO evidence rows add
    // no respondent identity of their own and no raw answer text.
    expectTypeOf<IdentifiedCourseEvaluationDetail["iloResults"]>().not.toHaveProperty(
      "text_content"
    );
    expectTypeOf<IdentifiedCourseEvaluationDetail["iloResults"]>().not.toHaveProperty("respondent");
  });

  it("Faculty analytics stays aggregate-only and carries no response-level fields", () => {
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("respondent");
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("email");
    expectTypeOf<FacultyAnalyticsData>().not.toHaveProperty("respondentId");
    expectTypeOf<FacultyAnalyticsData>().toHaveProperty("qualitative");
    expectTypeOf<FacultyAnalyticsData>().toHaveProperty("ratingDistributions");

    const feedbackClone: FacultyAnalyticsData = {
      filters: { view: "overview" },
      scopeLabel: "One faculty-owned evaluation",
      evaluations: [],
      kpi: {
        submittedResponseCount: 5,
        opportunityCount: 6,
        responseRate: 5 / 6,
        validRatingCount: 10,
        overallMean: 4.5,
        overallScaleLabel: "1–5 (5-point)",
        overallScaleMax: 5,
        spansMultipleScales: false,
      },
      ratingDistributions: [],
      ciloMetrics: [],
      questionMetrics: [],
      trends: [],
      qualitative: {
        available: true,
        submittedResponseCount: 5,
        responseCount: 5,
        itemCount: 5,
        evaluationCount: 1,
        tokens: [{ text: "learning", value: 2 }],
        tone: { scoredItemCount: 5, positive: 0, neutral: 5, negative: 0 },
        promptCounts: [],
      },
    };
    const serialized = JSON.stringify(feedbackClone);
    expect(serialized).not.toContain("demo-student@cloie.test");
    expect(serialized).not.toContain("Demo Student");
    expect(serialized).not.toContain("55555555");
  });

  it("serialised aggregate payloads never contain the reviewed qualitative fixture text verbatim", () => {
    const rawQualitative =
      "The hands-on coding exercises for linked lists and trees were very effective in solidifying CILO 1.";

    // The Feedback DTO is the aggregate shape that owns tokens. Build a valid
    // payload (no type casts) and pin that the browser-serialized form carries
    // only redacted word-frequency tokens, never the raw fixture text.
    const feedback: ProgramHeadFeedbackDTO = {
      scope: { programCode: "BSIT", programName: "BSIT", periodLabel: null },
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
      emptyReason: null,
      tokens: [{ text: "coding", value: 1, responseCount: 1 }],
      tone: { scoredItemCount: 1, positive: 0, neutral: 1, negative: 0 },
      qualitativeItemCount: 1,
      qualitativeResponseCount: 1,
      sourceCounts: [
        {
          sourceKey: "COURSE_STUDENT",
          sourceLabel: "Course-bound student evidence",
          itemCount: 1,
          responseCount: 1,
          tone: { scoredItemCount: 1, positive: 0, neutral: 1, negative: 0 },
        },
      ],
      promptCounts: [
        {
          sourceLabel: "Course-bound student evidence",
          promptLabel: "Remarks",
          instrumentId: "instrument-version-1",
          instrumentLabel: "Course Evaluation v1",
          itemCount: 1,
          responseCount: 1,
          tone: { scoredItemCount: 1, positive: 0, neutral: 1, negative: 0 },
          terms: [{ text: "coding", value: 1, responseCount: 1 }],
        },
      ],
      evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "IT201 Post-Term" }],
    };

    const serialized = JSON.stringify(feedback);
    expect(serialized).not.toContain(rawQualitative);
    expect(serialized).not.toContain("demo-student@cloie.test");
    expect(serialized).not.toContain("55555555");
    for (const token of feedback.tokens) {
      expect(JSON.stringify(token)).not.toContain(rawQualitative);
    }
  });
});
