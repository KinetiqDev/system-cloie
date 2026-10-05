import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  commitStudentImport,
  previewStudentImport,
} from "@/features/users/services/student-import";
import { STUDENT_IMPORT_TEMPLATE } from "@/features/users/services/student-import-csv";
vi.mock("server-only", () => ({}));

describe.skipIf(process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1" || !process.env.DATABASE_URL)(
  "Student import database atomicity",
  () => {
    it("creates complete students, skips retries, and rolls back conflicting profile writes", async () => {
      const program = await prisma.program.findFirst({
        where: { is_active: true },
        include: { majors: { where: { is_active: true } } },
      });
      expect(program).not.toBeNull();
      const email = `import-${randomUUID()}@acd.edu.ph`;
      const major = program!.majors[0]?.name ?? "";
      const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
      const bytes = new TextEncoder().encode(
        `${STUDENT_IMPORT_TEMPLATE}Import Test,${email},${quote(program!.code)},${quote(major)},1,Morning`
      );
      try {
        const preview = await previewStudentImport(bytes, "test-secretary");
        if (!preview.success) throw new Error(preview.error);
        expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
        const result = await commitStudentImport(bytes, "test-secretary", preview.token);
        expect(result).toMatchObject({ rows: [{ status: "Created" }] });
        const user = await prisma.user.findUniqueOrThrow({
          where: { email },
          include: { roles: true, student_profile: true, enrollments: true },
        });
        expect(user.roles.map((r) => r.role)).toEqual(["STUDENT"]);
        expect(user.student_profile?.program_id).toBe(program!.id);
        const term = await prisma.academicTermInstance.findFirst({ where: { status: "ACTIVE" } });
        if (term)
          expect(user.enrollments).toEqual([
            expect.objectContaining({
              term_instance_id: term.id,
              source: "SECRETARY",
              year_level: "FIRST_YEAR",
              section: "MORNING",
            }),
          ]);
        expect(await commitStudentImport(bytes, "test-secretary", preview.token)).toMatchObject({
          rows: [{ status: "Skipped" }],
        });
        const failedEmail = `rollback-${randomUUID()}@acd.edu.ph`;
        const failedBytes = new TextEncoder().encode(
          `${STUDENT_IMPORT_TEMPLATE}Rollback,${failedEmail},${quote(program!.code)},${quote(major)},1,Morning`
        );
        const failedPreview = await previewStudentImport(failedBytes, "test-secretary");
        if (!failedPreview.success) throw new Error(failedPreview.error);
        const transaction = prisma.$transaction.bind(prisma);
        const transactionSpy = vi
          .spyOn(prisma, "$transaction")
          .mockImplementationOnce(async (callback, options) =>
            transaction(async (tx) => {
              const createProfile = tx.studentAcademicProfile.create.bind(
                tx.studentAcademicProfile
              );
              tx.studentAcademicProfile.create = ((args) =>
                createProfile({
                  ...args,
                  data: { ...args.data, program_id: randomUUID() },
                })) as typeof tx.studentAcademicProfile.create;
              return (callback as (client: typeof tx) => Promise<unknown>)(tx);
            }, options)
          );
        try {
          expect(
            await commitStudentImport(failedBytes, "test-secretary", failedPreview.token)
          ).toMatchObject({
            rows: [{ status: "Failed" }],
          });
          expect(await prisma.user.findUnique({ where: { email: failedEmail } })).toBeNull();
        } finally {
          transactionSpy.mockRestore();
        }
      } finally {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.studentEnrollment.deleteMany({ where: { student_user_id: user.id } });
          await prisma.studentAcademicProfile.deleteMany({ where: { user_id: user.id } });
          await prisma.userRole.deleteMany({ where: { user_id: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      }
    });
  }
);
