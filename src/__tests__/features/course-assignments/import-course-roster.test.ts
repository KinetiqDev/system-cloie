import { describe, expect, it, vi } from "vitest";

import { importCourseRoster } from "@/features/course-assignments/services/import-course-roster";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

const assignmentId = "11111111-1111-4111-8111-111111111111";

describe("import course roster service", () => {
  it("returns independent parsed name rows without writing roster memberships", async () => {
    const result = await importCourseRoster(
      assignmentId,
      "name\nMaria Santos\nMaria Santos\n"
    );

    expect(result).toEqual({
      success: true,
      data: {
        total: 2,
        parsed: 2,
        invalid: 0,
        rows: [
          { sourceIndex: 2, name: "Maria Santos", status: "PARSED", error: "" },
          { sourceIndex: 3, name: "Maria Santos", status: "PARSED", error: "" },
        ],
      },
    });
  });

  it("rejects structural failures before preparing any row", async () => {
    await expect(importCourseRoster(assignmentId, "name,program\nMaria Santos,BSCS\n")).resolves.toEqual({
      success: false,
      error: "CSV must contain one name column and 1 to 100 data rows.",
    });
  });

  it("keeps invalid names visible for later reconciliation", async () => {
    const result = await importCourseRoster(assignmentId, `name\n${"a".repeat(201)}\n`);

    expect(result).toEqual({
      success: true,
      data: {
        total: 1,
        parsed: 0,
        invalid: 1,
        rows: [
          {
            sourceIndex: 2,
            name: "a".repeat(201),
            status: "INVALID_NAME",
            error: "Name must contain 1 to 200 characters.",
          },
        ],
      },
    });
  });
});
