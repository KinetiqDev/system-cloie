import { describe, expectTypeOf, it } from "vitest";

import type { CourseBoundResponseReview } from "@/features/analytics/types";
import type { ProgramHeadSubmittedResponseDetail } from "@/features/response-review/types";

// Spec §31: Program Head identified DTOs must stay separate from the
// Faculty/anonymized DTOs; identity fields must never join a shape consumed
// by Faculty. Pinned as compile-time contracts so a refactor cannot silently
// leak respondent identity into the anonymized flow.
describe("DTO identity boundary (§31, §40)", () => {
  it("gives the Program Head identified DTO real respondent identity", () => {
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("name");
    expectTypeOf<ProgramHeadSubmittedResponseDetail["respondent"]>().toHaveProperty("id");
  });

  it("keeps identity fields out of the Faculty-consumed anonymized DTO", () => {
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("respondent");
    expectTypeOf<CourseBoundResponseReview>().not.toHaveProperty("name");
    expectTypeOf<CourseBoundResponseReview>().toHaveProperty("respondentLabel");
  });
});
