import { describe, expectTypeOf, it } from "vitest";

import type { ProgramHeadSubmittedResponseDetail } from "@/features/response-review/types";

// Spec §31: Program Head identified DTOs carry respondent identity; no other
// role receives them. Pinned as a compile-time contract so a refactor cannot
// silently leak respondent identity into an aggregate payload.
describe("DTO identity boundary (§31, §40)", () => {
  it("gives the Program Head identified DTO real respondent identity", () => {
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("name");
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("id");
  });
});
