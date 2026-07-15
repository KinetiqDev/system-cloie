import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateCiloMapping } from "@/features/outcomes/services/manage-cilo-mappings";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { cILO: { findUnique: vi.fn() }, gO: { findUnique: vi.fn() } },
}));

describe("validateCiloMapping", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("rejects Program-specific mappings outside Course Academic Program", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({ is_active: true, course: { course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" } } as never);
    vi.mocked(prisma.gO.findUnique).mockResolvedValue({ id: "go-1", is_active: true, program_id: "program-2" } as never);

    await expect(validateCiloMapping("cilo-1", "go-1")).resolves.toEqual(expect.objectContaining({ success: false }));
  });

  it("allows General Education mapping to active Program GO", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({ is_active: true, course: { course_scope: "GENERAL_EDUCATION", program_id: null } } as never);
    vi.mocked(prisma.gO.findUnique).mockResolvedValue({ id: "go-1", is_active: true, program_id: "program-2" } as never);

    await expect(validateCiloMapping("cilo-1", "go-1")).resolves.toEqual({ success: true, data: undefined });
  });
});
