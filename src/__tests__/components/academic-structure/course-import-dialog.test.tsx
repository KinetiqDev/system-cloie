import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CourseImportDialog } from "@/features/academic-structure/components/course-import-dialog";
import {
  previewCourseImportAction,
  confirmCourseImportAction,
} from "@/lib/actions/course-import-actions";
import { showToast } from "@/components/ui/toast";

vi.mock("@/lib/actions/course-import-actions", () => ({
  previewCourseImportAction: vi.fn(),
  confirmCourseImportAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: vi.fn(),
}));

describe("CourseImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 with download template and dropzone", () => {
    render(
      <CourseImportDialog
        open={true}
        onOpenChange={vi.fn()}
        config={{ mode: "general-education" }}
      />
    );

    expect(screen.getByText("Import Courses")).toBeInTheDocument();
    expect(screen.getByText("Download template")).toBeInTheDocument();
    expect(screen.getByText("Drop CSV here or choose a file")).toBeInTheDocument();
  });

  it("completes full 3-step import flow: file -> review -> results", async () => {
    const mockPreviewData = {
      summary: { total: 1, ready: 1, attention: 0, created: 0, notCreated: 0, notProcessed: 0 },
      rows: [
        {
          sourceIndex: 2,
          input: { course_code: "GEMATH" },
          courseCode: "GEMATH",
          courseTitle: "Math in the Modern World",
          courseScope: "GENERAL_EDUCATION" as const,
          courseType: null,
          programCode: null,
          programName: null,
          majorName: null,
          yearLevel: "FIRST_YEAR" as const,
          semester: "FIRST" as const,
          term: "FIRST_TERM" as const,
          status: "READY" as const,
          error: null,
        },
      ],
    };

    const mockConfirmData = {
      summary: { total: 1, ready: 0, attention: 0, created: 1, notCreated: 0, notProcessed: 0 },
      rows: [
        {
          sourceIndex: 2,
          input: { course_code: "GEMATH" },
          courseCode: "GEMATH",
          courseTitle: "Math in the Modern World",
          courseScope: "GENERAL_EDUCATION" as const,
          courseType: null,
          programCode: null,
          programName: null,
          majorName: null,
          yearLevel: "FIRST_YEAR" as const,
          semester: "FIRST" as const,
          term: "FIRST_TERM" as const,
          status: "READY" as const,
          outcome: "CREATED" as const,
          error: null,
        },
      ],
    };

    vi.mocked(previewCourseImportAction).mockImplementation(async () => ({
      success: true,
      data: mockPreviewData,
    }));

    vi.mocked(confirmCourseImportAction).mockImplementation(async () => ({
      success: true,
      data: mockConfirmData,
    }));

    render(
      <CourseImportDialog
        open={true}
        onOpenChange={vi.fn()}
        config={{ mode: "general-education" }}
      />
    );

    // Upload file via hidden input in document (portaled)
    const file = new File(
      [
        "course_code,course_title,year_level,semester,term\nGEMATH,Math,FIRST_YEAR,FIRST,FIRST_TERM\n",
      ],
      "test.csv",
      { type: "text/csv" }
    );
    const fileInput = document.querySelector("#course-import-file") as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Check file
    const checkFileButton = screen.getByRole("button", { name: "Check file" });
    await act(async () => {
      fireEvent.click(checkFileButton);
    });

    // Review step
    await waitFor(() => {
      expect(screen.getByText("Review Courses")).toBeInTheDocument();
    });

    // Confirm creation
    const createButton = screen.getByRole("button", { name: /create 1 course/i });
    await act(async () => {
      fireEvent.click(createButton);
    });

    // Results step
    await waitFor(() => {
      expect(screen.getByText("Import results")).toBeInTheDocument();
    });
    expect(showToast).toHaveBeenCalledWith("1 created. 0 not created.", "success");
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("renders a per-mode column guide in the file step", () => {
    render(
      <CourseImportDialog
        open={true}
        onOpenChange={vi.fn()}
        config={{ mode: "general-education" }}
      />
    );

    expect(screen.getByText("Column guide")).toBeInTheDocument();
    expect(screen.getByText("Course code")).toBeInTheDocument();
    expect(screen.getByText("Year level")).toBeInTheDocument();
    expect(screen.getByText(/1, 2, 3, or 4/)).toBeInTheDocument();
    // General Education template has no Course type or Program code columns.
    expect(screen.queryByText("Course type")).not.toBeInTheDocument();
    expect(screen.queryByText("Program code")).not.toBeInTheDocument();
  });

  it("renders program-head columns in the guide", () => {
    render(
      <CourseImportDialog
        open={true}
        onOpenChange={vi.fn()}
        config={{
          mode: "program-head",
          selectedProgram: { id: "p1", code: "BSIT", name: "Information Technology" },
          majors: [],
        }}
      />
    );

    expect(screen.getByText("Course type")).toBeInTheDocument();
    expect(screen.getByText('"Program Wide" or "Major Specific".')).toBeInTheDocument();
    expect(screen.getByText("Major name")).toBeInTheDocument();
  });
});
