import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { createUserBySecretary } from "@/features/users/services/create-user-by-secretary";
import { SystemRole } from "@prisma/client";

/**
 * Secretary account-creation atomicity (#549).
 *
 * Proves the observable contract: a seeded Secretary creates one complete
 * account with exactly one active System CLOIE role and all required
 * role-specific records, inside one transaction. Failures leave no partial
 * row and surface an actionable error.
 *
 * Gated by the disposable-database convention (DATABASE_URL + RUN_DATABASE…=1).
 */
describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Secretary account creation: one role + required records and atomic failures",
  () => {
    it("creates a FACULTY with exactly one role and a primary affiliation, and rejects a duplicate email atomically", async () => {
      const program = await prisma.program.findFirst({
        where: { is_active: true },
        select: { id: true },
      });
      expect(program).not.toBeNull();
      const programId = program!.id;
      const email = `e2e-faculty-${crypto.randomUUID()}@acdeducation.com`;
      const name = "E2E Faculty Atomicity";

      // 1) Success path: FACULTY creation writes User + UserRole + FacultyProgramAffiliation in one transaction.
      const created = await createUserBySecretary({
        name,
        email,
        role: SystemRole.FACULTY,
        program_id: programId,
      });
      expect(created.success).toBe(true);
      if (!created.success) throw new Error("expected FACULTY creation to succeed");
      const userId = created.data.id;

      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user).not.toBeNull();
        expect(user?.email).toBe(email);
        expect(user?.is_active).toBe(true);
        expect(user?.name).toBe(name);

        const roles = await prisma.userRole.findMany({ where: { user_id: userId } });
        expect(roles).toHaveLength(1);
        expect(roles[0]?.role).toBe(SystemRole.FACULTY);

        const affiliation = await prisma.facultyProgramAffiliation.findFirst({
          where: { faculty_id: userId, is_active: true },
        });
        expect(affiliation).not.toBeNull();
        expect(affiliation?.program_id).toBe(programId);
        expect(affiliation?.is_primary).toBe(true);

        // 2) Duplicate email: same service call must fail with an actionable
        //    message and must NOT leave a second User row or a second role.
        const duplicate = await createUserBySecretary({
          name: "Duplicate Faculty",
          email,
          role: SystemRole.FACULTY,
          program_id: programId,
        });
        expect(duplicate.success).toBe(false);
        if (duplicate.success) throw new Error("expected duplicate to fail");
        expect(duplicate.error.toLowerCase()).toMatch(/already exists|duplicate/);

        const usersWithEmail = await prisma.user.findMany({ where: { email } });
        expect(usersWithEmail).toHaveLength(1);
        expect(usersWithEmail[0]?.id).toBe(userId);

        const rolesAfter = await prisma.userRole.findMany({ where: { user_id: userId } });
        expect(rolesAfter).toHaveLength(1);

        // 3) Single-active-role invariant: the user_id unique on user_roles
        //    must reject a second role for the same user even via a raw write.
        await expect(
          prisma.userRole.create({ data: { user_id: userId, role: SystemRole.DEAN } })
        ).rejects.toMatchObject({ code: "P2002" });
      } finally {
        await prisma.facultyProgramAffiliation
          .deleteMany({ where: { faculty_id: userId } })
          .catch(() => undefined);
        await prisma.userRole.deleteMany({ where: { user_id: userId } }).catch(() => undefined);
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
    }, 30000);

    it("creates a STUDENT with profile and enrollment when an ACTIVE term exists, and reveals no partial row on invalid program", async () => {
      const program = await prisma.program.findFirst({
        where: { is_active: true },
        include: { majors: { where: { is_active: true } } },
      });
      expect(program).not.toBeNull();
      const programId = program!.id;
      // Conditional major: supply one when the program has active majors.
      const majorId = program!.majors[0]?.id ?? undefined;

      const activeTerm = await prisma.academicTermInstance.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      // The seed keeps one ACTIVE term; the test pins the enrollment seam
      // when it exists and remains valid (no throw) when the DB is torn down
      // between transactions. If no active term exists it still verifies the
      // deferred profile path.
      const hadActiveTerm = activeTerm !== null;

      const email = `e2e-student-${crypto.randomUUID()}@acdeducation.com`;
      const result = await createUserBySecretary({
        name: "E2E Student Atomicity",
        email,
        role: SystemRole.STUDENT,
        program_id: programId,
        major_id: majorId,
        year_level: "FIRST_YEAR",
        section: "MORNING",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("expected STUDENT creation to succeed");
      const userId = result.data.id;

      try {
        const profile = await prisma.studentAcademicProfile.findUnique({
          where: { user_id: userId },
        });
        expect(profile).not.toBeNull();
        expect(profile?.program_id).toBe(programId);
        if (majorId) expect(profile?.major_id).toBe(majorId);

        const roles = await prisma.userRole.findMany({ where: { user_id: userId } });
        expect(roles).toHaveLength(1);
        expect(roles[0]?.role).toBe(SystemRole.STUDENT);

        if (hadActiveTerm) {
          const enrollment = await prisma.studentEnrollment.findFirst({
            where: { student_user_id: userId, term_instance_id: activeTerm!.id },
          });
          expect(enrollment).not.toBeNull();
          expect(enrollment?.is_active).toBe(true);
          expect(enrollment?.source).toBe("SECRETARY");
        }

        // Failure atomicity: an unknown program_id passes schema UUID shape but
        // fails the creation service's program lookup; no User row must leak.
        const bogusProgramId = crypto.randomUUID();
        const failingEmail = `e2e-fail-${crypto.randomUUID()}@acdeducation.com`;
        const failure = await createUserBySecretary({
          name: "Should not exist",
          email: failingEmail,
          role: SystemRole.FACULTY,
          program_id: bogusProgramId,
        });
        expect(failure.success).toBe(false);
        if (failure.success) throw new Error("expected bogus-program creation to fail");
        expect(failure.error.length).toBeGreaterThan(5);

        const leaked = await prisma.user.findUnique({ where: { email: failingEmail } });
        expect(leaked).toBeNull();
      } finally {
        await prisma.studentEnrollment
          .deleteMany({ where: { student_user_id: userId } })
          .catch(() => undefined);
        await prisma.studentAcademicProfile
          .delete({ where: { user_id: userId } })
          .catch(() => undefined);
        await prisma.userRole.deleteMany({ where: { user_id: userId } }).catch(() => undefined);
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
    }, 30000);

    it("creates an INDUSTRY_PARTNER with an APPROVED verification profile and a single role", async () => {
      const email = `e2e-ind-${crypto.randomUUID()}@example.com`;
      const result = await createUserBySecretary({
        name: "E2E Industry Atomicity",
        email,
        role: SystemRole.INDUSTRY_PARTNER,
        company_name: "Acme Verification Corp",
        position: "Reviewer",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("expected INDUSTRY_PARTNER creation to succeed");
      const userId = result.data.id;

      try {
        const roles = await prisma.userRole.findMany({ where: { user_id: userId } });
        expect(roles).toHaveLength(1);
        expect(roles[0]?.role).toBe(SystemRole.INDUSTRY_PARTNER);

        const profile = await prisma.industryPartnerProfile.findUnique({
          where: { user_id: userId },
        });
        expect(profile).not.toBeNull();
        expect(profile?.company_name).toBe("Acme Verification Corp");
        expect(profile?.verification_status).toBe("APPROVED");
      } finally {
        await prisma.industryPartnerProfile
          .delete({ where: { user_id: userId } })
          .catch(() => undefined);
        await prisma.userRole.deleteMany({ where: { user_id: userId } }).catch(() => undefined);
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
    }, 30000);
  }
);
