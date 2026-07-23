import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { YearLevel } from "@prisma/client";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/faculty/tools/publish",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/evaluations/components/assignment-picker", () => ({
  AssignmentPicker: ({
    assignments,
    value,
    onChange,
    label,
  }: {
    assignments: { id: string; courseCode: string; courseTitle: string }[];
    value: string | null;
    onChange: (id: string | null) => void;
    label?: string;
  }) => (
    <div>
      {label && <label htmlFor="assignment-picker-mock">{label}</label>}
      <select
        id="assignment-picker-mock"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={assignments.length === 0}
        aria-label={label ?? "Class Assignment"}
      >
        <option value="">Select a class assignment...</option>
        {assignments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.courseCode} - {a.courseTitle}
          </option>
        ))}
      </select>
      {assignments.length === 0 && <span>No assignments available</span>}
    </div>
  ),
}));

import { PublishCourseBoundEvaluationFormV2 } from "@/features/evaluations/components/publish-course-bound-evaluation-form-v2";
import type { AssignmentOption } from "@/features/evaluations/components/assignment-picker";

describe("PublishCourseBoundEvaluationFormV2", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });
  const publicationContext = {
    bindings: [
      {
        ciloDescriptionSnapshot: "Apply core concepts",
        ciloId: "cilo-1",
        itemKey: "q1",
        questionPromptSnapshot: "Students can apply the core concepts taught in the course.",
        sectionKey: "outcomes",
      },
      {
        ciloDescriptionSnapshot: "Build maintainable software",
        ciloId: "cilo-2",
        itemKey: "q2",
        questionPromptSnapshot: "Students can produce maintainable software artifacts.",
        sectionKey: "outcomes",
      },
    ],
    cilos: [
      { description: "Apply core concepts", id: "cilo-1" },
      { description: "Build maintainable software", id: "cilo-2" },
    ],
    course: {
      code: "CS101",
      id: "course-1",
      title: "Intro to Computing",
    },
    template: {
      id: "template-1",
      name: "Course-Bound CILO Evaluation",
      structure: [
        {
          key: "outcomes",
          title: "Learning Outcomes",
          order: 0,
          questions: [
            {
              key: "q1",
              prompt: "Students can apply the core concepts taught in the course.",
              type: "likert" as const,
              order: 0,
              required: true,
            },
            {
              key: "q2",
              prompt: "Students can produce maintainable software artifacts.",
              type: "likert" as const,
              order: 1,
              required: true,
            },
          ],
        },
      ],
    },
  };

  const assignments: AssignmentOption[] = [
    {
      id: "assignment-1",
      courseId: "course-1",
      courseCode: "CS101",
      courseTitle: "Intro to Computing",
      programId: "program-1",
      programCode: "BSCS",
      yearLevel: YearLevel.FIRST_YEAR,
      section: "MORNING",
      termInstanceId: "term-1",
      termInstanceLabel: "2025-2026 — 1st Semester — 1st Term",
      isActive: true,
    },
  ];

  it("renders the saved template context and bound cilos", () => {
    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        publicationContext={publicationContext}
        previewAction={vi.fn()}
        publishAction={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /publish cilo evaluation/i })).toBeInTheDocument();
    expect(screen.getByText("Course-Bound CILO Evaluation")).toBeInTheDocument();
    expect(screen.getAllByText("CS101 - Intro to Computing").length).toBeGreaterThan(0);
    expect(screen.getByText("Apply core concepts")).toBeInTheDocument();
    expect(
      screen.getByText(/students can apply the core concepts taught in the course/i)
    ).toBeInTheDocument();
    // Assignment picker exists
    expect(screen.getAllByText(/class assignment/i).length).toBeGreaterThan(0);
  });

  it("loads preview when assignment is selected then publishes with confirmed respondents", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          email: "alice@school.edu",
          firstName: "Alice",
          lastName: "Adams",
          majorId: null,
          majorName: null,
          membershipId: "membership-1",
          programCode: "BSCS",
          programId: "program-1",
          programName: "BS Computer Science",
          section: "MORNING",
          studentId: "S001",
          userId: "user-1",
          yearLevel: YearLevel.FIRST_YEAR,
        },
      ],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        assignmentCount: 1,
        evaluationId: "eval-1",
        status: "ACTIVE",
        targetCount: 1,
      },
    });

    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        publicationContext={publicationContext}
        previewAction={previewAction}
        publishAction={publishAction}
      />
    );

    fireEvent.change(screen.getByLabelText(/deployed evaluation name/i), {
      target: { value: "CS101 Post-Term CILO Evaluation" },
    });

    // Select assignment using the mocked native select
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "assignment-1" },
    });

    // Click Preview Respondents
    fireEvent.click(screen.getByRole("button", { name: /preview respondents/i }));

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledTimes(1);
    });

    // V2 form calls preview with assignmentId only
    expect(previewAction).toHaveBeenCalledWith({
      assignmentId: "assignment-1",
    });

    // Confirm and publish
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /publish evaluation/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /publish evaluation/i }));

    await waitFor(() => {
      expect(publishAction).toHaveBeenCalledTimes(1);
    });

    // V2 form calls publish with simplified payload
    expect(publishAction).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: "assignment-1",
        deploymentName: "CS101 Post-Term CILO Evaluation",
        exclusions: [],
        templateId: "template-1",
      })
    );
  });

  it("shows preview support reference on unexpected failure", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: false,
      error: "Failed to load respondent preview. Please try again.",
      referenceId: "support-ref",
    });

    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        publicationContext={publicationContext}
        previewAction={previewAction}
        publishAction={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/deployed evaluation name/i), {
      target: { value: "CS101 Post-Term CILO Evaluation" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "assignment-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview respondents/i }));

    expect(
      await screen.findByText(/Failed to load respondent preview\. Please try again\. Support reference: support-ref\./i)
    ).toBeInTheDocument();
  });

  it("shows empty state when no assignments available", () => {
    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={[]}
        publicationContext={publicationContext}
        previewAction={vi.fn()}
        publishAction={vi.fn()}
      />
    );

    // Picker is disabled and shows empty message
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText(/no assignments available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview respondents/i })).toBeDisabled();
  });

  it("hides template customization when publishing on behalf", () => {
    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        isOnBehalf
        publicationContext={publicationContext}
        previewAction={vi.fn()}
        publishAction={vi.fn()}
      />
    );

    expect(screen.queryByRole("link", { name: /edit template/i })).not.toBeInTheDocument();
  });

  it("redirects to successRedirectPath when provided on publish", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          email: "alice@school.edu",
          firstName: "Alice",
          lastName: "Adams",
          majorId: null,
          majorName: null,
          membershipId: "membership-1",
          programCode: "BSCS",
          programId: "program-1",
          programName: "BS Computer Science",
          section: "MORNING",
          studentId: "S001",
          userId: "user-1",
          yearLevel: YearLevel.FIRST_YEAR,
        },
      ],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        assignmentCount: 1,
        evaluationId: "eval-1",
        status: "ACTIVE",
        targetCount: 1,
      },
    });

    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        publicationContext={publicationContext}
        previewAction={previewAction}
        publishAction={publishAction}
        successRedirectPath="/program-head/tools"
      />
    );

    fireEvent.change(screen.getByLabelText(/deployed evaluation name/i), {
      target: { value: "CS101 Post-Term CILO Evaluation" },
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "assignment-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview respondents/i }));

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /publish evaluation/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /publish evaluation/i }));

    await waitFor(() => {
      expect(publishAction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/program-head/tools"));
    });
  });

  it("redirects to /faculty/tools by default when no successRedirectPath provided", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          email: "bob@school.edu",
          firstName: "Bob",
          lastName: "Brown",
          majorId: null,
          majorName: null,
          membershipId: "membership-2",
          programCode: "BSCS",
          programId: "program-1",
          programName: "BS Computer Science",
          section: "MORNING",
          studentId: "S002",
          userId: "user-2",
          yearLevel: YearLevel.FIRST_YEAR,
        },
      ],
    });
    const publishAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        assignmentCount: 1,
        evaluationId: "eval-2",
        status: "ACTIVE",
        targetCount: 1,
      },
    });

    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={assignments}
        publicationContext={publicationContext}
        previewAction={previewAction}
        publishAction={publishAction}
      />
    );

    fireEvent.change(screen.getByLabelText(/deployed evaluation name/i), {
      target: { value: "CS101 Default Redirect" },
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "assignment-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview respondents/i }));

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /publish evaluation/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /publish evaluation/i }));

    await waitFor(() => {
      expect(publishAction).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/faculty/tools"));
    });
  });

  it("shows all assignments without a term filter", () => {
    const multiAssignments: AssignmentOption[] = [
      {
        id: "assignment-1",
        courseId: "course-1",
        courseCode: "CS101",
        courseTitle: "Intro to Computing",
        programId: "program-1",
        programCode: "BSCS",
        yearLevel: YearLevel.FIRST_YEAR,
        section: null,
        termInstanceId: "term-1",
        termInstanceLabel: "2025-2026 — 1st Semester",
        isActive: true,
      },
      {
        id: "assignment-2",
        courseId: "course-1",
        courseCode: "CS101",
        courseTitle: "Intro to Computing",
        programId: "program-1",
        programCode: "BSCS",
        yearLevel: YearLevel.SECOND_YEAR,
        section: null,
        termInstanceId: "term-2",
        termInstanceLabel: "2025-2026 — 2nd Semester",
        isActive: true,
      },
    ];

    render(
      <PublishCourseBoundEvaluationFormV2
        assignments={multiAssignments}
        publicationContext={publicationContext}
        previewAction={vi.fn()}
        publishAction={vi.fn()}
      />
    );

    // No Academic Term filter should be present
    expect(screen.queryByText(/all terms/i)).not.toBeInTheDocument();
    // Class Assignment picker should still be visible
    expect(screen.getAllByText(/class assignment/i).length).toBeGreaterThan(0);
  });
});
