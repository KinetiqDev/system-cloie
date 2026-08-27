import { describe, expect, it, vi, beforeEach } from "vitest";
import { CourseScope } from "@prisma/client";
import { previewCourseImport } from "@/features/academic-structure/services/preview-course-import";
import { confirmCourseImport } from "@/features/academic-structure/services/confirm-course-import";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { AuthSessionSnapshot } from "@/features/auth/types";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const MAJOR_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
  revalidateProgramHeadAssignment: vi.fn().mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    code: "BSIT",
    name: "Information Technology",
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    program: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    major: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  },
}));

describe("Course Import Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("previewCourseImport", () => {
    it("fails when unauthenticated", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue(null);

      const result = await previewCourseImport({
        mode: "secretary",
        rows: [{ sourceIndex: 2, input: { course_code: "IT 101" } }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Authentication is required");
    });

    it("fails when role does not match mode", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue({
        userId: "user-1",
        activeRole: ROLES.FACULTY,
      } as unknown as AuthSessionSnapshot);

      const result = await previewCourseImport({
        mode: "general-education",
        rows: [{ sourceIndex: 2, input: { course_code: "GEMATH" } }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("General Education Coordinator access is required");
    });

    it("previews Secretary General Education and Program-Specific rows successfully", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue({
        userId: "sec-1",
        activeRole: ROLES.SECRETARY,
      } as unknown as AuthSessionSnapshot);

      vi.mocked(prisma.course.findMany).mockResolvedValue([]);
      vi.mocked(prisma.program.findMany).mockResolvedValue([
        { id: PROGRAM_ID, code: "BSIT", name: "Information Technology", is_active: true } as never,
      ]);
      vi.mocked(prisma.major.findMany).mockResolvedValue([
        {
          id: MAJOR_ID,
          name: "Software Engineering",
          program_id: PROGRAM_ID,
          is_active: true,
        } as never,
      ]);

      const result = await previewCourseImport({
        mode: "secretary",
        rows: [
          {
            sourceIndex: 2,
            input: {
              course_code: "GEMATH",
              course_title: "Mathematics in the Modern World",
              course_scope: "GENERAL_EDUCATION",
              program_code: "",
              major_name: "",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
          {
            sourceIndex: 3,
            input: {
              course_code: "IT 101",
              course_title: "Intro to Computing",
              course_scope: "PROGRAM_SPECIFIC",
              program_code: "BSIT",
              major_name: "Software Engineering",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total).toBe(2);
        expect(result.data.summary.ready).toBe(2);
        expect(result.data.summary.attention).toBe(0);
        expect(result.data.rows[0].status).toBe("READY");
        expect(result.data.rows[0].courseScope).toBe(CourseScope.GENERAL_EDUCATION);
        expect(result.data.rows[1].status).toBe("READY");
        expect(result.data.rows[1].programCode).toBe("BSIT");
      }
    });

    it("flags duplicate course codes within the file and existing in DB", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue({
        userId: "coord-1",
        activeRole: ROLES.GEN_ED_COORDINATOR,
      } as unknown as AuthSessionSnapshot);

      vi.mocked(prisma.course.findMany).mockResolvedValue([{ code: "EXISTING101" } as never]);
      vi.mocked(prisma.program.findMany).mockResolvedValue([]);
      vi.mocked(prisma.major.findMany).mockResolvedValue([]);

      const result = await previewCourseImport({
        mode: "general-education",
        rows: [
          {
            sourceIndex: 2,
            input: {
              course_code: "EXISTING101",
              course_title: "Existing Course",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
          {
            sourceIndex: 3,
            input: {
              course_code: "DUP101",
              course_title: "Dup 1",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
          {
            sourceIndex: 4,
            input: {
              course_code: "DUP101",
              course_title: "Dup 2",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total).toBe(3);
        expect(result.data.summary.ready).toBe(0);
        expect(result.data.summary.attention).toBe(3);
        expect(result.data.rows[0].status).toBe("DUPLICATE_EXISTING");
        expect(result.data.rows[1].status).toBe("DUPLICATE_IN_FILE");
        expect(result.data.rows[2].status).toBe("DUPLICATE_IN_FILE");
      }
    });

    it("previews Program Head import validating program-wide vs major-specific constraints", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue({
        userId: "ph-1",
        activeRole: ROLES.PROGRAM_HEAD,
      } as unknown as AuthSessionSnapshot);
      vi.mocked(resolveProgramHeadContext).mockResolvedValue({
        success: true,
        data: {
          userId: "ph-1",
          selectedProgram: { id: PROGRAM_ID, code: "BSIT", name: "Information Technology" },
        },
      } as never);

      vi.mocked(prisma.course.findMany).mockResolvedValue([]);
      vi.mocked(prisma.major.findMany).mockResolvedValue([
        {
          id: MAJOR_ID,
          name: "Network Security",
          program_id: PROGRAM_ID,
          is_active: true,
        } as never,
      ]);

      const result = await previewCourseImport({
        mode: "program-head",
        selectedProgramId: PROGRAM_ID,
        rows: [
          {
            sourceIndex: 2,
            input: {
              course_code: "IT 101",
              course_title: "Computing",
              course_type: "PROGRAM_WIDE",
              major_name: "",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
          {
            sourceIndex: 3,
            input: {
              course_code: "IT 201",
              course_title: "Security Fundamentals",
              course_type: "MAJOR_SPECIFIC",
              major_name: "Network Security",
              year_level: "SECOND_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
          {
            sourceIndex: 4,
            input: {
              course_code: "IT 301",
              course_title: "Missing Major",
              course_type: "MAJOR_SPECIFIC",
              major_name: "Nonexistent Major",
              year_level: "THIRD_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.ready).toBe(2);
        expect(result.data.summary.attention).toBe(1);
        expect(result.data.rows[0].status).toBe("READY");
        expect(result.data.rows[1].status).toBe("READY");
        expect(result.data.rows[2].status).toBe("UNKNOWN_MAJOR");
      }
    });
  });

  describe("confirmCourseImport", () => {
    it("creates ready courses and records granular results", async () => {
      vi.mocked(resolveAuthSession).mockResolvedValue({
        userId: "sec-1",
        activeRole: ROLES.SECRETARY,
      } as unknown as AuthSessionSnapshot);

      vi.mocked(prisma.course.findMany).mockResolvedValue([]);
      vi.mocked(prisma.program.findMany).mockResolvedValue([
        { id: PROGRAM_ID, code: "BSIT", name: "Information Technology", is_active: true } as never,
      ]);
      vi.mocked(prisma.program.findFirst).mockResolvedValue({ id: PROGRAM_ID } as never);
      vi.mocked(prisma.program.findUnique).mockResolvedValue({ id: PROGRAM_ID } as never);
      vi.mocked(prisma.major.findMany).mockResolvedValue([]);
      vi.mocked(prisma.course.create).mockResolvedValue({ id: "created-c-1" } as never);

      const result = await confirmCourseImport({
        mode: "secretary",
        rows: [
          {
            sourceIndex: 2,
            input: {
              course_code: "IT 101",
              course_title: "Intro to Computing",
              course_scope: "PROGRAM_SPECIFIC",
              program_code: "BSIT",
              major_name: "",
              year_level: "FIRST_YEAR",
              semester: "FIRST",
              term: "FIRST_TERM",
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.created).toBe(1);
        expect(result.data.summary.notCreated).toBe(0);
        expect(result.data.rows[0].outcome).toBe("CREATED");
      }
    });
  });
});
