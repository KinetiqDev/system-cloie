import { describe, expect, it } from "vitest";
import { allUsers, programHeadAssignments } from "../../../../prisma/seed/fixtures/users";
import { U } from "../../../../prisma/seed/constants/ids";
import { SystemRole } from "@prisma/client";

describe("multi-Program Program Head seed fixture", () => {
  it("keeps one PROGRAM_HEAD role with BEED and BSED assignments", () => {
    expect(allUsers.find((user) => user.id === U.PH_MULTI)?.role).toBe(SystemRole.PROGRAM_HEAD);
    expect(programHeadAssignments.filter((assignment) => assignment.programHeadId === U.PH_MULTI)).toEqual([
      { programHeadId: U.PH_MULTI, program: "BEED" },
      { programHeadId: U.PH_MULTI, program: "BSED" },
    ]);
  });
});
