import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CentralEvaluationDetail } from "@/features/response-review/components/central-evaluation-detail";
import { CourseEvaluationDetail } from "@/features/response-review/components/course-evaluation-detail";
import { ResponseDetail } from "@/features/response-review/components/response-detail";
import type {
  ProgramHeadCentralEvaluationDetail,
  ProgramHeadCourseEvaluationDetail,
  ProgramHeadSubmittedResponseDetail,
} from "@/features/response-review/types";

// Review surfaces must present academic-context values with the same friendly
// labels as the rest of the product (e.g. "2nd Semester — 2nd Term",
// "4th Year", "Afternoon"), never the raw enum stored in the database.

const activatedAt = new Date("2026-08-23T00:00:00.000Z");
const deadlineAt = new Date("2026-11-28T00:00:00.000Z");

function courseDetail(): ProgramHeadCourseEvaluationDetail {
  return {
    evaluation: {
      id: "eval-1",
      title: "GESTECH Post-Term CILO Evaluation",
      courseCode: "GESTECH",
      courseTitle: "Science, Technology and Society",
      facultyName: "Demo Faculty",
      yearLevel: "FOURTH_YEAR",
      section: "AFTERNOON",
      majorLabel: null,
      periodLabel: "2026-2027 — 2nd Semester — 2nd Term",
      activationAt: activatedAt,
      deadlineAt: deadlineAt,
      status: "ACTIVE",
    },
    summary: {
      eligibleCount: 1,
      submittedCount: 1,
      completionRate: 1,
      evaluationMean: 4.33,
      evaluationScaleCount: 1,
      ciloCount: 1,
      qualitativeAnswerCount: 0,
      qualitativeRespondentCount: 0,
    },
    participation: {
      assigned: 1,
      submitted: 1,
      inProgress: 0,
      notStarted: 0,
      completionRate: 1,
      stakeholders: [],
      respondents: { total: 1, complete: 1, partial: 0, notStarted: 0 },
    },
    ciloResults: [],
    questionResults: [],
    qualitative: { answerCount: 0, respondentCount: 0, prompts: [], topTerms: [] },
    respondents: [],
  };
}

function centralDetail(): ProgramHeadCentralEvaluationDetail {
  return {
    evaluation: {
      id: "central-1",
      title: "Alumni Exit Survey",
      stakeholder: "ALUMNI",
      targetProgramLabel: null,
      targetMajorLabel: null,
      targetYearLevel: "FOURTH_YEAR",
      instrumentVersion: 1,
      periodLabel: "2026-2027 — 2nd Semester — 2nd Term",
      activationAt: activatedAt,
      deadlineAt: deadlineAt,
      status: "SCHEDULED",
    },
    summary: {
      assignedCount: 0,
      submittedCount: 0,
      completionRate: null,
      evaluationMean: null,
      evaluationScaleCount: 0,
      qualitativeAnswerCount: 0,
      qualitativeRespondentCount: 0,
    },
    participation: {
      assigned: 0,
      submitted: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: null,
      stakeholders: [],
      respondents: { total: 0, complete: 0, partial: 0, notStarted: 0 },
    },
    ploResults: [],
    questionResults: [],
    qualitative: { answerCount: 0, respondentCount: 0, prompts: [], topTerms: [] },
    respondents: [],
  };
}
function responseDetail(): ProgramHeadSubmittedResponseDetail {
  return {
    responseId: "response-1",
    submittedAt: new Date("2026-08-24T00:00:00Z"),
    respondent: {
      id: "user-s1",
      name: "Juan dela Cruz",
      stakeholder: "STUDENT",
      studentContext: {
        programId: "prog-1",
        programLabel: "Bachelor of Science in Information Technology",
        majorId: null,
        majorLabel: null,
        yearLevel: "FOURTH_YEAR",
        section: "MORNING",
      },
    },
    evaluation: {
      id: "eval-1",
      type: "COURSE_BOUND",
      title: "GESTECH Post-Term CILO Evaluation",
      context: {
        courseCode: "GESTECH",
        courseTitle: "Science, Technology and Society",
        facultyName: "Demo Faculty",
        yearLevel: "FOURTH_YEAR",
        section: "MORNING",
        majorLabel: null,
        periodLabel: "2026-2027 — 2nd Semester — 2nd Term",
        termInstanceId: "term-1",
      },
    },
    quantitativeMean: 5,
    sections: [],
  };
}

describe("review surface academic-context labels", () => {
  it("course evaluation detail renders friendly year level, section, and status", () => {
    render(
      <CourseEvaluationDetail
        detail={courseDetail()}
        responseHref={() => "/r"}
        analyticsHref="/a"
      />
    );

    expect(screen.getByText(/4th Year/)).toBeInTheDocument();
    expect(screen.getByText(/Section Afternoon/)).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText(/FOURTH_YEAR|AFTERNOON|ACTIVE/)).not.toBeInTheDocument();
  });

  it("course evaluation detail keeps the friendly period label in the header", () => {
    render(
      <CourseEvaluationDetail
        detail={courseDetail()}
        responseHref={() => "/r"}
        analyticsHref="/a"
      />
    );

    const headerTexts = screen
      .getAllByText(/GESTECH|2nd Semester/)
      .map((element) => element.textContent)
      .join(" ");
    expect(headerTexts).toContain("2026-2027 — 2nd Semester — 2nd Term");
  });

  it("program-wide evaluation detail renders friendly year level and status", () => {
    render(
      <CentralEvaluationDetail
        detail={centralDetail()}
        responseHref={() => "/r"}
        analyticsHref="/a"
      />
    );

    expect(screen.getByText(/4th Year/)).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.queryByText(/FOURTH_YEAR|SCHEDULED/)).not.toBeInTheDocument();
  });

  it("submitted response detail renders the respondent context with friendly labels", () => {
    render(
      <ResponseDetail
        response={responseDetail()}
        evaluationHref="/e"
        analyticsHref="/a"
        programId="prog-1"
      />
    );

    expect(
      screen.getByText(/Bachelor of Science in Information Technology · 4th Year · Morning/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/FOURTH_YEAR|MORNING/)).not.toBeInTheDocument();
  });
});
