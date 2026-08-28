import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SecretaryProgramsList } from "@/features/academic-structure/components/secretary-programs-list";

const preflightMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const toggleMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/admin-program-actions", () => ({
  preflightProgramDeletionAction: preflightMock,
  deleteProgramAction: deleteMock,
  toggleProgramActiveAction: toggleMock,
  createProgramAction: createMock,
}));

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

describe("SecretaryProgramsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preflightMock.mockResolvedValue({
      success: true,
      data: {
        id: "prog-2",
        code: "BSEE",
        name: "Bachelor of Science in Electrical Engineering",
        isActive: false,
        revision: "2026-07-11T00:00:00.000Z",
        blockers: { inactive: false, linkedRecords: false },
        dependencies: {
          academicSetup: { majors: 0, courses: 0, plos: 0 },
          peopleAndHistory: { studentProfiles: 0, enrollments: 0, alumniProfiles: 0 },
          teaching: { courseAssignments: 0, facultyAffiliations: 0, programHeadAssignments: 0 },
          evaluation: { evaluationTargets: 0, centralDeployments: 0, instrumentTemplates: 0 },
          externalLinks: { stakeholderInvites: 0, industryPartnerProfiles: 0 },
        },
      },
    });
    deleteMock.mockResolvedValue({ success: true, data: { id: "prog-2" } });
    toggleMock.mockResolvedValue({ success: true, data: undefined });
    createMock.mockResolvedValue({ success: true });
  });
  const mockPrograms = [
    {
      id: "prog-1",
      code: "BSCE",
      name: "Bachelor of Science in Civil Engineering",
      isActive: true,
      majorNames: ["Structural Engineering", "Water Resources"],
      majorCount: 2,
      courseCount: 45,
      ploCount: 12,
      studentCount: 250,
      facultyCount: 18,
      majors: [
        { id: "major-1", name: "Structural Engineering", is_active: true },
        { id: "major-2", name: "Water Resources", is_active: true },
      ],
    },
    {
      id: "prog-2",
      code: "BSEE",
      name: "Bachelor of Science in Electrical Engineering",
      isActive: false,
      majorNames: ["Electronics", "Power Systems"],
      majorCount: 2,
      courseCount: 42,
      ploCount: 10,
      studentCount: 200,
      facultyCount: 15,
      majors: [
        { id: "major-3", name: "Electronics", is_active: true },
        { id: "major-4", name: "Power Systems", is_active: false },
      ],
    },
  ];

  const mockKPI = {
    totalPrograms: 2,
    activePrograms: 1,
    programsWithMajors: 2,
    totalMajors: 4,
  };

  it("renders programs list with KPI cards", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getByText("Academic Programs")).toBeInTheDocument();
    expect(screen.getByText("Total Programs")).toBeInTheDocument();
    expect(screen.getByText("With Majors")).toBeInTheDocument();
    expect(screen.getByText("Total Majors")).toBeInTheDocument();
  });

  it("displays program data in table", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getAllByText("BSCE")).toHaveLength(2);
    expect(screen.getAllByText("Bachelor of Science in Civil Engineering")).toHaveLength(2);
    expect(screen.getAllByText("BSEE")).toHaveLength(2);
    expect(screen.getAllByText("Bachelor of Science in Electrical Engineering")).toHaveLength(2);
  });

  it("shows active/inactive badges correctly", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Inactive")).toHaveLength(2);
  });

  it("displays majors in program row", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getAllByText("Structural Engineering, Water Resources")).toHaveLength(2);
  });

  it("shows Delete program only after opening a row action menu", async () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.queryByText("Delete program")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Actions for/ })[1]);
    expect(await screen.findByText("Delete program")).toBeInTheDocument();
    expect(preflightMock).not.toHaveBeenCalled();
  });

  it("preflights on demand and requires exact code before deletion", async () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Actions for/ })[1]);
    fireEvent.click(await screen.findByText("Delete program"));

    await waitFor(() => expect(preflightMock).toHaveBeenCalledWith("prog-2"));
    const input = await screen.findByLabelText(/type/i);
    const deleteButton = screen.getByRole("button", { name: /delete permanently/i });
    expect(deleteButton).toBeDisabled();
    fireEvent.change(input, { target: { value: "bsee" } });
    expect(deleteButton).toBeDisabled();
    fireEvent.change(input, { target: { value: " BSEE " } });
    expect(deleteButton).toBeEnabled();
    fireEvent.click(deleteButton);
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith({
        id: "prog-2",
        confirmationCode: " BSEE ",
        revision: "2026-07-11T00:00:00.000Z",
      })
    );
  });

  it("ignores preflight results from a closed dialog", async () => {
    let resolvePreflight!: (value: unknown) => void;
    preflightMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePreflight = resolve;
      })
    );
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Actions for/ })[1]);
    fireEvent.click(await screen.findByText("Delete program"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    resolvePreflight({
      success: true,
      data: {
        id: "prog-2",
        code: "STALE",
        name: "Bachelor of Science in Electrical Engineering",
        isActive: false,
        revision: "2026-07-11T00:00:00.000Z",
        blockers: { inactive: false, linkedRecords: false },
        dependencies: {
          academicSetup: { majors: 0, courses: 0, plos: 0 },
          peopleAndHistory: { studentProfiles: 0, enrollments: 0, alumniProfiles: 0 },
          teaching: { courseAssignments: 0, facultyAffiliations: 0, programHeadAssignments: 0 },
          evaluation: { evaluationTargets: 0, centralDeployments: 0, instrumentTemplates: 0 },
          externalLinks: { stakeholderInvites: 0, industryPartnerProfiles: 0 },
        },
      },
    });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("opens the create dialog from the CTA", async () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create Program/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Create Program" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Program Code")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Program Name")).toBeInTheDocument();
  });

  it("keeps the primary create action visible and specifically named", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    const createButton = screen.getByRole("button", { name: "Create Program" });
    expect(createButton).toHaveTextContent("Create Program");
  });

  it("creates a program from the dialog and refreshes the list", async () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);
    fireEvent.click(screen.getByRole("button", { name: /Create Program/ }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Program Code"), {
      target: { value: "bscs" },
    });
    fireEvent.change(within(dialog).getByLabelText("Program Name"), {
      target: { value: "Bachelor of Science in Computer Science" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Program" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const formData = createMock.mock.calls[0][0] as FormData;
    expect(formData.get("code")).toBe("bscs");
    expect(formData.get("name")).toBe("Bachelor of Science in Computer Science");
    expect(formData.get("description")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refreshMock).toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the error when creation fails", async () => {
    createMock.mockResolvedValue({
      success: false,
      error: 'A program with code "BSIT" already exists.',
    });
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);
    fireEvent.click(screen.getByRole("button", { name: /Create Program/ }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Program Code"), {
      target: { value: "BSIT" },
    });
    fireEvent.change(within(dialog).getByLabelText("Program Name"), {
      target: { value: "Bachelor of Science in Information Technology" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Program" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        'A program with code "BSIT" already exists.'
      )
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
