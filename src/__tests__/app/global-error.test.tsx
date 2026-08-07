import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GlobalError from "@/app/global-error";

const assign = vi.fn();

describe("GlobalError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("announces the failure, states cause/impact/recovery, and hides exception details", () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <GlobalError
        error={Object.assign(new Error("database connection details"), { digest: "private-id" })}
        reset={reset}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Critical Error" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /unexpected problem and this page could not finish loading\. Try again, or return home if the problem persists\./
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Error ID: private-id/)).toBeInTheDocument();
    expect(screen.queryByText(/database connection details/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("offers a safe path home without exposing the exception message", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { assign },
      writable: true,
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GlobalError error={new Error("secret internals")} reset={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Go Home" }));
    expect(assign).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });
});
