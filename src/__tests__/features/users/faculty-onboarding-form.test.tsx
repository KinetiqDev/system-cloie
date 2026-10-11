import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FacultyOnboardingForm } from "@/features/users/components/faculty-onboarding-form";
import { ROLES } from "@/lib/constants/roles";

const { createFacultyProfileMock, resetIncompleteRoleClaimMock, pushMock } = vi.hoisted(() => ({
  createFacultyProfileMock: vi.fn(),
  resetIncompleteRoleClaimMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-actions", () => ({
  createFacultyProfile: createFacultyProfileMock,
}));

vi.mock("@/lib/actions/onboarding-actions", () => ({
  resetIncompleteRoleClaim: resetIncompleteRoleClaimMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const PROGRAMS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Information Technology", code: "BSIT" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Business Administration", code: "BSBA" },
];

describe("FacultyOnboardingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders read-only faculty identity and program options", () => {
    render(
      <FacultyOnboardingForm email="faculty@acd.edu.ph" name="Amara Reyes" programs={PROGRAMS} />
    );

    expect(screen.getByDisplayValue("faculty@acd.edu.ph")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Amara Reyes")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Complete Registration/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancel and return to sign in/i })
    ).toBeInTheDocument();
  });

  it("submits the chosen program affiliation and redirects to /faculty/dashboard on success", async () => {
    createFacultyProfileMock.mockResolvedValue({ success: true });

    render(
      <FacultyOnboardingForm email="faculty@acd.edu.ph" name="Amara Reyes" programs={PROGRAMS} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /BSIT — Information Technology/i }));

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(createFacultyProfileMock).toHaveBeenCalledWith({
        program_id: "11111111-1111-4111-8111-111111111111",
      });
      expect(pushMock).toHaveBeenCalledWith("/faculty/dashboard");
    });
  });

  it("surfaces action errors when submission fails", async () => {
    createFacultyProfileMock.mockResolvedValue({
      success: false,
      error: "The selected program is archived or inactive.",
    });

    render(
      <FacultyOnboardingForm email="faculty@acd.edu.ph" name="Amara Reyes" programs={PROGRAMS} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /BSIT — Information Technology/i }));

    fireEvent.click(screen.getByRole("button", { name: /Complete Registration/i }));

    await waitFor(() => {
      expect(screen.getByText("The selected program is archived or inactive.")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  it("allows resetting the incomplete role claim to cancel", async () => {
    render(
      <FacultyOnboardingForm email="faculty@acd.edu.ph" name="Amara Reyes" programs={PROGRAMS} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel and return to sign in/i }));

    await waitFor(() => {
      expect(resetIncompleteRoleClaimMock).toHaveBeenCalledWith(ROLES.FACULTY);
    });
  });
});
