import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SecretaryProgramsList } from "@/features/academic-structure/components/secretary-programs-list";

const preflightMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const toggleMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/admin-program-actions", () => ({
  preflightProgramDeletionAction: preflightMock,
  deleteProgramAction: deleteMock,
  toggleProgramActiveAction: toggleMock,
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
  });
  const mockPrograms = [
    {
      id: "prog-1",
      code: "BSCE",
      name: "Bachelor of Science in Civil Engineering",
      description: "Civil Engineering program",
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
      description: "Electrical Engineering program",
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
    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[1]);
    expect(await screen.findByText("Delete program")).toBeInTheDocument();
    expect(preflightMock).not.toHaveBeenCalled();
  });

  it("preflights on demand and requires exact code before deletion", async () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[1]);
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
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith({
      id: "prog-2",
      confirmationCode: " BSEE ",
      revision: "2026-07-11T00:00:00.000Z",
    }));
  });

  it("ignores preflight results from a closed dialog", async () => {
    let resolvePreflight!: (value: unknown) => void;
    preflightMock.mockReturnValueOnce(new Promise((resolve) => { resolvePreflight = resolve; }));
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[1]);
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
});
