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

const { duplicateFacultyTemplateActionMock, deleteFacultyTemplateActionMock } = vi.hoisted(() => ({
  duplicateFacultyTemplateActionMock: vi.fn(),
  deleteFacultyTemplateActionMock: vi.fn(),
}));

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
  boundCourseCode: "GESTECH",
  boundCourseTitle: "Ethics",
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
  boundCourseCode: null,
  boundCourseTitle: null,
  boundMajorId: null,
  boundProgramId: null,
};

const programOwned: FacultyTemplateItem = {
  ...institutional,
  id: "program-template-1",
  code: "PROGRAM_CILO_EVAL",
  name: "Program CILO Evaluation",
  programCode: "BSIT",
  programName: "Information Technology",
};

function renderPage({
  templates = [facultyCopy, programOwned, institutional],
  initialView = "card",
}: {
  templates?: FacultyTemplateItem[];
  initialView?: "card" | "list";
} = {}) {
  return render(
    <FacultyToolsPage
      evaluations={[]}
      program={{ id: "program-1", code: "BSIT", name: "Information Technology" }}
      templates={templates}
      initialTab="templates"
      initialView={initialView}
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

  test("groups owned copies separately from available source templates", () => {
    renderPage();

    const ownedSection = screen.getByRole("heading", { name: "My Templates" }).closest("section");
    const availableSection = screen
      .getByRole("heading", { name: "Available Templates" })
      .closest("section");

    expect(ownedSection).not.toBeNull();
    expect(availableSection).not.toBeNull();
    expect(within(ownedSection!).getByText("My CILO Evaluation")).toBeInTheDocument();
    expect(within(ownedSection!).queryByText("Program CILO Evaluation")).not.toBeInTheDocument();
    expect(within(availableSection!).getByText("Program CILO Evaluation")).toBeInTheDocument();
    expect(within(availableSection!).getByText("Course Evaluation")).toBeInTheDocument();
    expect(within(availableSection!).getByText("Program-owned")).toBeInTheDocument();
    expect(within(availableSection!).getByText("Institutional baseline")).toBeInTheDocument();
  });

  test("keeps the same two-section hierarchy in list view", () => {
    renderPage({ initialView: "list" });

    expect(screen.getByRole("table", { name: "My Templates" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Available Templates" })).toBeInTheDocument();
  });
  test("shows the bound course code on owned copies in card and list views", () => {
    const { unmount } = renderPage({ initialView: "card" });
    expect(screen.getByTitle("Bound course: GESTECH — Ethics")).toHaveTextContent("GESTECH");
    unmount();

    renderPage({ initialView: "list" });
    expect(screen.getByTitle("Bound course: GESTECH — Ethics")).toHaveTextContent("GESTECH");
  });

  test("warns on unbound owned copies without flagging baselines", () => {
    renderPage({
      templates: [
        {
          ...facultyCopy,
          id: "copy-unbound",
          boundCourseId: null,
          boundCourseCode: null,
          boundCourseTitle: null,
        },
        institutional,
      ],
    });

    const ownedSection = screen.getByRole("heading", { name: "My Templates" }).closest("section");
    const availableSection = screen
      .getByRole("heading", { name: "Available Templates" })
      .closest("section");

    expect(within(ownedSection!).getByText("No course selected")).toBeInTheDocument();
    expect(within(availableSection!).queryByText("No course selected")).not.toBeInTheDocument();
  });

  test("exposes the full description text in both views", () => {
    const longDescription =
      "The morning sun cast a golden glow through the tall pine trees. A cool breeze rustled the green leaves overhead.";
    const templates = [{ ...facultyCopy, description: longDescription }, institutional];

    const { unmount } = renderPage({ templates, initialView: "card" });
    expect(screen.getByTitle(longDescription)).toHaveTextContent(longDescription);
    unmount();

    renderPage({ templates, initialView: "list" });
    expect(screen.getByTitle(longDescription)).toHaveTextContent(longDescription);
  });
  test("right-aligns the shared view selector on templates and published tabs", () => {
    renderPage();

    const assertRightAlignedViewSelector = () => {
      const viewToolbar = screen.getByRole("toolbar", { name: "Evaluation tools view" });
      expect(viewToolbar.parentElement).toHaveClass("shrink-0");
      expect(viewToolbar.parentElement?.parentElement).toHaveClass(
        "justify-between",
        "sm:justify-end"
      );
    };

    assertRightAlignedViewSelector();

    fireEvent.click(screen.getByRole("tab", { name: "Published" }));
    assertRightAlignedViewSelector();
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
