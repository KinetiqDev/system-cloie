import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecretaryProgramsList } from "@/features/academic-structure/components/secretary-programs-list";

describe("SecretaryProgramsList", () => {
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
      goCount: 12,
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
      goCount: 10,
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
    expect(screen.getByText("Programs with Majors")).toBeInTheDocument();
    expect(screen.getByText("Total Majors")).toBeInTheDocument();
  });

  it("displays program data in table", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getByText("BSCE")).toBeInTheDocument();
    expect(screen.getByText("Bachelor of Science in Civil Engineering")).toBeInTheDocument();
    expect(screen.getByText("BSEE")).toBeInTheDocument();
    expect(screen.getByText("Bachelor of Science in Electrical Engineering")).toBeInTheDocument();
  });

  it("shows active/inactive badges correctly", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("displays majors in program row", () => {
    render(<SecretaryProgramsList programs={mockPrograms} kpi={mockKPI} />);

    expect(screen.getByText("Structural Engineering, Water Resources")).toBeInTheDocument();
  });
});
