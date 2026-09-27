import { describe, expect, it, vi } from "vitest";
import PortalRedirectPage from "@/app/(public)/portal/page";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe("PortalRedirectPage", () => {
  it("redirects to the System CLOIE landing (portal retired)", async () => {
    await PortalRedirectPage();
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });
});
