import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1"
)("seeded Course-assignment memberships", () => {
  it("keeps explicit roster membership separate from term placement", async () => {
    const rosterAssignment = await prisma.courseAssignment.findFirstOrThrow({
      where: { course: { code: "IT201" } },
      select: { id: true },
    });
    const rosterMembershipCount = await prisma.courseAssignmentMembership.count({
      where: { course_assignment_id: rosterAssignment.id, is_active: true },
    });
    expect(rosterMembershipCount).toBeGreaterThan(0);

    const placementOnlyAssignment = await prisma.courseAssignment.findFirstOrThrow({
      where: { course: { code: "ENG201" } },
      select: { id: true, term_instance_id: true, program_id: true },
    });
    const placementCount = await prisma.studentEnrollment.count({
      where: {
        term_instance_id: placementOnlyAssignment.term_instance_id,
        program_id: placementOnlyAssignment.program_id,
        is_active: true,
      },
    });
    const placementOnlyMembershipCount = await prisma.courseAssignmentMembership.count({
      where: { course_assignment_id: placementOnlyAssignment.id },
    });

    expect(placementCount).toBeGreaterThan(0);
    expect(placementOnlyMembershipCount).toBe(0);
  });
});
