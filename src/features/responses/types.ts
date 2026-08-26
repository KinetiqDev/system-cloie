export type StudentEvaluationListStatus = "NOT_STARTED" | "IN_PROGRESS" | "DUE_SOON" | "SUBMITTED";

export type StudentEvaluationSection = {
  id: string;
  name: string;
  description: string;
  items: Array<
    | {
        kind: "quantitative";
        itemKey: string;
        prompt: string;
        scale: number[];
        descriptorLabels?: string[];
        required?: boolean;
      }
    | {
        kind: "qualitative";
        promptKey: string;
        prompt: string;
        suggestedResponses?: string[];
        required?: boolean;
      }
  >;
};

export type StudentEvaluationSession = {
  responseId: string | null;
  answeredItems: number;
  totalItems: number;
  submittedAt: Date | null;
};

// Shared DTO for student evaluation list views, including active and submitted entries.
export type StudentEvaluationListItem = {
  assignmentId: string;
  deploymentType: "CENTRAL" | "COURSE_BOUND";
  evaluationId: string;
  evaluationTitle: string;
  courseTitle: string | null;
  programLabel: string;
  facultyName: string | null;
  deadlineAt: Date | null;
  href: string | null;
  status: StudentEvaluationListStatus;
  progress: number;
  section: StudentEvaluationSection;
  session: StudentEvaluationSession;
};
