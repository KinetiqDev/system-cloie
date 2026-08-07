import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(public)/login/page";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));

describe("LoginPage", () => {
  it("redirects to the respondent portal when no error is present", async () => {
    await LoginPage({
      searchParams: Promise.resolve({}),
    });
    expect(redirectMock).toHaveBeenCalledWith("/portal/respondents");
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });

  it("renders the auth-failure alert with preserved copy and semantic classes", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "auth-failure" }),
    });
    const { container } = render(page);

    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(
      screen.getByText("There was a problem signing you in. Please try again.")
    ).toBeInTheDocument();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector(".text-text-secondary")).toBeNull();
    expect(container.querySelector(".text-text-muted")).toBeNull();
  });
});
