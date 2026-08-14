import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateCiloInstitutionalOutcomeMapping,
  validateCiloMapping,
} from "@/features/outcomes/services/manage-cilo-mappings";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cILO: { findUnique: vi.fn() },
    gO: { findUnique: vi.fn() },
    institutionalOutcome: { findUnique: vi.fn() },
  },
}));

describe("validateCiloMapping", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("rejects Program-specific mappings outside Course Academic Program", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "PROGRAM_SPECIFIC", program_id: "program-1" },
    } as never);
    vi.mocked(prisma.gO.findUnique).mockResolvedValue({
      id: "go-1",
      is_active: true,
      program_id: "program-2",
    } as never);

    await expect(validateCiloMapping("cilo-1", "go-1")).resolves.toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("rejects General Education CILO-to-GO mappings after the cutover", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "GENERAL_EDUCATION", program_id: null },
    } as never);
    vi.mocked(prisma.gO.findUnique).mockResolvedValue({
      id: "go-1",
      is_active: true,
      program_id: "program-2",
    } as never);

    await expect(validateCiloMapping("cilo-1", "go-1")).resolves.toEqual({
      success: false,
      error: "General Education CILOs map only to Institutional Outcomes",
    });
    expect(prisma.gO.findUnique).toHaveBeenCalled();
  });

  it("allows Program-specific mapping to the owning Program GO", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "PROGRAM_SPECIFIC", program_id: "program-2" },
    } as never);
    vi.mocked(prisma.gO.findUnique).mockResolvedValue({
      id: "go-1",
      is_active: true,
      program_id: "program-2",
    } as never);

    await expect(validateCiloMapping("cilo-1", "go-1")).resolves.toEqual({
      success: true,
      data: undefined,
    });
  });
});

describe("validateCiloInstitutionalOutcomeMapping", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("allows General Education CILO mapping to an active Institutional Outcome", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "GENERAL_EDUCATION" },
    } as never);
    vi.mocked(prisma.institutionalOutcome.findUnique).mockResolvedValue({
      id: "ilo-1",
      is_active: true,
    } as never);

    await expect(validateCiloInstitutionalOutcomeMapping("cilo-1", "ilo-1")).resolves.toEqual({
      success: true,
      data: undefined,
    });
  });

  it("rejects Program-specific CILO mapping to an Institutional Outcome", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "PROGRAM_SPECIFIC" },
    } as never);
    vi.mocked(prisma.institutionalOutcome.findUnique).mockResolvedValue({
      id: "ilo-1",
      is_active: true,
    } as never);

    await expect(validateCiloInstitutionalOutcomeMapping("cilo-1", "ilo-1")).resolves.toEqual({
      success: false,
      error: "Institutional Outcomes map only General Education CILOs",
    });
  });

  it("rejects archived Institutional Outcome targets", async () => {
    vi.mocked(prisma.cILO.findUnique).mockResolvedValue({
      is_active: true,
      course: { course_scope: "GENERAL_EDUCATION" },
    } as never);
    vi.mocked(prisma.institutionalOutcome.findUnique).mockResolvedValue({
      id: "ilo-1",
      is_active: false,
    } as never);

    await expect(validateCiloInstitutionalOutcomeMapping("cilo-1", "ilo-1")).resolves.toEqual({
      success: false,
      error: "Active CILO and Institutional Outcome are required",
    });
  });
});
