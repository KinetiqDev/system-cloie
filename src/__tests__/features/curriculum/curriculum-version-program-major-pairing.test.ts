import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

// Regression for #324 code-review finding: curriculum_versions must not accept
// a major_id owned by a different program. Enforced by composite FK
// (major_id, program_id) -> majors(id, program_id) in migration
// 20260809080000_enforce_curriculum_version_program_major_pairing.sql.
describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "CurriculumVersion program-major pairing",
  () => {
    it("rejects a major owned by a different program (P2003)", async () => {
      const suffix = crypto.randomUUID();
      const versionCode = `PAIR-CV-${suffix}`;
      const programCodes = [`PAIR-A-${suffix}`, `PAIR-B-${suffix}`];
      const programA = await prisma.program.create({
        data: { code: programCodes[0], name: `Pair A ${suffix}` },
      });
      const programB = await prisma.program.create({
        data: { code: programCodes[1], name: `Pair B ${suffix}` },
      });
      const majorOfB = await prisma.major.create({
        data: { program_id: programB.id, name: `Pair M ${suffix}` },
      });

      try {
        await expect(
          prisma.curriculumVersion.create({
            data: {
              program_id: programA.id,
              major_id: majorOfB.id,
              code: versionCode,
              name: "mismatch probe",
            },
          })
        ).rejects.toMatchObject({ code: "P2003" });
      } finally {
        // deleteMany is idempotent: runs even if the create above wrongly
        // succeeded and the assertion failed, so fixture rows never leak.
        await prisma.curriculumVersion.deleteMany({ where: { code: versionCode } });
        await prisma.major.deleteMany({
          where: { program_id: { in: [programA.id, programB.id] } },
        });
        await prisma.program.deleteMany({ where: { code: { in: programCodes } } });
      }
    });

    it("accepts a major owned by the same program", async () => {
      const suffix = crypto.randomUUID();
      const versionCode = `PAIR-CV-${suffix}`;
      const programCode = `PAIR-A-${suffix}`;
      const programA = await prisma.program.create({
        data: { code: programCode, name: `Pair A ${suffix}` },
      });
      const majorOfA = await prisma.major.create({
        data: { program_id: programA.id, name: `Pair M ${suffix}` },
      });

      try {
        const version = await prisma.curriculumVersion.create({
          data: {
            program_id: programA.id,
            major_id: majorOfA.id,
            code: versionCode,
            name: "match probe",
          },
        });

        expect(version.major_id).toBe(majorOfA.id);
      } finally {
        await prisma.curriculumVersion.deleteMany({ where: { code: versionCode } });
        await prisma.major.deleteMany({ where: { program_id: programA.id } });
        await prisma.program.deleteMany({ where: { code: programCode } });
      }
    });

    it("accepts a program-wide curriculum with no major", async () => {
      const suffix = crypto.randomUUID();
      const versionCode = `PAIR-CV-${suffix}`;
      const programCode = `PAIR-A-${suffix}`;
      const programA = await prisma.program.create({
        data: { code: programCode, name: `Pair A ${suffix}` },
      });

      try {
        const version = await prisma.curriculumVersion.create({
          data: {
            program_id: programA.id,
            major_id: null,
            code: versionCode,
            name: "program-wide probe",
          },
        });

        expect(version.major_id).toBeNull();
      } finally {
        await prisma.curriculumVersion.deleteMany({ where: { code: versionCode } });
        await prisma.program.deleteMany({ where: { code: programCode } });
      }
    });
  }
);
