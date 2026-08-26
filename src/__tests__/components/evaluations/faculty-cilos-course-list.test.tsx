import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/faculty/cilos",
  useSearchParams: () => new URLSearchParams(),
}));

import { FacultyCilosCourseList } from "@/features/evaluations/components/faculty-cilos-course-list";
import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const courses: FacultyCourseWithCiloCount[] = [
  {
    id: "course-1",
    code: "CS101",
    title: "Intro to Computing",
    courseScope: "PROGRAM_SPECIFIC",
    courseScopeLabel: "Program-Specific",
    programId: "program-1",
    programCode: "BSCS",
    programName: "BS Computer Science",
    majorId: null,
    majorName: null,
    ciloCount: 1,
  },
];

const loadCilosAction = vi.fn<
  (courseId: string) => Promise<{
    success: boolean;
    cilos?: { id: string; description: string }[];
    error?: string;
  }>
>();
const saveCilosAction =
  vi.fn<
    (
      courseId: string,
      cilos: { id?: string; description: string }[]
    ) => Promise<{ success: boolean; error?: string }>
  >();

function renderList() {
  return render(
    <FacultyCilosCourseList
      courses={courses}
      termInstances={[]}
      selectedTermId={undefined}
      loadCilosAction={loadCilosAction}
      saveCilosAction={saveCilosAction}
    />
  );
}

async function openModal() {
  loadCilosAction.mockResolvedValue({
    success: true,
    cilos: [{ id: "cilo-1", description: "Apply core concepts" }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Actions for CS101" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "View CILOs" }));
  await screen.findByRole("dialog");
  await waitFor(() => expect(loadCilosAction).toHaveBeenCalledWith("course-1"));
  expect(screen.getByDisplayValue("Apply core concepts")).toBeInTheDocument();
}

describe("FacultyCilosCourseList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the course table with scope badges and CILO counts", () => {
    renderList();

    expect(screen.getByRole("heading", { name: "Manage CILOs" })).toBeInTheDocument();
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("Intro to Computing")).toBeInTheDocument();
    expect(screen.getByText("Program-Specific")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("loads and displays CILOs when the modal opens", async () => {
    renderList();
    await openModal();

    expect(screen.getByText(/CILOs — CS101: Intro to Computing/i)).toBeInTheDocument();
  });

  it("adds and removes CILO entries before saving", async () => {
    renderList();
    await openModal();

    fireEvent.change(screen.getByPlaceholderText(/type a new cilo description/i), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByDisplayValue("Design instruction")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove CILO 2" }));
    expect(screen.queryByDisplayValue("Design instruction")).not.toBeInTheDocument();
  });

  it("shows a saving state with pending copy and aria-busy", async () => {
    renderList();
    await openModal();

    const pending = deferred<{ success: boolean; error?: string }>();
    saveCilosAction.mockReturnValue(pending.promise);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    const savingButton = screen.getByRole("button", { name: "Saving..." });
    expect(savingButton).toHaveAttribute("aria-busy", "true");
    expect(savingButton).toBeDisabled();

    pending.resolve({ success: true });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("CILOs saved successfully.");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("surfaces a failed save without closing the modal", async () => {
    renderList();
    await openModal();

    saveCilosAction.mockResolvedValue({ success: false, error: "Failed to save CILOs." });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save CILOs.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("links General Education courses to the alignment workspace", async () => {
    render(
      <FacultyCilosCourseList
        courses={[
          {
            id: "course-ge",
            code: "GESTECH",
            title: "Science, Technology and Society",
            courseScope: "GENERAL_EDUCATION",
            courseScopeLabel: "General Education",
            programId: null,
            programCode: null,
            programName: null,
            majorId: null,
            majorName: null,
            ciloCount: 3,
          },
        ]}
        termInstances={[]}
        selectedTermId={undefined}
        loadCilosAction={loadCilosAction}
        saveCilosAction={saveCilosAction}
      />
    );

    // DropdownMenuContent renders via Portal only after the trigger opens it.
    const trigger = screen.getByRole("button", { name: "Actions for GESTECH" });
    fireEvent.click(trigger);

    const alignLink = await screen.findByText("Map CILOs");
    expect(alignLink).toHaveAttribute("href", "/faculty/cilos/course-ge/alignment");
  });
});
