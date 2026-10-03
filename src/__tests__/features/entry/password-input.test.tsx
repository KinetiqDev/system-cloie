import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/features/entry/components/password-input";

function renderField(props: { disabled?: boolean } = {}) {
  return render(
    <>
      <label htmlFor="secret">Password</label>
      <PasswordInput id="secret" autoComplete="new-password" {...props} />
    </>
  );
}

describe("PasswordInput", () => {
  it("masks the value and offers a named reveal control", () => {
    renderField();

    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-controls", "secret");

    fireEvent.click(toggle);
    expect(field).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("hides the value again on a second press", () => {
    renderField();

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("disables the toggle with the field it controls", () => {
    renderField({ disabled: true });

    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });
});
