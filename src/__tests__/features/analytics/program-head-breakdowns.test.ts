import { beforeEach, describe, expect, it, vi } from "vitest";
import type { YearLevel } from "@prisma/client";
import {
  getProgramHeadBreakdowns,
  getProgramHeadStakeholders,
} from "@/features/analytics/services/get-program-head-analytics";
import {
  buildAttributionBreakdown,
  buildCourseBreakdownRows,
  buildInstrumentBreakdownRows,
  buildStakeholderBuckets,
  majorAttributionOf,
  yearLevelAttributionOf,
  type BreakdownRatingRow,
} from "@/features/analytics/services/program-head-analytics-aggregators";

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    quantitativeResponseItem: { findMany: vi.fn() },
    response: { findMany: vi.fn(), count: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    instrumentVersion: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const bsedContext = {
  success: true,
  data: {
    userId: "head-1",
    authorizedPrograms: [
      { code: "BEED", id: "program-beed", name: "Bachelor of Elementary Education" },
      { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
  },
};

const termInstances = [
  {
    id: "term-2025-1st",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { id: "sy-2025", code: "2025-2026" },
  },
];

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/** 1–5 snapshot whose section/item keys match every fixture rating row. */
const SCALE_SNAPSHOT = [
  {
    key: "sec-1",
    title: "Ratings",
    items: [
      { key: "item-1", kind: "quantitative", prompt: "Rate.", scale: [1, 2, 3, 4, 5] },
    ],
  },
];

/** Narrow 1–3 snapshot used to prove out-of-scale exclusion. */
const NARROW_SNAPSHOT = [
  {
    key: "sec-1",
    title: "Ratings",
    items: [
      { key: "item-1", kind: "quantitative", prompt: "Rate.", scale: [1, 2, 3] },
    ],
  },
];

/** Snapshot map covering every instrument version referenced by the rows. */
function snapshotsFor(rows: Array<Pick<BreakdownRatingRow, "response">>, snapshot = SCALE_SNAPSHOT): Map<string, unknown> {
  const ids = [
    ...new Set(
      rows.flatMap((row) => {
        const version =
          row.response.assignment.course_bound?.instrument ??
          row.response.assignment.central_deployment?.instrument;
        return version ? [version.id] : [];
      })
    ),
  ];
  return new Map(ids.map((id) => [id, snapshot]));
}

function instrument(id: string, name: string, version = 1) {
  return { id, version_number: version, template: { name } };
}

function courseBoundRatingRow(opts: {
  value: number;
  responseId: string;
  evaluationId: string;
  deploymentName: string;
  course: { id: string; code: string; title: string };
  instrument: ReturnType<typeof instrument>;
  targets?: Array<{ year_level: YearLevel | null }>;
}): BreakdownRatingRow {
  return {
    rating_value: opts.value,
    response_id: opts.responseId,
    section_key: "sec-1",
    item_key: "item-1",
    response: {
      assignment: {
        course_bound: {
          id: opts.evaluationId,
          deployment_name: opts.deploymentName,
          course_assignment: { course: opts.course },
          instrument: opts.instrument,
          targets: opts.targets ?? [],
        },
        central_deployment: null,
      },
    },
  };
}

function centralRatingRow(opts: {
  value: number;
  responseId: string;
  targetStakeholder: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
  major?: { id: string; name: string } | null;
  yearLevel?: YearLevel | null;
  instrument: ReturnType<typeof instrument>;
}): BreakdownRatingRow {
  return {
    rating_value: opts.value,
    response_id: opts.responseId,
    section_key: "sec-1",
    item_key: "item-1",
    response: {
      assignment: {
        course_bound: null,
        central_deployment: {
          target_stakeholder: opts.targetStakeholder,
          major: opts.major ?? null,
          year_level: opts.yearLevel ?? null,
          instrument: opts.instrument,
        },
      },
    },
  };
}

function responseRow(opts: {
  id: string;
  courseBound?: {
    id: string;
    deploymentName: string;
    course: { id: string; code: string; title: string };
    instrument: ReturnType<typeof instrument>;
    targets?: Array<{ year_level: YearLevel | null }>;
  } | null;
  central?: {
    targetStakeholder: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
    major?: { id: string; name: string } | null;
    yearLevel?: YearLevel | null;
    instrument: ReturnType<typeof instrument>;
  } | null;
}) {
  return {
    id: opts.id,
    assignment: {
      course_bound: opts.courseBound
        ? {
            id: opts.courseBound.id,
            deployment_name: opts.courseBound.deploymentName,
            course_assignment: { course: opts.courseBound.course },
            instrument: opts.courseBound.instrument,
            targets: opts.courseBound.targets ?? [],
          }
        : null,
      central_deployment: opts.central
        ? {
            target_stakeholder: opts.central.targetStakeholder,
            major: opts.central.major ?? null,
            year_level: opts.central.yearLevel ?? null,
            instrument: opts.central.instrument,
          }
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Shared expectations
// ---------------------------------------------------------------------------

function expectProgramScopedPredicates() {
  const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
  const ratingOr = ratingCall.where.response.OR;
  expect(ratingOr).toHaveLength(2);
  // Central scope is an equality predicate: NULL-program deployments match
  // nothing rather than being inferred from a respondent or instrument.
  expect(ratingOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
  expect(ratingOr[0].assignment.central_deployment.program_id).not.toEqual(
    expect.objectContaining({ not: expect.anything() })
  );
  expect(ratingOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");
  return ratingCall;
}

const breakdownFilters = { tab: "breakdowns" as const };
const stakeholdersFilters = { tab: "stakeholders" as const };

/** Default snapshot resolution: every requested version id maps to the 1–5 scale. */
function defaultSnapshotResolution() {
  prismaMock.instrumentVersion.findMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(where.id.in.map((id) => ({ id, structure_snapshot: SCALE_SNAPSHOT })))
  );
}

describe("getProgramHeadStakeholders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue(termInstances);
    prismaMock.schoolYear.findUnique.mockResolvedValue(null);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("independently re-authorizes the selected Program before any stakeholder read", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expect(result).toBeNull();
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-bsed");
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.count).not.toHaveBeenCalled();
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it("scopes every stakeholder read to the selected Program with NULL central rows excluded", async () => {
    await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expectProgramScopedPredicates();

    const responseCall = prismaMock.response.findMany.mock.calls[0][0];
    expect(responseCall.where.status).toBe("SUBMITTED");
    const responseOr = responseCall.where.OR;
    expect(responseOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
    expect(responseOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");
  });

  it("reads only SUBMITTED responses for buckets and counts", async () => {
    await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(ratingCall.where.response.status).toBe("SUBMITTED");
    const responseCall = prismaMock.response.findMany.mock.calls[0][0];
    expect(responseCall.where.status).toBe("SUBMITTED");
    const countCall = prismaMock.response.count.mock.calls[0][0];
    expect(countCall.where.status).toBe("SUBMITTED");
  });

  it("separates course-bound, central student, alumni, and Industry Partner evidence", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 4,
        responseId: "resp-course-1",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-course-2",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
      centralRatingRow({
        value: 3,
        responseId: "resp-central",
        targetStakeholder: "STUDENT",
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 2,
        responseId: "resp-alumni",
        targetStakeholder: "ALUMNI",
        instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1),
      }),
      centralRatingRow({
        value: 5,
        responseId: "resp-industry",
        targetStakeholder: "INDUSTRY_PARTNER",
        instrument: instrument("instrument-industry-v1", "Industry Survey", 1),
      }),
    ]);
    prismaMock.response.count.mockResolvedValue(5);
    prismaMock.evaluationAssignment.count.mockResolvedValue(5);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expect(result).not.toBeNull();
    expect(result!.buckets.map((bucket) => bucket.sourceKey)).toEqual([
      "COURSE_STUDENT",
      "CENTRAL_STUDENT",
      "ALUMNI",
      "INDUSTRY_PARTNER",
    ]);
    const courseBucket = result!.buckets[0];
    expect(courseBucket.sourceLabel).toBe("Course-bound student evidence");
    // Pooled within the source at full precision: (4 + 5) / 2
    expect(courseBucket.meanRating).toBe(4.5);
    expect(courseBucket.ratingCount).toBe(2);
    expect(courseBucket.submittedResponseCount).toBe(2);
    expect(courseBucket.instrumentContext).toBe("CILO Evaluation v1");
    expect(result!.buckets[1].sourceLabel).toBe("Central student-respondent evidence");
    expect(result!.buckets[2].sourceLabel).toBe("Alumni evidence");
    expect(result!.buckets[3].sourceLabel).toBe("Industry Partner evidence");
  });

  it("counts unrated submitted responses and separates rating count from response count", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 4,
        responseId: "resp-rated",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-rated", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
      // Submitted response with no quantitative items: still evidence.
      responseRow({ id: "resp-unrated", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    const courseBucket = result!.buckets.find(
      (bucket) => bucket.sourceKey === "COURSE_STUDENT"
    )!;
    expect(courseBucket.ratingCount).toBe(1);
    expect(courseBucket.submittedResponseCount).toBe(2);
    // Instrument disclosure survives even though one response is unrated.
    expect(courseBucket.instrumentContext).toBe("CILO Evaluation v1");
  });

  it("excludes out-of-scale ratings from means and rating counts", async () => {
    prismaMock.instrumentVersion.findMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.map((id) => ({ id, structure_snapshot: NARROW_SNAPSHOT })))
    );
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 2,
        responseId: "resp-in-scale",
        targetStakeholder: "ALUMNI",
        instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1),
      }),
      centralRatingRow({
        value: 9,
        responseId: "resp-out-of-scale",
        targetStakeholder: "ALUMNI",
        instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-in-scale", central: { targetStakeholder: "ALUMNI", instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1) } }),
      responseRow({ id: "resp-out-of-scale", central: { targetStakeholder: "ALUMNI", instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    const alumniBucket = result!.buckets.find((bucket) => bucket.sourceKey === "ALUMNI")!;
    expect(alumniBucket.meanRating).toBe(2);
    expect(alumniBucket.ratingCount).toBe(1);
    expect(alumniBucket.submittedResponseCount).toBe(2);
  });

  it("omits source buckets with no submitted evidence", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 4,
        responseId: "resp-alumni",
        targetStakeholder: "ALUMNI",
        instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-alumni", central: { targetStakeholder: "ALUMNI", instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(1);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expect(result!.buckets.map((bucket) => bucket.sourceKey)).toEqual(["ALUMNI"]);
    expect(result!.emptyReason).toBeNull();
  });

  it("reports no-assignments when the scope has no evaluation opportunities", async () => {
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expect(result!.emptyReason).toBe("no-assignments");
    expect(result!.buckets).toEqual([]);
  });

  it("reports no-submissions when assignments exist but no responses were submitted", async () => {
    prismaMock.evaluationAssignment.count.mockResolvedValue(5);
    prismaMock.response.count.mockResolvedValue(0);

    const result = await getProgramHeadStakeholders("program-bsed", stakeholdersFilters);

    expect(result!.emptyReason).toBe("no-submissions");
  });
});

describe("getProgramHeadBreakdowns", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue(termInstances);
    prismaMock.schoolYear.findUnique.mockResolvedValue(null);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("independently re-authorizes the selected Program before any breakdown read", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result).toBeNull();
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.count).not.toHaveBeenCalled();
  });

  it("scopes the breakdown read to the selected Program with NULL central rows excluded", async () => {
    await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expectProgramScopedPredicates();
  });

  it("groups course-bound evidence by course with means, counts, instruments, and review links", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-1",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro to CS" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
      courseBoundRatingRow({
        value: 3,
        responseId: "resp-2",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro to CS" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
      courseBoundRatingRow({
        value: 4,
        responseId: "resp-3",
        evaluationId: "eval-2",
        deploymentName: "Edge Deployment",
        course: { id: "course-2", code: "MATH101", title: "Calculus" },
        instrument: instrument("instrument-cilo-v2", "CILO Evaluation", 2),
      }),
    ]);
    prismaMock.response.count.mockResolvedValue(3);
    prismaMock.evaluationAssignment.count.mockResolvedValue(4);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.emptyReason).toBeNull();
    expect(result!.courseRows.map((row) => row.courseCode)).toEqual(["CS101", "MATH101"]);
    const cs101 = result!.courseRows[0];
    expect(cs101.label).toBe("CS101 — Intro to CS");
    expect(cs101.meanRating).toBe(4); // (5 + 3) / 2, full precision
    expect(cs101.ratingCount).toBe(2);
    expect(cs101.submittedResponseCount).toBe(2);
    expect(cs101.instrumentContext).toBe("CILO Evaluation v1");
    expect(cs101.evidenceEvaluations).toEqual([
      { evaluationId: "eval-1", deploymentName: "CILO Deployment" },
    ]);
  });

  it("counts unrated submitted responses in course and instrument rows", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 4,
        responseId: "resp-rated",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-rated", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
      responseRow({ id: "resp-unrated", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.courseRows).toHaveLength(1);
    expect(result!.courseRows[0].ratingCount).toBe(1);
    expect(result!.courseRows[0].submittedResponseCount).toBe(2);
    expect(result!.instrumentRows[0].sources[0].submittedResponseCount).toBe(2);
    expect(result!.instrumentRows[0].sources[0].meanRating).toBe(4);
  });

  it("keeps central ratings out of course rows", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 4,
        responseId: "resp-central",
        targetStakeholder: "STUDENT",
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-central", central: { targetStakeholder: "STUDENT", instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(1);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.courseRows).toEqual([]);
    // Central evidence still appears in the instrument breakdown.
    expect(result!.instrumentRows).toHaveLength(1);
  });

  it("separates instrument sources without pooling means across populations", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 4,
        responseId: "resp-course",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-shared-v1", "Shared Survey", 1),
      }),
      centralRatingRow({
        value: 2,
        responseId: "resp-alumni",
        targetStakeholder: "ALUMNI",
        instrument: instrument("instrument-shared-v1", "Shared Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-course", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-shared-v1", "Shared Survey", 1) } }),
      responseRow({ id: "resp-alumni", central: { targetStakeholder: "ALUMNI", instrument: instrument("instrument-shared-v1", "Shared Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.instrumentRows).toHaveLength(1);
    const shared = result!.instrumentRows[0];
    expect(shared.instrumentLabel).toBe("Shared Survey v1");
    expect(shared.sources).toHaveLength(2);
    const courseSource = shared.sources.find((source) => source.sourceKey === "COURSE_STUDENT")!;
    const alumniSource = shared.sources.find((source) => source.sourceKey === "ALUMNI")!;
    expect(courseSource.meanRating).toBe(4);
    expect(alumniSource.meanRating).toBe(2);
    // No cross-source pooled mean exists on the row.
    expect(shared).not.toHaveProperty("meanRating");
  });

  it("attributes central ratings to the targeted major and reports the rest as Unspecified", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 4,
        responseId: "resp-major-a",
        targetStakeholder: "STUDENT",
        major: { id: "major-1", name: "Mathematics" },
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 4,
        responseId: "resp-major-a-2",
        targetStakeholder: "STUDENT",
        major: { id: "major-1", name: "Mathematics" },
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 2,
        responseId: "resp-no-major",
        targetStakeholder: "STUDENT",
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-course",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-major-a", central: { targetStakeholder: "STUDENT", major: { id: "major-1", name: "Mathematics" }, instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
      responseRow({ id: "resp-major-a-2", central: { targetStakeholder: "STUDENT", major: { id: "major-1", name: "Mathematics" }, instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
      responseRow({ id: "resp-no-major", central: { targetStakeholder: "STUDENT", instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
      responseRow({ id: "resp-course", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(4);
    prismaMock.evaluationAssignment.count.mockResolvedValue(4);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.majorBreakdown).not.toBeNull();
    expect(result!.majorBreakdown!.rows).toHaveLength(1);
    const majorRow = result!.majorBreakdown!.rows[0];
    expect(majorRow.label).toBe("Mathematics — Central student-respondent evidence");
    expect(majorRow.meanRating).toBe(4);
    expect(majorRow.ratingCount).toBe(2);
    // Course-bound evidence and untargeted central evidence are per-source
    // Unspecified rows, never pooled into one construct.
    expect(result!.majorBreakdown!.unspecified.map((row) => row.label)).toEqual([
      "Unspecified — Central student-respondent evidence",
      "Unspecified — Course-bound student evidence",
    ]);
    expect(result!.majorBreakdown!.unspecified[0].isUnspecified).toBe(true);
    expect(result!.majorBreakdown!.unspecified[0].ratingCount).toBe(1);
    expect(result!.majorBreakdown!.unspecified[1].ratingCount).toBe(1);
  });

  it("keeps different sources of one major in separate rows", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 5,
        responseId: "resp-student",
        targetStakeholder: "STUDENT",
        major: { id: "major-1", name: "Mathematics" },
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 1,
        responseId: "resp-alumni",
        targetStakeholder: "ALUMNI",
        major: { id: "major-1", name: "Mathematics" },
        instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-student", central: { targetStakeholder: "STUDENT", major: { id: "major-1", name: "Mathematics" }, instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
      responseRow({ id: "resp-alumni", central: { targetStakeholder: "ALUMNI", major: { id: "major-1", name: "Mathematics" }, instrument: instrument("instrument-alumni-v1", "Alumni Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    // Student (5) and alumni (1) ratings for the same major never pool into
    // one mean: two source-separated rows instead of a fabricated 3.0.
    expect(result!.majorBreakdown!.rows.map((row) => row.label)).toEqual([
      "Mathematics — Central student-respondent evidence",
      "Mathematics — Alumni evidence",
    ]);
    expect(result!.majorBreakdown!.rows.map((row) => row.meanRating)).toEqual([5, 1]);
  });

  it("keeps unattributable evidence visible as Unspecified when no major is defensible", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-course",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-course", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(1);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    // No comparison is shown, but the evidence is not silently discarded:
    // it stays disclosed as a per-source Unspecified row with counts.
    expect(result!.majorBreakdown).not.toBeNull();
    expect(result!.majorBreakdown!.rows).toEqual([]);
    expect(result!.majorBreakdown!.unspecified).toHaveLength(1);
    expect(result!.majorBreakdown!.unspecified[0].label).toBe(
      "Unspecified — Course-bound student evidence"
    );
    expect(result!.majorBreakdown!.unspecified[0].meanRating).toBe(5);
    expect(result!.majorBreakdown!.unspecified[0].submittedResponseCount).toBe(1);
  });

  it("attributes year levels from central deployment targeting and single-target evaluations", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      centralRatingRow({
        value: 4,
        responseId: "resp-central-year",
        targetStakeholder: "STUDENT",
        yearLevel: "THIRD_YEAR",
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-course-year",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
        targets: [{ year_level: "FIRST_YEAR" }],
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-central-year", central: { targetStakeholder: "STUDENT", yearLevel: "THIRD_YEAR", instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
      responseRow({ id: "resp-course-year", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1), targets: [{ year_level: "FIRST_YEAR" }] } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.yearLevelBreakdown).not.toBeNull();
    expect(result!.yearLevelBreakdown!.rows.map((row) => row.label)).toEqual([
      "1st Year — Course-bound student evidence",
      "3rd Year — Central student-respondent evidence",
    ]);
    expect(result!.yearLevelBreakdown!.unspecified).toEqual([]);
  });

  it("reports multi-year and untargeted evidence as Unspecified for year level", async () => {
    defaultSnapshotResolution();
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 5,
        responseId: "resp-multi-year",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
        targets: [
          { year_level: "FIRST_YEAR" },
          { year_level: "SECOND_YEAR" },
        ],
      }),
      centralRatingRow({
        value: 4,
        responseId: "resp-no-year",
        targetStakeholder: "STUDENT",
        instrument: instrument("instrument-exit-v1", "Exit Survey", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-multi-year", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
      responseRow({ id: "resp-no-year", central: { targetStakeholder: "STUDENT", instrument: instrument("instrument-exit-v1", "Exit Survey", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    // No year-level comparison is shown, but the evidence stays disclosed as
    // per-source Unspecified rows rather than vanishing.
    expect(result!.yearLevelBreakdown).not.toBeNull();
    expect(result!.yearLevelBreakdown!.rows).toEqual([]);
    expect(result!.yearLevelBreakdown!.unspecified.map((row) => row.label)).toEqual([
      "Unspecified — Course-bound student evidence",
      "Unspecified — Central student-respondent evidence",
    ]);
    expect(result!.yearLevelBreakdown!.unspecified[0].ratingCount).toBe(1);
  });

  it("excludes out-of-scale ratings from breakdown rows", async () => {
    prismaMock.instrumentVersion.findMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.map((id) => ({ id, structure_snapshot: NARROW_SNAPSHOT })))
    );
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseBoundRatingRow({
        value: 9,
        responseId: "resp-out-of-scale",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
      courseBoundRatingRow({
        value: 2,
        responseId: "resp-in-scale",
        evaluationId: "eval-1",
        deploymentName: "CILO Deployment",
        course: { id: "course-1", code: "CS101", title: "Intro" },
        instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1),
      }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "resp-out-of-scale", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
      responseRow({ id: "resp-in-scale", courseBound: { id: "eval-1", deploymentName: "CILO Deployment", course: { id: "course-1", code: "CS101", title: "Intro" }, instrument: instrument("instrument-cilo-v1", "CILO Evaluation", 1) } }),
    ]);
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(2);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    const cs101 = result!.courseRows[0];
    expect(cs101.meanRating).toBe(2);
    expect(cs101.ratingCount).toBe(1);
    expect(cs101.submittedResponseCount).toBe(2);
  });

  it("reports course-bound empty-chains for breakdown views", async () => {
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);

    const result = await getProgramHeadBreakdowns("program-bsed", breakdownFilters);

    expect(result!.emptyReason).toBe("no-assignments");
  });
});

// ---------------------------------------------------------------------------
// Pure aggregation helpers
// ---------------------------------------------------------------------------

describe("buildStakeholderBuckets (pure)", () => {
  it("pools means within a source at full precision", () => {
    const rows = [
      courseBoundRatingRow({
        value: 2,
        responseId: "r1",
        evaluationId: "eval-1",
        deploymentName: "D",
        course: { id: "c1", code: "X", title: "T" },
        instrument: instrument("iv-1", "Instrument", 1),
      }),
      courseBoundRatingRow({
        value: 3,
        responseId: "r2",
        evaluationId: "eval-1",
        deploymentName: "D",
        course: { id: "c1", code: "X", title: "T" },
        instrument: instrument("iv-1", "Instrument", 1),
      }),
    ];

    const buckets = buildStakeholderBuckets(rows, [], snapshotsFor(rows));

    expect(buckets).toHaveLength(1);
    expect(buckets[0].meanRating).toBe(2.5);
    expect(buckets[0].ratingCount).toBe(2);
  });

  it("never infers a source from an instrument or any transitive attribute", () => {
    const rows = [
      centralRatingRow({
        value: 4,
        responseId: "r1",
        targetStakeholder: "ALUMNI",
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
    ];

    const buckets = buildStakeholderBuckets(rows, [], snapshotsFor(rows));

    expect(buckets).toHaveLength(1);
    expect(buckets[0].sourceKey).toBe("ALUMNI");
    expect(buckets[0].sourceLabel).toBe("Alumni evidence");
  });

  it("excludes out-of-scale values from the valid aggregate", () => {
    const rows = [
      centralRatingRow({
        value: 9,
        responseId: "r1",
        targetStakeholder: "ALUMNI",
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
    ];

    const buckets = buildStakeholderBuckets(rows, [], snapshotsFor(rows, NARROW_SNAPSHOT));

    expect(buckets[0].meanRating).toBeNull();
    expect(buckets[0].ratingCount).toBe(0);
    expect(buckets[0].submittedResponseCount).toBe(1);
  });
});

describe("buildAttributionBreakdown (pure)", () => {
  it("ranks defensible rows by mean, keeps sources separate, and reports Unspecified per source", () => {
    const rows = [
      centralRatingRow({
        value: 5,
        responseId: "r1",
        targetStakeholder: "STUDENT",
        major: { id: "major-a", name: "Alpha" },
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 3,
        responseId: "r2",
        targetStakeholder: "STUDENT",
        major: { id: "major-b", name: "Beta" },
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 1,
        responseId: "r3",
        targetStakeholder: "STUDENT",
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
    ];

    const { rows: attributed, unspecified } = buildAttributionBreakdown(
      rows,
      [],
      snapshotsFor(rows),
      majorAttributionOf
    );

    expect(attributed.map((row) => row.label)).toEqual([
      "Alpha — Central student-respondent evidence",
      "Beta — Central student-respondent evidence",
    ]);
    expect(attributed[0].meanRating).toBe(5);
    expect(unspecified).toHaveLength(1);
    expect(unspecified[0].label).toBe("Unspecified — Central student-respondent evidence");
    expect(unspecified[0].meanRating).toBe(1);
    expect(unspecified[0].isUnspecified).toBe(true);
  });

  it("treats only defensible attribution as a dimension row", () => {
    const rows = [
      centralRatingRow({
        value: 4,
        responseId: "r1",
        targetStakeholder: "STUDENT",
        yearLevel: "FIRST_YEAR",
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
      centralRatingRow({
        value: 3,
        responseId: "r2",
        targetStakeholder: "STUDENT",
        instrument: instrument("iv-1", "Exit Survey", 1),
      }),
    ];

    const { rows: attributed, unspecified } = buildAttributionBreakdown(
      rows,
      [],
      snapshotsFor(rows),
      yearLevelAttributionOf
    );

    expect(attributed.map((row) => row.label)).toEqual([
      "1st Year — Central student-respondent evidence",
    ]);
    expect(unspecified[0].label).toBe("Unspecified — Central student-respondent evidence");
  });

  it("excludes multi-target course-bound evaluations from defensible year attributions", () => {
    const multiTarget = courseBoundRatingRow({
      value: 4,
      responseId: "r1",
      evaluationId: "eval-1",
      deploymentName: "D",
      course: { id: "c1", code: "X", title: "T" },
      instrument: instrument("iv-1", "Instrument", 1),
      targets: [
        { year_level: "FIRST_YEAR" },
        { year_level: "SECOND_YEAR" },
      ],
    });
    const singleTarget = courseBoundRatingRow({
      value: 5,
      responseId: "r2",
      evaluationId: "eval-2",
      deploymentName: "D",
      course: { id: "c2", code: "Y", title: "U" },
      instrument: instrument("iv-1", "Instrument", 1),
      targets: [{ year_level: "FOURTH_YEAR" }],
    });

    const { rows: attributed, unspecified } = buildAttributionBreakdown(
      [multiTarget, singleTarget],
      [],
      snapshotsFor([multiTarget, singleTarget]),
      yearLevelAttributionOf
    );

    expect(attributed).toHaveLength(1);
    expect(attributed[0].label).toBe("4th Year — Course-bound student evidence");
    expect(unspecified).toHaveLength(1);
    expect(unspecified[0].label).toBe("Unspecified — Course-bound student evidence");
    expect(unspecified[0].ratingCount).toBe(1);
  });

  it("keeps course-bound evidence as Unspecified for the major dimension", () => {
    const courseRow = courseBoundRatingRow({
      value: 4,
      responseId: "r1",
      evaluationId: "eval-1",
      deploymentName: "D",
      course: { id: "c1", code: "X", title: "T" },
      instrument: instrument("iv-1", "Instrument", 1),
    });

    const { rows, unspecified } = buildAttributionBreakdown(
      [courseRow],
      [],
      snapshotsFor([courseRow]),
      majorAttributionOf
    );

    expect(rows).toEqual([]);
    expect(unspecified).toHaveLength(1);
    expect(unspecified[0].submittedResponseCount).toBe(1);
    expect(unspecified[0].label).toBe("Unspecified — Course-bound student evidence");
  });

  it("counts unrated responses in attribution rows without fabricating ratings", () => {
    const rated = courseBoundRatingRow({
      value: 4,
      responseId: "r1",
      evaluationId: "eval-1",
      deploymentName: "D",
      course: { id: "c1", code: "X", title: "T" },
      instrument: instrument("iv-1", "Instrument", 1),
      targets: [{ year_level: "FIRST_YEAR" }],
    });
    const unrated = responseRow({
      id: "r2",
      courseBound: {
        id: "eval-1",
        deploymentName: "D",
        course: { id: "c1", code: "X", title: "T" },
        instrument: instrument("iv-1", "Instrument", 1),
        targets: [{ year_level: "FIRST_YEAR" }],
      },
    });

    const { rows, unspecified } = buildAttributionBreakdown(
      [rated],
      [unrated],
      snapshotsFor([rated]),
      yearLevelAttributionOf
    );

    expect(rows[0].ratingCount).toBe(1);
    expect(rows[0].submittedResponseCount).toBe(2);
    expect(unspecified).toEqual([]);
  });
});

describe("buildCourseBreakdownRows (pure)", () => {
  it("sorts rows by course code and skips central ratings", () => {
    const rows = [
      courseBoundRatingRow({
        value: 4,
        responseId: "r1",
        evaluationId: "eval-z",
        deploymentName: "Z Deployment",
        course: { id: "c-z", code: "ZZZ", title: "Z Course" },
        instrument: instrument("iv-1", "Instrument", 1),
      }),
      centralRatingRow({
        value: 4,
        responseId: "r2",
        targetStakeholder: "STUDENT",
        instrument: instrument("iv-1", "Instrument", 1),
      }),
      courseBoundRatingRow({
        value: 3,
        responseId: "r3",
        evaluationId: "eval-a",
        deploymentName: "A Deployment",
        course: { id: "c-a", code: "AAA", title: "A Course" },
        instrument: instrument("iv-2", "Instrument", 2),
      }),
    ];

    const rowsOut = buildCourseBreakdownRows(rows, [], snapshotsFor(rows));

    expect(rowsOut.map((row) => row.courseCode)).toEqual(["AAA", "ZZZ"]);
    expect(rowsOut[0].evidenceEvaluations).toEqual([
      { evaluationId: "eval-a", deploymentName: "A Deployment" },
    ]);
    expect(rowsOut[0].instrumentContext).toBe("Instrument v2");
  });
});

describe("buildInstrumentBreakdownRows (pure)", () => {
  it("keeps one row per instrument with per-source entries", () => {
    const rows = [
      courseBoundRatingRow({
        value: 4,
        responseId: "r1",
        evaluationId: "eval-1",
        deploymentName: "D",
        course: { id: "c1", code: "X", title: "T" },
        instrument: instrument("iv-1", "Shared", 1),
      }),
      centralRatingRow({
        value: 2,
        responseId: "r2",
        targetStakeholder: "ALUMNI",
        instrument: instrument("iv-1", "Shared", 1),
      }),
    ];

    const rowsOut = buildInstrumentBreakdownRows(rows, [], snapshotsFor(rows));

    expect(rowsOut).toHaveLength(1);
    expect(rowsOut[0].instrumentLabel).toBe("Shared v1");
    expect(rowsOut[0].sources.map((source) => source.sourceKey)).toEqual([
      "COURSE_STUDENT",
      "ALUMNI",
    ]);
    expect(rowsOut[0].sources[0].meanRating).toBe(4);
    expect(rowsOut[0].sources[1].meanRating).toBe(2);
  });
});