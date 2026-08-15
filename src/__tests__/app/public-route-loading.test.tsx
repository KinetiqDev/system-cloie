import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StaffPortalLoading from "@/app/(public)/portal/staff/loading";
import RespondentPortalLoading from "@/app/(public)/portal/respondents/loading";
import OnboardingLoading from "@/app/(public)/onboarding/loading";
import LoginLoading from "@/app/(public)/login/loading";
import StatusLoading from "@/app/(public)/status/[type]/loading";

const loadingRoutes = [
  [StaffPortalLoading, "Loading portal"],
  [RespondentPortalLoading, "Loading portal"],
  [OnboardingLoading, "Loading form"],
  [LoginLoading, "Loading page"],
  [StatusLoading, "Loading page"],
] as const;

describe("public route loading boundaries", () => {
  it.each(loadingRoutes)("renders identity-free geometry for %s", (Loading, label) => {
    render(<Loading />);

    const status = screen.getByRole("status", { name: label });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it.each(loadingRoutes)("leaks no account or role identity for %s", (Loading, label) => {
    render(<Loading />);

    const status = screen.getByRole("status", { name: label });

    expect(status).not.toHaveTextContent(
      /@|student|alumni|partner|faculty|secretary|dean|program head|202\d/i
    );
  });

  it("reserves the three role cards that the portal shell renders", () => {
    render(<StaffPortalLoading />);

    const status = screen.getByRole("status", { name: "Loading portal" });
    const grid = status.querySelector(".lg\\:grid-cols-3");

    expect(grid).toBeInTheDocument();
    expect(grid?.children).toHaveLength(3);
  });
});
