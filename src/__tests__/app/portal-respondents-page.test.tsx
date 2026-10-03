import { describe, expect, it, vi } from "vitest";
import RespondentPortalPage from "@/app/(public)/portal/respondents/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("RespondentPortalPage (retired)", () => {
  it("redirects to the System CLOIE landing", async () => {
    await expect(RespondentPortalPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
