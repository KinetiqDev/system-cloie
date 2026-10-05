// fallow-ignore-file code-duplication
import { describe, expect, it } from "vitest";

import {
  buildProgramOpportunityScope,
  buildProgramResponseScope,
} from "@/features/analytics/services/get-program-head-analytics";
import { matchesWhere } from "./where-clause";

/**
 * The evaluator that backs every Program Head GE-exclusion boundary assertion
 * is itself a test dependency: if it silently admitted rows, the privacy tests
 * would pass while proving nothing. These cases pin its behavior against the
 * real predicates the PH services emit.
 */

const PROGRAM = "prog-bsit";
const submittedWhere = (scope: object) => ({ response: { status: "SUBMITTED", ...scope } });

const courseBoundResponse = (courseScope: string, programId = PROGRAM) => ({
  status: "SUBMITTED",
  deployment_type: "COURSE_BOUND",
  assignment: {
    course_bound: {
      course_assignment: { program_id: programId, course: { course_scope: courseScope } },
    },
    central_deployment: null,
  },
});

const centralResponse = (programId = PROGRAM) => ({
  status: "SUBMITTED",
  deployment_type: "CENTRAL",
  assignment: { course_bound: null, central_deployment: { program_id: programId } },
});

describe("where-clause evaluator", () => {
  it("excludes a General Education response inside the same Program and keeps Program evidence", () => {
    const scope = buildProgramResponseScope(PROGRAM, {});
    const where = submittedWhere(scope);

    expect(matchesWhere(where, { response: courseBoundResponse("GENERAL_EDUCATION") })).toBe(false);
    expect(matchesWhere(where, { response: courseBoundResponse("PROGRAM_SPECIFIC") })).toBe(true);
    expect(matchesWhere(where, { response: centralResponse() })).toBe(true);
  });

  it("excludes another Program's course-bound evidence", () => {
    const scope = buildProgramResponseScope(PROGRAM, {});
    const where = submittedWhere(scope);

    expect(
      matchesWhere(where, { response: courseBoundResponse("PROGRAM_SPECIFIC", "prog-beed") })
    ).toBe(false);
    expect(matchesWhere(where, { response: centralResponse("prog-beed") })).toBe(false);
  });

  it("applies the course-scope gate to the opportunity denominator and its period", () => {
    const scope = buildProgramOpportunityScope(PROGRAM, { term_instance_id: { in: ["t1"] } });
    const assignment = (courseScope: string, termInstanceId: string) => ({
      course_bound: {
        course_assignment: { program_id: PROGRAM, course: { course_scope: courseScope } },
        term_instance_id: termInstanceId,
      },
      central_deployment: null,
    });

    expect(matchesWhere(scope, assignment("PROGRAM_SPECIFIC", "t1"))).toBe(true);
    expect(matchesWhere(scope, assignment("PROGRAM_SPECIFIC", "t2"))).toBe(false);
    expect(matchesWhere(scope, assignment("GENERAL_EDUCATION", "t1"))).toBe(false);
  });

  it("evaluates AND, OR, and NOT the way Prisma composes completion filters", () => {
    const rows = {
      partial: { assignments: [{ response: { status: "SUBMITTED" } }, { response: null }] },
      complete: { assignments: [{ response: { status: "SUBMITTED" } }] },
      zero: { assignments: [{ response: null }] },
    };
    const submitted = { response: { is: { status: "SUBMITTED" as const } } };

    expect(matchesWhere({ assignments: { none: submitted } }, rows.zero)).toBe(true);
    expect(matchesWhere({ assignments: { none: submitted } }, rows.partial)).toBe(false);
    expect(
      matchesWhere(
        { AND: [{ assignments: { some: submitted } }, { assignments: { every: submitted } }] },
        rows.complete
      )
    ).toBe(true);
    expect(
      matchesWhere(
        { AND: [{ assignments: { some: submitted } }, { assignments: { every: submitted } }] },
        rows.partial
      )
    ).toBe(false);
    expect(
      matchesWhere(
        {
          AND: [
            { assignments: { some: submitted } },
            { assignments: { some: { NOT: submitted } } },
          ],
        },
        rows.partial
      )
    ).toBe(true);
  });

  it("evaluates case-insensitive search filters across relation navigation", () => {
    const row = {
      deployment_name: "IT201 Post-Term",
      course_assignment: {
        course: { code: "IT201", title: "Data Structures" },
        faculty: { name: "Dr. Smith" },
      },
    };
    const search = (query: string) => ({
      OR: [
        { deployment_name: { contains: query, mode: "insensitive" } },
        { course_assignment: { course: { code: { contains: query, mode: "insensitive" } } } },
        { course_assignment: { faculty: { name: { contains: query, mode: "insensitive" } } } },
      ],
    });

    expect(matchesWhere(search("post-term"), row)).toBe(true);
    expect(matchesWhere(search("IT201"), row)).toBe(true);
    expect(matchesWhere(search("smith"), row)).toBe(true);
    expect(matchesWhere(search("nope"), row)).toBe(false);
  });

  it("excludes a General Education course from the course-bound evaluation list", () => {
    const where = {
      status: "ACTIVE",
      course_assignment: { program_id: PROGRAM, course: { course_scope: "PROGRAM_SPECIFIC" } },
    };
    const evaluation = (courseScope: string) => ({
      status: "ACTIVE",
      course_assignment: { program_id: PROGRAM, course: { course_scope: courseScope } },
    });

    expect(matchesWhere(where, evaluation("PROGRAM_SPECIFIC"))).toBe(true);
    expect(matchesWhere(where, evaluation("GENERAL_EDUCATION"))).toBe(false);
  });

  it("evaluates scalar `not` as inequality instead of a nested field filter", () => {
    // `list-program-head-response-deployments.ts` defaults both deployment
    // lists to `status: { not: "DRAFT" }`. Reading that as a nested field
    // filter made it a no-op, so a DRAFT row passed the row-level boundary
    // assertion even though the database would have excluded it.
    const where = {
      status: { not: "DRAFT" },
      course_assignment: { program_id: PROGRAM, course: { course_scope: "PROGRAM_SPECIFIC" } },
    };
    const evaluation = (status: string) => ({
      status,
      course_assignment: { program_id: PROGRAM, course: { course_scope: "PROGRAM_SPECIFIC" } },
    });

    expect(matchesWhere(where, evaluation("ACTIVE"))).toBe(true);
    expect(matchesWhere(where, evaluation("SUBMITTED"))).toBe(true);
    expect(matchesWhere(where, evaluation("DRAFT"))).toBe(false);
    // `not` stays a pure predicate: the rest of the clause still applies.
    expect(matchesWhere(where, { ...evaluation("DRAFT"), id: "eval-draft" })).toBe(false);
    // A null or absent column stays unknown under SQL three-valued logic, so
    // it does not satisfy `not` either.
    expect(matchesWhere({ status: { not: "DRAFT" } }, { status: null })).toBe(false);
    expect(matchesWhere({ status: { not: "DRAFT" } }, {})).toBe(false);
  });

  it("evaluates scalar `not: null` as a non-null check", () => {
    // The PH analytics and dashboard reads gate binding rows on
    // `cilo_id: { not: null }`; treating it as a nested field filter matched
    // null. Prisma builds `not` as SQL `NOT (col = $1)`, so an absent or null
    // column stays unknown and does not satisfy the predicate.
    expect(matchesWhere({ cilo_id: { not: null } }, { cilo_id: "cilo-1" })).toBe(true);
    expect(matchesWhere({ cilo_id: { not: null } }, { cilo_id: null })).toBe(false);
    expect(matchesWhere({ cilo_id: { not: null } }, {})).toBe(false);
  });

  it("evaluates `in` by the values the database compares", () => {
    const where = { term_instance_id: { in: ["t1"] } };

    expect(matchesWhere(where, { term_instance_id: "t1" })).toBe(true);
    expect(matchesWhere(where, { term_instance_id: "t2" })).toBe(false);
    expect(matchesWhere(where, { term_instance_id: null })).toBe(false);
    // A malformed `in` operand is an unproven boundary and matches nothing.
    expect(matchesWhere({ term_instance_id: { in: "t1" } }, { term_instance_id: "t1" })).toBe(
      false
    );
  });

  it("compares `contains` case-sensitively unless `mode` says otherwise", () => {
    const row = { deployment_name: "IT201 Post-Term" };

    expect(matchesWhere({ deployment_name: { contains: "Post" } }, row)).toBe(true);
    expect(matchesWhere({ deployment_name: { contains: "post" } }, row)).toBe(false);
    expect(matchesWhere({ deployment_name: { contains: "post", mode: "insensitive" } }, row)).toBe(
      true
    );
    expect(matchesWhere({ deployment_name: { contains: "Post", mode: "insensitive" } }, row)).toBe(
      true
    );
    // A non-string column cannot satisfy `contains`.
    expect(matchesWhere({ id: { contains: "eval" } }, { id: "eval-1" })).toBe(true);
    expect(matchesWhere({ term_instance_id: { contains: "t1" } }, { term_instance_id: null })).toBe(
      false
    );
  });

  it("fails closed on operators the evaluator does not model", () => {
    // A silent pass on an unmodelled operator is the failure mode this
    // evaluator exists to prevent: the assertion would hold while proving
    // nothing about the boundary.
    const row = { status: "ACTIVE", deadline_at: new Date("2026-12-01T00:00:00.000Z") };

    expect(matchesWhere({ status: { equals: "ACTIVE" } }, row)).toBe(false);
    expect(matchesWhere({ deadline_at: { gte: new Date("2020-01-01T00:00:00.000Z") } }, row)).toBe(
      false
    );
    // `contains` is modelled, but a filter that mixes modelled and unmodelled
    // keys is still unproven and must not pass.
    expect(matchesWhere({ status: { contains: "ACT", notIn: ["DRAFT"] } }, row)).toBe(false);
  });

  it("fails closed on inherited operator names", () => {
    // `in` on a plain object literal also matches inherited names, so a clause
    // carrying `toString` instead of a modelled operator would otherwise skip
    // every dispatch and admit the row without its predicate ever running.
    const row = { status: "ACTIVE" };

    expect(matchesWhere({ status: { toString: "ACTIVE" } } as never, row)).toBe(false);
    expect(matchesWhere({ toString: { some: [] } } as never, row)).toBe(false);
    expect(matchesWhere({ constructor: [] } as never, row)).toBe(false);
    expect(matchesWhere({ status: { in: ["ACTIVE"], toString: "x" } } as never, row)).toBe(false);
  });
});
