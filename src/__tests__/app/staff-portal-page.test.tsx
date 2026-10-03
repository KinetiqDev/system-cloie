import { describe, expect, it, vi } from "vitest";
import StaffPortalPage from "@/app/(public)/portal/staff/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("StaffPortalPage (retired)", () => {
  it("redirects to the staff sign-in entrance", async () => {
    await expect(StaffPortalPage()).rejects.toThrow("NEXT_REDIRECT:/login/staff");
    expect(redirectMock).toHaveBeenCalledWith("/login/staff");
  });
});
