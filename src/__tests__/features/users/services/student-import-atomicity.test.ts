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
        // A foreign-key failure after the role insert must roll back the whole account.
        const failedEmail = `rollback-${randomUUID()}@acd.edu.ph`;
        await expect(
          prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
              data: { name: "Rollback", email: failedEmail },
            });
            await tx.userRole.create({ data: { user_id: created.id, role: "STUDENT" } });
            await tx.studentAcademicProfile.create({
              data: { user_id: created.id, program_id: randomUUID() },
            });
          })
        ).rejects.toThrow();
        expect(await prisma.user.findUnique({ where: { email: failedEmail } })).toBeNull();
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
