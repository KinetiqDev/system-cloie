import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/secretary/courses",
  useSearchParams: () => new URLSearchParams(),
}));

import { CourseForm } from "@/features/academic-structure/components/course-form";

describe("CourseForm temporal fields", () => {
  const mockAction = vi.fn().mockResolvedValue({ success: true });
  beforeEach(() => {
    mockAction.mockClear();
  });
  const mockPrograms = [
    { id: "prog-1", code: "BSCS", name: "BS Computer Science" },
    { id: "prog-2", code: "BSED", name: "BS Education" },
  ];
  const mockMajors = [
    { id: "major-1", name: "Computer Science", program_id: "prog-1", program_code: "BSCS" },
    { id: "major-2", name: "English", program_id: "prog-2", program_code: "BSED" },
  ];

  type CourseFormDefaultValues = Parameters<typeof CourseForm>[0]["defaultValues"];

  const renderCourseForm = (defaultValues?: CourseFormDefaultValues) => {
    return render(
      <CourseForm
        action={mockAction}
        programs={mockPrograms}
        majors={mockMajors}
        defaultValues={defaultValues}
        submitLabel="Save Course"
      />
    );
  };

  async function openAndSelect(label: RegExp, optionText: string) {
    const trigger = screen.getByLabelText(label);
    fireEvent.click(trigger);
    const option = await screen.findByRole("option", { name: optionText });
    fireEvent.focus(option);
    fireEvent.keyDown(option, { key: "Enter" });
    fireEvent.keyUp(option, { key: "Enter" });
  }

  describe("temporal field rendering", () => {
    it("renders Year Level, Semester, and Term selects after course scope/program/major block", () => {
      renderCourseForm();

      expect(screen.getByLabelText(/year level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/semester/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/term/i)).toBeInTheDocument();
    });

    it("labels temporal fields as optional/default", () => {
      renderCourseForm();

      const yearLevelTrigger = screen.getByLabelText(/year level/i);
      const semesterTrigger = screen.getByLabelText(/semester/i);
      const termTrigger = screen.getByLabelText(/term/i);

      // Trigger buttons should not be required
      expect(yearLevelTrigger).not.toHaveAttribute("required");
      expect(semesterTrigger).not.toHaveAttribute("required");
      expect(termTrigger).not.toHaveAttribute("required");
    });
  });

  describe("course scope select", () => {
    it("shows the human-readable label, not the raw enum value", () => {
      renderCourseForm();

      const scopeTrigger = screen.getByLabelText(/course scope/i);
      expect(scopeTrigger).toHaveTextContent("Program-Specific");
      expect(scopeTrigger).not.toHaveTextContent("PROGRAM_SPECIFIC");
    });

    it("switches the label when General Education is selected", async () => {
      renderCourseForm();

      const scopeTrigger = screen.getByLabelText(/course scope/i);
      await openAndSelect(/course scope/i, "General Education");

      await waitFor(() => {
        expect(scopeTrigger).toHaveTextContent("General Education");
        expect(scopeTrigger).not.toHaveTextContent("GENERAL_EDUCATION");
      });
    });
  });

  describe("course description input removal", () => {
    it("does not render a Description field", () => {
      renderCourseForm();

      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/course notes, scope, or governance context/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Summer semester disables Term field", () => {
    it("disables Term select when Summer semester is selected", async () => {
      renderCourseForm();

      const termTrigger = screen.getByLabelText(/term/i);

      await openAndSelect(/semester/i, "Summer");

      await waitFor(() => {
        expect(termTrigger).toBeDisabled();
      });
    });

    it("enables Term select when changing from Summer to regular semester", async () => {
      renderCourseForm();

      const termTrigger = screen.getByLabelText(/term/i);

      await openAndSelect(/semester/i, "Summer");
      await waitFor(() => {
        expect(termTrigger).toBeDisabled();
      });

      await openAndSelect(/semester/i, "1st Semester");

      await waitFor(() => {
        expect(termTrigger).not.toBeDisabled();
      });
    });

    it("shows helper text that Summer has no terms", async () => {
      renderCourseForm();

      await openAndSelect(/semester/i, "Summer");

      expect(screen.getByText(/summer semester has no terms/i)).toBeInTheDocument();
    });
  });

  describe("temporal defaults persistence on edit", () => {
    it("loads default_year_level, default_semester, default_term from defaultValues", () => {
      renderCourseForm({
        id: "course-1",
        code: "TEST101",
        title: "Test Course",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
        program_id: "prog-1",
        major_id: null,
        default_year_level: YearLevel.FIRST_YEAR,
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
      });

      expect(screen.getByLabelText(/year level/i)).toHaveTextContent("1st Year");
      expect(screen.getByLabelText(/semester/i)).toHaveTextContent("1st Semester");
      expect(screen.getByLabelText(/term/i)).toHaveTextContent("1st Term");
    });

    it("allows clearing temporal defaults to empty values", async () => {
      renderCourseForm({
        id: "course-1",
        code: "TEST101",
        title: "Test Course",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
        program_id: "prog-1",
        major_id: null,
        default_year_level: YearLevel.SECOND_YEAR,
        default_semester: AcademicSemester.SECOND,
        default_term: AcademicTerm.SECOND_TERM,
      });

      await openAndSelect(/year level/i, "None");
      expect(screen.getByLabelText(/year level/i)).toHaveTextContent("None");
    });
  });

  describe("form submission with temporal fields", () => {
    it("submits temporal field values in FormData", async () => {
      renderCourseForm();

      const submitButton = screen.getByRole("button", { name: /save course/i });

      await openAndSelect(/year level/i, "1st Year");
      await openAndSelect(/semester/i, "1st Semester");
      await openAndSelect(/term/i, "1st Term");

      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/course code/i), {
        target: { value: "TEST101" },
      });
      fireEvent.change(screen.getByLabelText(/course title/i), {
        target: { value: "Test Course" },
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
      });

      const formData = mockAction.mock.calls[0][0] as FormData;
      expect(formData.get("default_year_level")).toBe(YearLevel.FIRST_YEAR);
      expect(formData.get("default_semester")).toBe(AcademicSemester.FIRST);
      expect(formData.get("default_term")).toBe(AcademicTerm.FIRST_TERM);
    });

    it("submits null/empty term when Summer is selected", async () => {
      renderCourseForm();

      const submitButton = screen.getByRole("button", { name: /save course/i });

      await openAndSelect(/semester/i, "Summer");

      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/course code/i), {
        target: { value: "SUM101" },
      });
      fireEvent.change(screen.getByLabelText(/course title/i), {
        target: { value: "Summer Course" },
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled();
      });

      const formData = mockAction.mock.calls[0][0] as FormData;
      expect(formData.get("default_semester")).toBe(AcademicSemester.SUMMER);
      // Term should be empty or null for Summer
      const termValue = formData.get("default_term");
      expect(termValue === "" || termValue === null).toBe(true);
    });
  });
});

