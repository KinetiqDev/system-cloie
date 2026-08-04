import { describe, expect, it, vi } from "vitest";
import SelectedProgramMigrationPage from "@/app/(app)/program-head/programs/[programId]/[...path]/page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

describe("selected Program unknown child paths", () => {
  it("no longer serves a placeholder for formerly reserved management paths", async () => {
    await expect(SelectedProgramMigrationPage()).rejects.toThrow("NOT_FOUND");
  });

  it("rejects any unknown nested path under a selected Program", async () => {
    await expect(SelectedProgramMigrationPage()).rejects.toThrow("NOT_FOUND");
  });
});
