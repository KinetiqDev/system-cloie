import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createVersionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/curriculum-actions", () => ({
  createCurriculumVersionAction: createVersionMock,
}));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

import { CurriculumVersionForm } from "@/features/curriculum/components/curriculum-version-form";
import type {
  CurriculumPageProgram,
  SchoolYearOption,
} from "@/features/curriculum/types";

const PROGRAMS: CurriculumPageProgram[] = [
  { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
  { id: "prog-2", code: "BSED", name: "BS Education" },
];

const SCHOOL_YEARS: SchoolYearOption[] = [
  { id: "year-1", code: "2025-2026" },
  { id: "year-2", code: "2026-2027" },
];

describe("CurriculumVersionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createVersionMock.mockResolvedValue({ success: true, data: { id: "version-1" } });
  });

  it("validates that a code is required before submitting", async () => {
    render(
      <CurriculumVersionForm
        open
        onOpenChange={() => {}}
        programs={PROGRAMS}
        schoolYears={SCHOOL_YEARS}
        defaultProgramId="prog-1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));

    expect(await screen.findByText("Code is required")).toBeInTheDocument();
    expect(createVersionMock).not.toHaveBeenCalled();
  });

  it("requires a program when more than one is offered", async () => {
    render(
      <CurriculumVersionForm open onOpenChange={() => {}} programs={PROGRAMS} schoolYears={SCHOOL_YEARS} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));

    expect(await screen.findByText("Select a program")).toBeInTheDocument();
    expect(createVersionMock).not.toHaveBeenCalled();
  });

  it("shows a program error when no program exists", async () => {
    render(<CurriculumVersionForm open onOpenChange={() => {}} programs={[]} schoolYears={SCHOOL_YEARS} />);

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "BSIT-2030" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));

    expect(await screen.findByText("Select a program")).toBeInTheDocument();
    expect(createVersionMock).not.toHaveBeenCalled();
  });

  it("submits a new draft for the selected program", async () => {
    render(
      <CurriculumVersionForm
        open
        onOpenChange={() => {}}
        programs={PROGRAMS}
        schoolYears={SCHOOL_YEARS}
        defaultProgramId="prog-1"
      />
    );

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "BSIT-2030" } });
    fireEvent.change(screen.getByLabelText("Name (optional)"), {
      target: { value: "2030 Curriculum" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));

    await waitFor(() => expect(createVersionMock).toHaveBeenCalledTimes(1));
    expect(createVersionMock).toHaveBeenCalledWith({
      programId: "prog-1",
      code: "BSIT-2030",
      name: "2030 Curriculum",
      effectiveFromSchoolYearId: null,
    });
  });

  it("hides the program selector when only one program is offered", () => {
    render(
      <CurriculumVersionForm
        open
        onOpenChange={() => {}}
        programs={[PROGRAMS[0]]}
        schoolYears={SCHOOL_YEARS}
        defaultProgramId="prog-1"
      />
    );

    expect(screen.queryByLabelText("Program")).not.toBeInTheDocument();
  });

  it("submits null name and school year when left blank", async () => {
    render(
      <CurriculumVersionForm
        open
        onOpenChange={() => {}}
        programs={[PROGRAMS[0]]}
        schoolYears={SCHOOL_YEARS}
        defaultProgramId="prog-1"
      />
    );

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "BSIT-2040" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));

    await waitFor(() => expect(createVersionMock).toHaveBeenCalledTimes(1));
    expect(createVersionMock).toHaveBeenCalledWith({
      programId: "prog-1",
      code: "BSIT-2040",
      name: null,
      effectiveFromSchoolYearId: null,
    });
  });
});