describe("CourseForm Zod validation for temporal fields", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("rejects Summer semester with non-null term via superRefine", async () => {
    const { createCourseSchema } = await import("@/features/academic-structure/schemas/course");

    const invalidData = {
      code: "TEST101",
      title: "Test Course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: validUuid,
      major_id: null,
      default_semester: AcademicSemester.SUMMER,
      default_term: AcademicTerm.FIRST_TERM, // Invalid: Summer should have null term
    };

    const result = createCourseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("default_semester"))).toBe(true);
    }
  });

  it("accepts Summer semester with null term", async () => {
    const { createCourseSchema } = await import("@/features/academic-structure/schemas/course");

    const validData = {
      code: "SUM101",
      title: "Summer Course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: validUuid,
      major_id: null,
      default_semester: AcademicSemester.SUMMER,
      default_term: null,
    };

    const result = createCourseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts regular semester with term", async () => {
    const { createCourseSchema } = await import("@/features/academic-structure/schemas/course");

    const validData = {
      code: "TEST101",
      title: "Test Course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: validUuid,
      major_id: null,
      default_semester: AcademicSemester.FIRST,
      default_term: AcademicTerm.FIRST_TERM,
    };

    const result = createCourseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts all temporal fields as optional (undefined)", async () => {
    const { createCourseSchema } = await import("@/features/academic-structure/schemas/course");

    const validData = {
      code: "TEST101",
      title: "Test Course",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: validUuid,
      major_id: null,
      // No temporal fields - should be valid
    };

    const result = createCourseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
