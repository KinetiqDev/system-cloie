import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FacultyToolsPage } from "@/features/instruments/components/faculty-tools-page";
import type { FacultyTemplateItem } from "@/features/instruments/services/list-faculty-templates";

const { routerPushMock, routerRefreshMock, showToastMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, refresh: routerRefreshMock }),
}));

vi.mock("@/components/ui/toast", () => ({ showToast: showToastMock }));

const { duplicateFacultyTemplateActionMock, deleteFacultyTemplateActionMock } = vi.hoisted(
  () => ({
    duplicateFacultyTemplateActionMock: vi.fn(),
    deleteFacultyTemplateActionMock: vi.fn(),
  })
);

vi.mock("@/lib/actions/faculty-template-actions", () => ({
  deleteFacultyTemplateAction: deleteFacultyTemplateActionMock,
  duplicateFacultyTemplateAction: duplicateFacultyTemplateActionMock,
}));

const facultyCopy: FacultyTemplateItem = {
  id: "copy-1",
  code: "CILO_EVAL_FAC_ABC_123",
  name: "My CILO Evaluation",
  description: "Course evaluation copy",
  is_active: true,
  is_faculty_accessible: false,
  templateType: "COURSE_BOUND",
  programCode: "BSIT",
  programName: "Information Technology",
  facultyOwnerId: "faculty-1",
  sourceTemplateId: "baseline-1",
  structure: [],
  templateCiloQuestionBindings: [],
  versionCount: 1,
  boundCourseId: "course-1",
  boundMajorId: null,
  boundProgramId: "program-1",
};

const institutional: FacultyTemplateItem = {
  id: "baseline-1",
  code: "CILO_EVAL",
  name: "Course Evaluation",
  description: null,
  is_active: true,
  is_faculty_accessible: true,
  templateType: "COURSE_BOUND",
  programCode: null,
  programName: null,
  facultyOwnerId: null,
  sourceTemplateId: null,
  structure: [],
  templateCiloQuestionBindings: [],
  versionCount: 1,
  boundCourseId: null,
  boundMajorId: null,
  boundProgramId: null,
};

function renderPage() {
  return render(
    <FacultyToolsPage
      evaluations={[]}
      program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
      templates={[facultyCopy, institutional]}
      initialTab="templates"
    />
  );
}

describe("FacultyToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/faculty/tools");
  });

  test("shows the delete kebab only on own copies", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: "Actions" })).toHaveLength(1);
    expect(screen.getByText("My CILO Evaluation")).toBeInTheDocument();
  });

  test("deletes an own copy through the confirmation dialog", async () => {
    deleteFacultyTemplateActionMock.mockResolvedValue({ success: true });
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    const deleteItem = screen
      .getAllByRole("menuitem")
      .find((item) => item.textContent?.includes("Delete"));
    expect(deleteItem).toBeDefined();
    fireEvent.click(deleteItem!);

    const dialog = await screen.findByRole("alertdialog", { name: "Delete Template" });
    expect(within(dialog).getByText("My CILO Evaluation")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteFacultyTemplateActionMock).toHaveBeenCalledWith("copy-1");
    });
    expect(routerRefreshMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  test("keeps the dialog open and shows the error when deletion is blocked", async () => {
    deleteFacultyTemplateActionMock.mockResolvedValue({
      success: false,
      error: "Templates with published evaluations cannot be deleted.",
    });
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    const deleteItem = screen
      .getAllByRole("menuitem")
      .find((item) => item.textContent?.includes("Delete"));
    fireEvent.click(deleteItem!);

    const dialog = await screen.findByRole("alertdialog", { name: "Delete Template" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        within(dialog).getByText("Templates with published evaluations cannot be deleted.")
      ).toBeInTheDocument();
    });
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});
