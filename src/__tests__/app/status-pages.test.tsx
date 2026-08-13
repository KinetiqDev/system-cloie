import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StatusPage from "@/app/(public)/status/[type]/page";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("StatusPage", () => {
  it("renders invalid-domain status page with correct content and sign out form", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "invalid-domain" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Institutional Email Required")).toBeInTheDocument();
    expect(screen.getByText(/requires signing in with an official ACD institutional email address/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to role selection/i })).toBeInTheDocument();

    const form = screen.getByRole("button", { name: /sign out of account/i }).closest("form");
    expect(form).not.toBeNull();
    expect(form!.getAttribute("action")).toBe("/api/auth/logout");
    expect(form!.getAttribute("method")).toBe("post");
  });

  it("handles the role parameter for invalid-domain pages", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "invalid-domain" }),
      searchParams: Promise.resolve({ role: "program-head" }),
    });
    render(page);

    expect(screen.getByText("Institutional Email Required")).toBeInTheDocument();
    expect(screen.getByText(/the PROGRAM HEAD role requires signing in with an official ACD institutional email/i)).toBeInTheDocument();
  });

  it("renders pre-provisioning-required status page", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "pre-provisioning-required" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Account Provisioning Required")).toBeInTheDocument();
    expect(screen.getByText(/your account is not yet provisioned for this role/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to role selection/i })).toBeInTheDocument();
  });

  it("renders role-mismatch status page", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "role-mismatch" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Role Mismatch")).toBeInTheDocument();
    expect(screen.getByText(/does not match your registered account role/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to role selection/i })).toBeInTheDocument();
  });

  it("renders inactive status page without a retry button", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "inactive" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Account Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /back to role selection/i })).not.toBeInTheDocument();
  });

  it("renders rejected status page", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "rejected" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Application Rejected")).toBeInTheDocument();
    expect(screen.getByText(/your registration application was not approved/i)).toBeInTheDocument();
  });

  it("renders deferred-enrollment status page", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "deferred-enrollment" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Enrollment Deferred")).toBeInTheDocument();
    expect(screen.getByText(/no active academic term configured/i)).toBeInTheDocument();
  });

  it("renders missing-google-name status with actionable safe guidance and no diagnostics", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "missing-google-name" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Google Account Name Required")).toBeInTheDocument();
    expect(
      screen.getByText(/does not provide a usable display name for CLOIE/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/set a full name/i)).toBeInTheDocument();
    expect(screen.getByText(/no account was created or linked/i)).toBeInTheDocument();
    expect(screen.queryByText(/auth_user_id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user_metadata/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to role selection/i })).toBeInTheDocument();
  });

  it("renders identity-conflict status without disclosing internal identifiers", async () => {
    const page = await StatusPage({
      params: Promise.resolve({ type: "identity-conflict" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("Sign-In Could Not Be Completed")).toBeInTheDocument();
    expect(screen.getByText(/cannot be connected to the matching CLOIE account/i)).toBeInTheDocument();
    expect(screen.getByText(/left unchanged/i)).toBeInTheDocument();
    expect(screen.queryByText(/auth_user_id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/00000000-0000-0000-0000/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to role selection/i })).toBeInTheDocument();
  });

  it("routes missing or invalid status types to notFound", async () => {
    await expect(
      StatusPage({
        params: Promise.resolve({ type: "non-existent-type" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
