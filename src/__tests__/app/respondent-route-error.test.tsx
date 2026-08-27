import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StudentError from "@/app/(app)/student/error";
import AlumniError from "@/app/(app)/alumni/error";
import IndustryPartnerError from "@/app/(app)/industry-partner/error";

const errorBoundaries = [
  [StudentError, "/student/dashboard"],
  [AlumniError, "/alumni/dashboard"],
  [IndustryPartnerError, "/industry-partner/dashboard"],
] as const;

describe("respondent route error boundaries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(errorBoundaries)(
    "explains the failure in plain language and offers retry plus dashboard recovery",
    (ErrorBoundary, returnHref) => {
      const reset = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => undefined);

      render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "We couldn't load this page" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Please try again. If it still won't load, return to your dashboard and try again later."
        )
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      const dashboardAction = screen.getByRole("button", { name: "Return to Dashboard" });
      expect(dashboardAction).toHaveAttribute("href", returnHref);

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      expect(reset).toHaveBeenCalledOnce();
    }
  );

  it.each(errorBoundaries)("never exposes internal error or digest details", (ErrorBoundary) => {
    const reset = vi.fn();
    const internalMessage = "database connection details";
    const digest = "private-error-digest";
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary error={Object.assign(new Error(internalMessage), { digest })} reset={reset} />
    );

    expect(screen.queryByText(internalMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(digest)).not.toBeInTheDocument();
    expect(screen.queryByText(/database|connection|stack/i)).not.toBeInTheDocument();
  });

  it.each(errorBoundaries)("logs a bounded, non-diagnostic error", (ErrorBoundary) => {
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary
        error={Object.assign(new Error("database connection details"), {
          digest: "private-error-digest",
        })}
        reset={reset}
      />
    );

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("Respondent route error");
  });
});
