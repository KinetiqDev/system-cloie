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

  it("does not serve analytics or reports paths once their selected Program pages exist", async () => {
    await expect(
      SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["analytics"] }),
      })
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["reports"] }),
      })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("rejects nested analytics and reports paths that are not canonical routes", async () => {
    await expect(
      SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["analytics", "extra"] }),
      })
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      SelectedProgramMigrationPage({
        params: Promise.resolve({ programId: "program-2", path: ["reports", "sub"] }),
      })
    ).rejects.toThrow("NOT_FOUND");
  });
});
