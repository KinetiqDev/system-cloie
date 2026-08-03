import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectedProgramMigrationPage from "@/app/(app)/program-head/programs/[programId]/[...path]/page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

describe("selected Program migration route", () => {
  it("keeps reserved management destinations inside the selected Program context", async () => {
    render(
      await SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["tools", "new"] }),
      })
    );

    expect(screen.getByText("Program workspace is being migrated")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to this Program dashboard" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/dashboard"
    );
  });

  it("rejects unknown copied child paths", async () => {
    await expect(
      SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["not-a-route"] }),
      })
    ).rejects.toThrow("NOT_FOUND");
  });
});
