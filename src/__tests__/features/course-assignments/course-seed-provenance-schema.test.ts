import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")(
  "Course seed provenance schema contract",
  () => {
    it("supports the Prisma field used by course catalog reconciliation", async () => {
      const courses = await prisma.course.findMany({
        select: { id: true, seed_source: true },
        take: 1,
      });

      expect(courses).toEqual(expect.any(Array));
    });
  }
);
