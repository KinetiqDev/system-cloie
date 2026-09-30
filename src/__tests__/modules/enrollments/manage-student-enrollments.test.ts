import { describe, expect, it, vi, beforeEach } from "vitest";
import { EnrollmentSource, YearLevel } from "@prisma/client";
import { upsertEnrollmentForActiveTerm } from "@/features/enrollments/services/manage-student-enrollments";

const { transactionMock } = vi.hoisted(() => ({ transactionMock: vi.fn() }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

type MockTransaction = {
  studentEnrollment: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function stubTransaction(existing: { id: string } | null): MockTransaction {
  const tx: MockTransaction = {
    studentEnrollment: {
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue({ id: existing?.id ?? "enrollment-1" }),
      create: vi.fn().mockResolvedValue({ id: "enrollment-1" }),
    },
  };
  transactionMock.mockImplementation((cb: (tx: MockTransaction) => unknown) => cb(tx));
  return tx;
}

describe("manage-student-enrollments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("upsertEnrollmentForActiveTerm", () => {
    it("should create new enrollment when none exists", async () => {
      const tx = stubTransaction(null);

      const result = await upsertEnrollmentForActiveTerm({
        studentUserId: "student-1",
        termInstanceId: "term-1",
        programId: "program-1",
        majorId: null,
        yearLevel: YearLevel.FIRST_YEAR,
        section: null,
        source: EnrollmentSource.ONBOARDING,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNew).toBe(true);
      }
      expect(tx.studentEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            student_user_id: "student-1",
            term_instance_id: "term-1",
            is_active: true,
          }),
        })
      );
      expect(tx.studentEnrollment.update).not.toHaveBeenCalled();
    });

    it("should update existing enrollment when found", async () => {
      const tx = stubTransaction({ id: "enrollment-1" });

      const result = await upsertEnrollmentForActiveTerm({
        studentUserId: "student-1",
        termInstanceId: "term-1",
        programId: "program-1",
        majorId: null,
        yearLevel: YearLevel.SECOND_YEAR,
        section: null,
        source: EnrollmentSource.ONBOARDING,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNew).toBe(false);
      }
      expect(tx.studentEnrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "enrollment-1" },
          data: expect.objectContaining({
            year_level: YearLevel.SECOND_YEAR,
            is_active: true,
          }),
        })
      );
      expect(tx.studentEnrollment.create).not.toHaveBeenCalled();
    });

    it("reactivates a soft-deactivated row by forcing is_active true", async () => {
      const tx = stubTransaction({ id: "deactivated-enrollment" });

      const result = await upsertEnrollmentForActiveTerm({
        studentUserId: "student-1",
        termInstanceId: "term-1",
        programId: "program-1",
        majorId: null,
        yearLevel: YearLevel.FIRST_YEAR,
        section: null,
        source: EnrollmentSource.ONBOARDING,
      });

      expect(result.success).toBe(true);
      expect(tx.studentEnrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deactivated-enrollment" },
          data: expect.objectContaining({ is_active: true }),
        })
      );
    });
  });
});
