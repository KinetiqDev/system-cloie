import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GlobalError from "@/app/global-error";

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
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GlobalError error={new Error("secret internals")} reset={() => {}} />);

    // global-error replaces the root layout, so the recovery is a plain
    // anchor: no router context, full reload home.
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();
  });
});
