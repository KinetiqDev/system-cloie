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
    "offers local recovery without exposing exception details",
    (ErrorBoundary, returnHref) => {
      const reset = vi.fn();
      const internalMessage = "database connection details";
      const digest = "private-error-digest";
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      render(
        <ErrorBoundary
          error={Object.assign(new Error(internalMessage), { digest })}
          reset={reset}
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "We couldn't load this page" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Return to Dashboard" })).toHaveAttribute(
        "href",
        returnHref
      );
      expect(screen.queryByText(internalMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(digest)).not.toBeInTheDocument();
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith("Respondent route error");

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      expect(reset).toHaveBeenCalledOnce();
    }
  );
});
