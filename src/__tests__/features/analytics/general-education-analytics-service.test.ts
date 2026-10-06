import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGeneralEducationAnalyticsFrame,
  getGeneralEducationCourses,
  getGeneralEducationFeedback,
  getGeneralEducationOutcomes,
  getGeneralEducationPrograms,
  getGeneralEducationTrends,
} from "@/features/analytics/services/general-education-analytics";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

const { resolveAuthSessionMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    response: { count: vi.fn(), findMany: vi.fn() },
    evaluationAssignment: { count: vi.fn(), findMany: vi.fn() },
    quantitativeResponseItem: { aggregate: vi.fn(), findMany: vi.fn() },
    qualitativeResponseItem: { findMany: vi.fn() },
    instrumentVersion: { findMany: vi.fn() },
    courseBoundCiloQuestionBinding: { findMany: vi.fn() },
    course: { findMany: vi.fn() },
    courseAssignment: { findMany: vi.fn() },
    institutionalOutcome: { findMany: vi.fn() },
    cILOInstitutionalOutcomeMapping: { findMany: vi.fn() },
    courseBoundEvaluation: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const COORDINATOR = {
  userId: "coord-1",
  activeRole: "GEN_ED_COORDINATOR",
  roles: ["GEN_ED_COORDINATOR"],
};

const GEOGRAPHICS = { id: "program-geo", code: "BSED", name: "Bachelor of Secondary Education" };
const BSIT = { id: "program-bsit", code: "BSIT", name: "Bachelor of Science in IT" };
const ETHICS = { id: "course-ethics", code: "GEETHICS", title: "Ethics" };
const HISTORY = { id: "course-history", code: "GEHIST", title: "History" };

// Numeric 1–5 scale for the ethics instrument; a labeled 1–4 scale for the
// history instrument, so an incompatible-scale claim has to be earned.
const ETHICS_INSTRUMENT = [
  {
    key: "cilo",
    title: "CILO",
    items: [
      { key: "q1", kind: "quantitative", prompt: "Q1", scale: [1, 2, 3, 4, 5] },
      { key: "q2", kind: "quantitative", prompt: "Q2", scale: [1, 2, 3, 4, 5] },
      { key: "open", kind: "qualitative", prompt: "Remarks" },
    ],
  },
];
const HISTORY_INSTRUMENT = [
  {
    key: "cilo",
    title: "CILO",
    items: [
      {
        key: "q1",
        kind: "quantitative",
        prompt: "Q1",
        likertDescriptors: [
          { value: 1, label: "Strongly Disagree" },
          { value: 2, label: "Disagree" },
          { value: 3, label: "Agree" },
          { value: 4, label: "Strongly Agree" },
        ],
      },
    ],
  },
];

const ILO_LEARNING = {
  id: "ilo-1",
  code: "ILO 1",
  description: "Critical thinking",
  order: 1,
  is_active: true,
};
const ILO_COMMUNICATION = {
  id: "ilo-2",
  code: "ILO 2",
  description: "Effective communication",
  order: 2,
  is_active: true,
};
const ILO_ARCHIVED = {
  id: "ilo-3",
  code: "ILO 3",
  description: "Archived outcome",
  order: 3,
  is_active: false,
};

function courseBound(overrides: Record<string, unknown> = {}) {
  return {
    id: "eval-1",
    deployment_name: "Ethics Post-Term",
    term_instance_id: "term-1",
    instrument_version_id: "iv-ethics",
    course_assignment: {
      year_level: "FIRST_YEAR",
      section: "MORNING",
      faculty: { name: "Prof. Dela Cruz" },
      course: ETHICS,
      program: GEOGRAPHICS,
    },
    ...overrides,
  };
}

function ratingRow(opts: {
  value: number;
  responseId: string;
  sectionKey?: string;
  itemKey?: string;
  courseBound?: ReturnType<typeof courseBound>;
}) {
  return {
    rating_value: opts.value,
    response_id: opts.responseId,
    section_key: opts.sectionKey ?? "cilo",
    item_key: opts.itemKey ?? "q1",
    response: {
      assignment: {
        course_bound_id: opts.courseBound?.id ?? "eval-1",
        course_bound: opts.courseBound ?? courseBound(),
      },
    },
  };
}

function responseRow(opts: { id: string; courseBound?: ReturnType<typeof courseBound> }) {
  return {
    id: opts.id,
    assignment: { course_bound: opts.courseBound ?? courseBound() },
  };
}

function assignmentRow(opts: {
  respondentId: string;
  courseBound?: ReturnType<typeof courseBound>;
}) {
  return { respondent_id: opts.respondentId, course_bound: opts.courseBound ?? courseBound() };
}

function bindingRow(opts: {
  evaluationId?: string;
  sectionKey?: string;
  itemKey?: string;
  ciloId?: string | null;
  ciloDescription?: string;
  mappings?: Array<{
    manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
    institutional_outcome: {
      id: string;
      code: string;
      description: string;
      order: number;
      is_active: boolean;
    };
  }>;
  courseId?: string;
}) {
  const ciloId = opts.ciloId === undefined ? "cilo-1" : opts.ciloId;
  const courseId = opts.courseId ?? ETHICS.id;
  const { sectionKey = "cilo", itemKey = "q1", evaluationId = "eval-1" } = opts;
  return {
    section_key: sectionKey,
    item_key: itemKey,
    course_bound_evaluation_id: evaluationId,
    cilo: ciloId
      ? {
          id: ciloId,
          description: opts.ciloDescription ?? "Reason about consequences",
          course: { id: courseId, code: ETHICS.code, title: ETHICS.title },
          cilo_institutional_outcome_mappings: opts.mappings ?? [
            {
              manifestation: "LEARNING",
              institutional_outcome: ILO_LEARNING,
            },
          ],
        }
      : null,
    course_bound_evaluation: {
      cilos_snapshot: [{ id: ciloId ?? "", label: "CILO 1", description: opts.ciloDescription }],
      course_assignment: { course: { id: courseId } },
    },
  };
}

/** One period's evidence rows, so a multi-period read answers per scope. */
type GeCourseShape = { id: string; code: string; title: string };
type GeProgramShape = { id: string; code: string; name: string };

type PeriodEvidenceFixture = {
  termInstanceId: string;
  ratings: Array<[number, string]>;
  responses: string[];
  respondents: string[];
  course?: GeCourseShape;
  program?: GeProgramShape;
  instrumentVersionId?: string;
  facultyName?: string;
  yearLevel?: string;
  section?: string;
};

function periodCourseBound(period: PeriodEvidenceFixture, evaluationId: string) {
  return {
    id: evaluationId,
    deployment_name: `${period.course?.code ?? ETHICS.code} Post-Term`,
    term_instance_id: period.termInstanceId,
    instrument_version_id: period.instrumentVersionId ?? "iv-ethics",
    course_assignment: {
      year_level: period.yearLevel ?? "FIRST_YEAR",
      section: period.section ?? "MORNING",
      faculty: { name: period.facultyName ?? "Prof. Dela Cruz" },
      course: period.course ?? ETHICS,
      program: period.program ?? GEOGRAPHICS,
    },
  };
}

/**
 * Route the evidence reads by the term instance each resolved scope asks for. A
 * selected-period read and its comparable predecessor are separate scopes, so
 * one flat response set cannot serve both — that would silently attribute one
 * period's ratings to the other.
 */
function mockEvidenceByTermInstance(periods: PeriodEvidenceFixture[]): void {
  type ScopeWhere =
    | { course_bound?: { term_instance_id?: { in?: string[] } } }
    | { assignment?: { course_bound?: { term_instance_id?: { in?: string[] } } } }
    | { response?: { assignment?: { course_bound?: { term_instance_id?: { in?: string[] } } } } };

  /** The term ids one resolved scope asked for, from any predicate nesting. */
  const combinedPeriod: PeriodEvidenceFixture = {
    termInstanceId: periods[0]?.termInstanceId ?? "",
    ratings: periods.flatMap((period) => period.ratings),
    responses: periods.flatMap((period) => period.responses),
    respondents: periods.flatMap((period) => period.respondents),
  };
  const periodFor = (where: ScopeWhere | undefined): PeriodEvidenceFixture | undefined => {
    const scope = (where ?? {}) as {
      course_bound?: { term_instance_id?: { in?: string[] } };
      assignment?: { course_bound?: { term_instance_id?: { in?: string[] } } };
      response?: { assignment?: { course_bound?: { term_instance_id?: { in?: string[] } } } };
    };
    const assignmentScope = scope.response?.assignment ?? scope.assignment;
    const boundScope = scope.course_bound ?? assignmentScope?.course_bound;
    const requested = boundScope?.term_instance_id?.in;
    if (requested) {
      return periods.find((period) => requested.includes(period.termInstanceId));
    }
    // An unfiltered scope spans every fixture period.
    return combinedPeriod;
  };
  const courseBoundFor = (period: PeriodEvidenceFixture | undefined) =>
    period ? periodCourseBound(period, `eval-${period.termInstanceId}`) : null;

  prismaMock.response.findMany.mockImplementation((args: { where?: ScopeWhere }) => {
    const period = periodFor(args.where);
    const bound = courseBoundFor(period);
    if (!period || !bound) return Promise.resolve([]);
    return Promise.resolve(
      period.responses.map((id) => ({ id, assignment: { course_bound: bound } }))
    );
  });
  prismaMock.quantitativeResponseItem.findMany.mockImplementation(
    (args: {
      where?: {
        response?: { assignment?: { course_bound?: { term_instance_id?: { in?: string[] } } } };
      };
    }) => {
      const period = periodFor(args.where as ScopeWhere);
      const bound = courseBoundFor(period);
      if (!period || !bound) return Promise.resolve([]);
      return Promise.resolve(
        period.ratings.map(([value, responseId]) => ({
          rating_value: value,
          response_id: responseId,
          section_key: "cilo",
          item_key: "q1",
          response: {
            assignment: { course_bound_id: bound.id, course_bound: bound },
          },
        }))
      );
    }
  );
  prismaMock.evaluationAssignment.findMany.mockImplementation((args: { where?: ScopeWhere }) => {
    const period = periodFor(args.where);
    const bound = courseBoundFor(period);
    if (!period || !bound) return Promise.resolve([]);
    return Promise.resolve(
      period.respondents.map((respondent) => ({
        respondent_id: respondent,
        course_bound: bound,
      }))
    );
  });
}

/** Term-instance reads: a filtered query resolves to only the selected period. */
type TermInstanceFixture = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { id: string; code: string };
};

const TERM_1 = "11111111-1111-4111-8111-111111111111";
const TERM_2 = "22222222-2222-4222-8222-222222222222";

function mockTermInstances(instances: TermInstanceFixture[]): void {
  prismaMock.academicTermInstance.findMany.mockImplementation((args: { where?: { id?: string } }) =>
    Promise.resolve(args.where?.id ? instances.filter((i) => i.id === args.where?.id) : instances)
  );
}

function mockBase() {
  prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
  prismaMock.schoolYear.findUnique.mockResolvedValue(null);
  prismaMock.response.count.mockResolvedValue(0);
  prismaMock.evaluationAssignment.count.mockResolvedValue(0);
  prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({
    _sum: { rating_value: null },
    _count: { rating_value: 0 },
  });
  prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.response.findMany.mockResolvedValue([]);
  prismaMock.evaluationAssignment.findMany.mockResolvedValue([]);
  prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
  prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([]);
  prismaMock.course.findMany.mockImplementation(() =>
    Promise.resolve(
      [] as Array<{
        id: string;
        code: string;
        title: string;
        cilos: Array<{ id: string }>;
      }>
    )
  );
  prismaMock.courseAssignment.findMany.mockResolvedValue([]);
  // The frame options read and the Outcomes catalog read both call this model, so
  // the mock answers every call with the same catalog rather than one-shot state.
  prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([]);
  prismaMock.institutionalOutcome.findMany.mockImplementation(() =>
    Promise.resolve([ILO_LEARNING, ILO_COMMUNICATION, ILO_ARCHIVED])
  );
  prismaMock.cILOInstitutionalOutcomeMapping.findMany.mockResolvedValue([]);
}

const FILTERS: GeneralEducationAnalyticsFilterState = { tab: "outcomes" };

/** Response predicate the read sent for the class-context assignments. */
function assignmentWhere(): Record<string, unknown> {
  return prismaMock.evaluationAssignment.findMany.mock.calls[0][0].where;
}

describe("General Education Coordinator analytics reads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBase();
    resolveAuthSessionMock.mockResolvedValue(COORDINATOR);
  });

  it("denies every read to a non-coordinator role before querying evidence", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "u",
      activeRole: "PROGRAM_HEAD",
      roles: ["PROGRAM_HEAD"],
    });

    const results = await Promise.all([
      getGeneralEducationAnalyticsFrame(FILTERS),
      getGeneralEducationOutcomes(FILTERS),
      getGeneralEducationCourses({ tab: "courses" }),
      getGeneralEducationPrograms({ tab: "programs" }),
      getGeneralEducationTrends({ tab: "trends" }),
      getGeneralEducationFeedback({ tab: "qualitative" }),
    ]);

    expect(results).toEqual([null, null, null, null, null, null]);
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.findMany).not.toHaveBeenCalled();
    expect(prismaMock.qualitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.courseBoundCiloQuestionBinding.findMany).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    expect(await getGeneralEducationOutcomes(FILTERS)).toBeNull();
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
  });

  it("scopes every read to submitted, Course-bound General Education evidence", async () => {
    prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
    await getGeneralEducationOutcomes(FILTERS);

    const where = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0].where
      .response as Record<string, unknown>;
    expect(where.status).toBe("SUBMITTED");
    expect(where.deployment_type).toBe("COURSE_BOUND");
    const courseScope = JSON.stringify(assignmentWhere());
    expect(courseScope).toContain("GENERAL_EDUCATION");
    // Central deployments can never enter the Coordinator scope.
    expect(JSON.stringify(where)).not.toContain("CENTRAL");
    expect(courseScope).not.toContain("CENTRAL");
  });

  it("narrows evidence by class-context course, Program, and year level", async () => {
    const courseId = "33333333-3333-4333-8333-333333333333";
    const programId = "44444444-4444-4444-8444-444444444444";
    await getGeneralEducationOutcomes({
      tab: "outcomes",
      courseId,
      programId,
      yearLevel: "SECOND_YEAR",
    });

    const course = (assignmentWhere() as Record<string, unknown>).course_bound as Record<
      string,
      Record<string, unknown>
    >;
    expect(course.course_assignment).toEqual({
      course: { course_scope: "GENERAL_EDUCATION" },
      course_id: courseId,
      program_id: programId,
      year_level: "SECOND_YEAR",
    });
  });

  it("reports unavailable response rate and no-assignments for an empty scope", async () => {
    const frame = await getGeneralEducationAnalyticsFrame({ tab: "outcomes" });
    expect(frame!.kpi.responseRate).toBeNull();
    expect(frame!.kpi.meanRating).toBeNull();
    expect(frame!.emptyReason).toBe("no-assignments");
    // The ILO facet offers active outcomes; an archived ILO stays reachable
    // through its evidence rows rather than as a selectable filter.
    expect(frame!.options.ilos.map((ilo) => ilo.id)).toEqual([
      ILO_LEARNING.id,
      ILO_COMMUNICATION.id,
    ]);
  });

  it("keeps rating count distinct from response count and preserves mean precision", async () => {
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "r1" }),
      responseRow({ id: "r2" }),
    ]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ value: 3, responseId: "r1" }),
      ratingRow({ value: 4, responseId: "r2" }),
    ]);
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([
      assignmentRow({ respondentId: "u1" }),
      assignmentRow({ respondentId: "u2" }),
      assignmentRow({ respondentId: "u3" }),
      assignmentRow({ respondentId: "u4" }),
      assignmentRow({ respondentId: "u5" }),
    ]);

    const frame = await getGeneralEducationAnalyticsFrame({ tab: "outcomes" });
    expect(frame!.kpi.ratingCount).toBe(2);
    expect(frame!.kpi.submittedResponseCount).toBe(2);
    expect(frame!.kpi.evaluationOpportunityCount).toBe(5);
    expect(frame!.kpi.meanRating).toBe(3.5);
    expect(frame!.kpi.responseRate).toBe(0.4);
    expect(frame!.kpi.scaleContext).toBe("1–5 (5-point)");
    expect(frame!.kpi.spansMultipleScales).toBe(false);
    expect(frame!.emptyReason).toBeNull();
  });

  it("keeps incompatible scales separate instead of blending one mean", async () => {
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
      {
        id: "iv-history",
        structure_snapshot: HISTORY_INSTRUMENT,
        version_number: 1,
        template: { name: "GE History" },
      },
    ]);
    const historyCourseBound = courseBound({
      id: "eval-2",
      deployment_name: "History Post-Term",
      instrument_version_id: "iv-history",
      course_assignment: {
        year_level: "SECOND_YEAR",
        section: "AFTERNOON",
        faculty: { name: "Prof. Santos" },
        course: HISTORY,
        program: GEOGRAPHICS,
      },
    });
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "r1" }),
      responseRow({ id: "r2", courseBound: historyCourseBound }),
    ]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ value: 3, responseId: "r1" }),
      ratingRow({ value: 4, responseId: "r2", courseBound: historyCourseBound }),
    ]);

    const frame = await getGeneralEducationAnalyticsFrame({ tab: "outcomes" });
    expect(frame!.kpi.ratingCount).toBe(2);
    expect(frame!.kpi.spansMultipleScales).toBe(true);
    expect(frame!.kpi.meanRating).toBeNull();
    expect(frame!.kpi.scaleContext).toContain("1–4");
    expect(frame!.kpi.scaleContext).toContain("1–5");

    const courses = await getGeneralEducationCourses({ tab: "courses" });
    const ethics = courses!.rows.find((row) => row.courseId === ETHICS.id)!;
    const history = courses!.rows.find((row) => row.courseId === HISTORY.id)!;
    expect(ethics.meanRating).toBe(3);
    expect(history.meanRating).toBe(4);
    expect(ethics.scaleGroups).toHaveLength(1);
    expect(history.scaleGroups).toHaveLength(1);
    expect(ethics.scaleGroups[0].distribution.categories.map((c) => c.value)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(history.scaleGroups[0].distribution.maxValue).toBe(4);
  });

  it("counts an out-of-scale rating as excluded without pooling it", async () => {
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
    ]);
    prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ value: 3, responseId: "r1" }),
      // Submitted, but outside the item's frozen 1–5 scale.
      ratingRow({ value: 9, responseId: "r1" }),
    ]);

    const frame = await getGeneralEducationAnalyticsFrame({ tab: "outcomes" });
    expect(frame!.kpi.ratingCount).toBe(1);
    expect(frame!.kpi.meanRating).toBe(3);
    expect(frame!.kpi.excludedRatingCount).toBe(1);
    expect(frame!.kpi.scaleContext).toBe("1–5 (5-point)");
  });

  describe("ILO outcomes", () => {
    beforeEach(() => {
      prismaMock.instrumentVersion.findMany.mockResolvedValue([
        {
          id: "iv-ethics",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 1,
          template: { name: "GE Ethics" },
        },
      ]);
    });

    it("pools each rating once per ILO through the current CILO mappings", async () => {
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({
          itemKey: "q1",
          mappings: [
            { manifestation: "LEARNING", institutional_outcome: ILO_LEARNING },
            { manifestation: "PRACTICE", institutional_outcome: ILO_COMMUNICATION },
          ],
        }),
        bindingRow({
          itemKey: "q2",
          mappings: [
            { manifestation: "LEARNING", institutional_outcome: ILO_LEARNING },
            { manifestation: "PRACTICE", institutional_outcome: ILO_COMMUNICATION },
          ],
        }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 4, responseId: "r1", itemKey: "q2" }),
      ]);
      prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);
      prismaMock.cILOInstitutionalOutcomeMapping.findMany.mockResolvedValue([
        {
          manifestation: "LEARNING",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_LEARNING.id },
        },
        {
          manifestation: "PRACTICE",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_COMMUNICATION.id },
        },
      ]);

      const dto = await getGeneralEducationOutcomes(FILTERS);
      const learning = dto!.outcomes.find((outcome) => outcome.outcomeId === ILO_LEARNING.id)!;
      const communication = dto!.outcomes.find(
        (outcome) => outcome.outcomeId === ILO_COMMUNICATION.id
      )!;
      expect(learning.meanRating).toBe(3.5);
      expect(learning.ratingCount).toBe(2);
      expect(learning.submittedResponseCount).toBe(1);
      expect(communication.meanRating).toBe(3.5);
      expect(dto!.manyToManyDisclosure).toBe(true);
      expect(dto!.currentMappingDisclosure).toContain("current CILO-to-ILO mappings");
      // Catalog order wins over mean ranking, and the archived ILO keeps no
      // unevidenced row.
      expect(dto!.outcomes.map((outcome) => outcome.code)).toEqual(["ILO 1", "ILO 2"]);
      expect(dto!.outcomes.every((outcome) => outcome.isActive)).toBe(true);
    });

    it("keeps an active catalog ILO visible without evidence and marks no mapped outcome", async () => {
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({ ciloId: null }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
      ]);
      prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);

      const dto = await getGeneralEducationOutcomes(FILTERS);
      expect(dto!.emptyReason).toBe("no-mapped-outcomes");
      expect(dto!.outcomes).toHaveLength(2);
      expect(dto!.outcomes.every((outcome) => outcome.meanRating === null)).toBe(true);
      expect(dto!.outcomes.every((outcome) => outcome.ratingCount === 0)).toBe(true);
    });

    it("splits unlinked valid ratings into general items and unmapped CILOs", async () => {
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({ itemKey: "q1", ciloId: "cilo-unmapped", mappings: [] }),
        bindingRow({ itemKey: "q2", ciloId: "cilo-unmapped", mappings: [] }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 4, responseId: "r1", itemKey: "q2" }),
      ]);
      prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);

      const dto = await getGeneralEducationOutcomes(FILTERS);
      expect(dto!.unlinkedRatings).toEqual({ generalItems: 0, unmappedCilos: 2 });
    });

    it("counts a general item as unlinked rather than as an unmapped CILO", async () => {
      // A rating whose question carries no binding at all is a general item; a
      // binding whose CILO row was deleted is an unmapped CILO. Both keep
      // their own identity.
      // `q1` has no binding at all (a general item); `q2` carries a frozen
      // binding whose CILO row was deleted, which stays an unmapped CILO.
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({ itemKey: "q2", ciloId: "deleted-cilo", mappings: [] }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 4, responseId: "r1", itemKey: "q2" }),
      ]);
      prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);

      const dto = await getGeneralEducationOutcomes(FILTERS);
      expect(dto!.unlinkedRatings).toEqual({ generalItems: 1, unmappedCilos: 1 });
    });

    it("reports structural alignment even when no rating supports it", async () => {
      prismaMock.cILOInstitutionalOutcomeMapping.findMany.mockResolvedValue([
        {
          manifestation: "LEARNING",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_LEARNING.id },
        },
        {
          manifestation: "PRACTICE",
          cilo: { id: "cilo-2", course_id: HISTORY.id },
          institutional_outcome: { id: ILO_COMMUNICATION.id },
        },
      ]);
      // The Outcomes read resolves the scoped GE course list itself; the evidence
      // read separately resolves each course's CILO order.
      prismaMock.course.findMany.mockImplementation(() =>
        Promise.resolve([
          { ...ETHICS, cilos: [{ id: "cilo-1" }] },
          { ...HISTORY, cilos: [{ id: "cilo-2" }] },
        ])
      );
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);

      const dto = await getGeneralEducationOutcomes(FILTERS);
      const learning = dto!.alignmentCoverage.find((row) => row.outcomeId === ILO_LEARNING.id)!;
      expect(learning.learning).toBe(1);
      expect(learning.practice).toBe(0);
      const communication = dto!.alignmentCoverage.find(
        (row) => row.outcomeId === ILO_COMMUNICATION.id
      )!;
      expect(communication.practice).toBe(1);
      // History is aligned with no evidence in this period, which must not read
      // as unaligned.
      const historyRow = dto!.courseMatrix.find((row) => row.courseId === HISTORY.id)!;
      const historyCell = historyRow.cells.find((cell) => cell.outcomeId === ILO_COMMUNICATION.id)!;
      expect(historyCell.aligned).toBe(true);
      expect(historyCell.ratingCount).toBe(0);
      const ethicsCell = dto!.courseMatrix
        .find((row) => row.courseId === ETHICS.id)!
        .cells.find((cell) => cell.outcomeId === ILO_COMMUNICATION.id)!;
      expect(ethicsCell.aligned).toBe(false);
    });

    it("buckets one CILO under each ILO's own manifestation, in any row order", async () => {
      // A single CILO can manifest as learning under one ILO and as
      // opportunity under another. Each ILO must read its own mapping row
      // rather than whichever row happened to arrive first, and the repeated
      // row must not inflate the distinct-CILO count.
      const mappingRows = [
        {
          manifestation: "LEARNING",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_LEARNING.id },
        },
        {
          manifestation: "OPPORTUNITY",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_COMMUNICATION.id },
        },
        {
          manifestation: "OPPORTUNITY",
          cilo: { id: "cilo-1", course_id: ETHICS.id },
          institutional_outcome: { id: ILO_COMMUNICATION.id },
        },
      ];
      prismaMock.course.findMany.mockImplementation(() =>
        Promise.resolve([{ ...ETHICS, cilos: [{ id: "cilo-1" }] }])
      );
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
      ]);

      const coverageFor = async (rows: typeof mappingRows) => {
        prismaMock.cILOInstitutionalOutcomeMapping.findMany.mockResolvedValue(rows);
        const dto = await getGeneralEducationOutcomes(FILTERS);
        return dto!.alignmentCoverage.filter((row) => row.outcomeId !== ILO_ARCHIVED.id);
      };

      const expected = [
        {
          outcomeId: ILO_LEARNING.id,
          code: ILO_LEARNING.code,
          learning: 1,
          practice: 0,
          opportunity: 0,
          unclassified: 0,
        },
        {
          outcomeId: ILO_COMMUNICATION.id,
          code: ILO_COMMUNICATION.code,
          learning: 0,
          practice: 0,
          opportunity: 1,
          unclassified: 0,
        },
      ];

      expect(await coverageFor(mappingRows)).toEqual(expected);
      expect(await coverageFor([...mappingRows].reverse())).toEqual(expected);
    });
  });

  it("attributes Programs to the class context and separates the Course matrix by scale", async () => {
    const historyCourseBound = courseBound({
      id: "eval-2",
      deployment_name: "History Post-Term",
      instrument_version_id: "iv-history",
      course_assignment: {
        year_level: "SECOND_YEAR",
        section: "AFTERNOON",
        faculty: { name: "Prof. Santos" },
        course: HISTORY,
        program: BSIT,
      },
    });
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
      {
        id: "iv-history",
        structure_snapshot: HISTORY_INSTRUMENT,
        version_number: 1,
        template: { name: "GE History" },
      },
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "r1" }),
      responseRow({ id: "r2", courseBound: historyCourseBound }),
    ]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ value: 5, responseId: "r1" }),
      ratingRow({ value: 2, responseId: "r2", courseBound: historyCourseBound }),
    ]);
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([
      assignmentRow({ respondentId: "u1" }),
      assignmentRow({ respondentId: "u2", courseBound: historyCourseBound }),
    ]);

    const dto = await getGeneralEducationPrograms({ tab: "programs" });
    expect(dto!.attributionNote).toContain("class context");
    const bsed = dto!.rows.find((row) => row.programId === GEOGRAPHICS.id)!;
    const bsit = dto!.rows.find((row) => row.programId === BSIT.id)!;
    expect(bsed.meanRating).toBe(5);
    expect(bsit.meanRating).toBe(2);
    expect(bsed.evaluationOpportunityCount).toBe(1);
    expect(bsed.responseRate).toBe(1);
    const ethicsMatrix = dto!.courseMatrix.find((row) => row.courseId === ETHICS.id)!;
    expect(ethicsMatrix.cells).toEqual([
      {
        programId: GEOGRAPHICS.id,
        meanRating: 5,
        ratingCount: 1,
        submittedResponseCount: 1,
        spansMultipleScales: false,
      },
    ]);
    expect(dto!.courseMatrix.find((row) => row.courseId === HISTORY.id)!.cells).toEqual([
      {
        programId: BSIT.id,
        meanRating: 2,
        ratingCount: 1,
        submittedResponseCount: 1,
        spansMultipleScales: false,
      },
    ]);
  });

  it("keeps archived assignments in the response-rate denominator", async () => {
    const archived = courseBound({
      id: "eval-archived",
      deployment_name: "Archived Ethics",
    });
    prismaMock.response.findMany.mockResolvedValue([responseRow({ id: "r1" })]);
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([
      assignmentRow({ respondentId: "u1" }),
      assignmentRow({ respondentId: "u2" }),
      assignmentRow({ respondentId: "u3", courseBound: archived }),
    ]);

    const dto = await getGeneralEducationCourses({ tab: "courses" });
    const ethics = dto!.rows.find((row) => row.courseId === ETHICS.id)!;
    expect(ethics.evaluationOpportunityCount).toBe(3);
    expect(ethics.submittedResponseCount).toBe(1);
    expect(ethics.responseRate).toBeCloseTo(1 / 3, 10);
    // Both evaluations ran the same class context, so the course has one
    // section.
    expect(ethics.sectionCount).toBe(1);
    expect(ethics.sections.map((section) => section.facultyName)).toContain("Prof. Dela Cruz");
    expect(ethics.evidenceEvaluations.map((entry) => entry.evaluationId)).toEqual([
      "eval-archived",
      "eval-1",
    ]);
    expect(
      ethics.sections.find((section) => section.evaluationId === "eval-archived")
    ).toMatchObject({ submittedResponseCount: 0, evaluationOpportunityCount: 1, meanRating: null });
  });

  describe("trends", () => {
    beforeEach(() => {
      prismaMock.instrumentVersion.findMany.mockResolvedValue([
        {
          id: "iv-ethics",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 1,
          template: { name: "GE Ethics" },
        },
      ]);
    });

    function termInstance(id: string, code: string, semester: "FIRST" | "SECOND") {
      return { id, semester, term: "FIRST_TERM", school_year: { id: `sy-${id}`, code } };
    }

    it("keeps unrated and unsubmitted periods visible with an unavailable rate", async () => {
      prismaMock.academicTermInstance.findMany.mockResolvedValue([
        termInstance("term-1", "2025-2026", "FIRST"),
        termInstance("term-2", "2025-2026", "SECOND"),
      ]);
      prismaMock.response.findMany.mockResolvedValue([
        responseRow({ id: "r1" }),
        responseRow({
          id: "r2",
          courseBound: courseBound({ id: "eval-2", term_instance_id: "term-2" }),
        }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 4, responseId: "r1" }),
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
        assignmentRow({ respondentId: "u2" }),
        assignmentRow({
          respondentId: "u3",
          courseBound: courseBound({ id: "eval-2", term_instance_id: "term-2" }),
        }),
      ]);

      const dto = await getGeneralEducationTrends({ tab: "trends" });
      expect(dto!.periods).toHaveLength(2);
      const [first, second] = dto!.periods;
      expect(first.meanRating).toBe(4);
      expect(first.responseRate).toBe(0.5);
      expect(second.meanRating).toBeNull();
      expect(second.submittedResponseCount).toBe(1);
      expect(second.evaluationOpportunityCount).toBe(1);
      expect(second.responseRate).toBe(1);
      expect(second.comparableWithPrevious).toBe(false);
    });

    it("joins comparable runs across terms despite a new evaluation id each term", async () => {
      prismaMock.academicTermInstance.findMany.mockResolvedValue([
        termInstance("term-1", "2025-2026", "FIRST"),
        termInstance("term-2", "2025-2026", "SECOND"),
      ]);
      const secondTermBound = courseBound({ id: "eval-2", term_instance_id: "term-2" });
      prismaMock.response.findMany.mockResolvedValue([
        responseRow({ id: "r1" }),
        responseRow({ id: "r2", courseBound: secondTermBound }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 5, responseId: "r2", courseBound: secondTermBound }),
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
        assignmentRow({ respondentId: "u2", courseBound: secondTermBound }),
      ]);

      const dto = await getGeneralEducationTrends({ tab: "trends" });
      expect(dto!.emptyReason).toBeNull();
      expect(dto!.breaks).toEqual([]);
      expect(dto!.periods[1].comparableWithPrevious).toBe(true);
      expect(dto!.periods[1].meanRating).toBe(5);
    });

    it("breaks comparability when the instrument version changes and explains why", async () => {
      prismaMock.academicTermInstance.findMany.mockResolvedValue([
        termInstance("term-1", "2025-2026", "FIRST"),
        termInstance("term-2", "2025-2026", "SECOND"),
      ]);
      prismaMock.instrumentVersion.findMany.mockResolvedValue([
        {
          id: "iv-ethics",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 1,
          template: { name: "GE Ethics" },
        },
        {
          id: "iv-ethics-2",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 2,
          template: { name: "GE Ethics" },
        },
      ]);
      const secondTermBound = courseBound({
        id: "eval-2",
        term_instance_id: "term-2",
        instrument_version_id: "iv-ethics-2",
      });
      prismaMock.response.findMany.mockResolvedValue([
        responseRow({ id: "r1" }),
        responseRow({ id: "r2", courseBound: secondTermBound }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 5, responseId: "r2", courseBound: secondTermBound }),
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
        assignmentRow({ respondentId: "u2", courseBound: secondTermBound }),
      ]);

      const dto = await getGeneralEducationTrends({ tab: "trends" });
      expect(dto!.periods[1].comparableWithPrevious).toBe(false);
      expect(dto!.breaks).toHaveLength(1);
      expect(dto!.breaks[0].reason).toContain("instrument version");
      expect(dto!.emptyReason).toBe("no-comparable-history");
    });

    it("keeps comparability and ILO disclosure to the valid ratings alone", async () => {
      prismaMock.academicTermInstance.findMany.mockResolvedValue([
        termInstance("term-1", "2025-2026", "FIRST"),
        termInstance("term-2", "2025-2026", "SECOND"),
      ]);
      prismaMock.instrumentVersion.findMany.mockResolvedValue([
        {
          id: "iv-ethics",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 1,
          template: { name: "GE Ethics" },
        },
        {
          id: "iv-ethics-2",
          structure_snapshot: ETHICS_INSTRUMENT,
          version_number: 2,
          template: { name: "GE Ethics" },
        },
      ]);
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({
          evaluationId: "eval-1",
          itemKey: "q1",
          mappings: [{ manifestation: "LEARNING", institutional_outcome: ILO_LEARNING }],
        }),
        bindingRow({
          evaluationId: "eval-2",
          itemKey: "q1",
          mappings: [{ manifestation: "LEARNING", institutional_outcome: ILO_LEARNING }],
        }),
        // The second term's second evaluation is CILO-bound to another ILO, so
        // an excluded-only question would advertise it if exclusions counted.
        bindingRow({
          evaluationId: "eval-3",
          itemKey: "q2",
          mappings: [{ manifestation: "PRACTICE", institutional_outcome: ILO_COMMUNICATION }],
        }),
      ]);
      const secondTermBound = courseBound({ id: "eval-2", term_instance_id: "term-2" });
      const excludedOnlyBound = courseBound({
        id: "eval-3",
        term_instance_id: "term-2",
        instrument_version_id: "iv-ethics-2",
      });
      prismaMock.response.findMany.mockResolvedValue([
        responseRow({ id: "r1" }),
        responseRow({ id: "r2", courseBound: secondTermBound }),
        responseRow({ id: "r3", courseBound: excludedOnlyBound }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1" }),
        ratingRow({ value: 5, responseId: "r2", courseBound: secondTermBound }),
        // Submitted participation whose only rating falls outside the scale.
        ratingRow({ value: 9, responseId: "r3", itemKey: "q2", courseBound: excludedOnlyBound }),
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
        assignmentRow({ respondentId: "u2", courseBound: secondTermBound }),
        assignmentRow({ respondentId: "u3", courseBound: excludedOnlyBound }),
      ]);

      const dto = await getGeneralEducationTrends({ tab: "trends" });
      // Both terms pool the same instrument, question, and ILO, so the second
      // point joins the run: an excluded rating never redefines the identity of
      // the measurement it was dropped from.
      expect(dto!.emptyReason).toBeNull();
      expect(dto!.breaks).toEqual([]);
      expect(dto!.periods[1].comparableWithPrevious).toBe(true);
      expect(dto!.periods.map((period) => period.meanRating)).toEqual([3, 5]);
      // The excluded instrument version reaches neither the ILO disclosure nor
      // the period's instrument context; its response is still participation.
      expect(dto!.periods[1].outcomeCodes).toEqual([ILO_LEARNING.code]);
      expect(dto!.periods[1].instrumentContext).toBe("GE Ethics v1");
      expect(dto!.periods[1].submittedResponseCount).toBe(2);
    });

    it("narrows rating evidence to the selected ILO without inventing an ILO denominator", async () => {
      mockTermInstances([
        termInstance("term-1", "2025-2026", "FIRST"),
        termInstance("term-2", "2025-2026", "SECOND"),
      ]);
      // Each term publishes its own evaluation, so each has its own bindings.
      prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
        bindingRow({
          evaluationId: "eval-1",
          itemKey: "q1",
          mappings: [{ manifestation: "LEARNING", institutional_outcome: ILO_LEARNING }],
        }),
        bindingRow({
          evaluationId: "eval-1",
          itemKey: "q2",
          mappings: [{ manifestation: "PRACTICE", institutional_outcome: ILO_COMMUNICATION }],
        }),
        bindingRow({
          evaluationId: "eval-2",
          itemKey: "q1",
          mappings: [{ manifestation: "LEARNING", institutional_outcome: ILO_LEARNING }],
        }),
        bindingRow({
          evaluationId: "eval-2",
          itemKey: "q2",
          mappings: [{ manifestation: "PRACTICE", institutional_outcome: ILO_COMMUNICATION }],
        }),
      ]);
      const secondTermBound = courseBound({ id: "eval-2", term_instance_id: "term-2" });
      prismaMock.response.findMany.mockResolvedValue([
        responseRow({ id: "r1" }),
        responseRow({ id: "r2", courseBound: secondTermBound }),
      ]);
      prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
        ratingRow({ value: 3, responseId: "r1", itemKey: "q1" }),
        ratingRow({ value: 5, responseId: "r1", itemKey: "q2" }),
        ratingRow({ value: 5, responseId: "r2", itemKey: "q1", courseBound: secondTermBound }),
        ratingRow({ value: 4, responseId: "r2", itemKey: "q2", courseBound: secondTermBound }),
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        assignmentRow({ respondentId: "u1" }),
        assignmentRow({ respondentId: "u2", courseBound: secondTermBound }),
      ]);

      const dto = await getGeneralEducationTrends({
        tab: "trends",
        iloId: ILO_COMMUNICATION.id,
      });
      // Means narrow to the ILO's own questions; participation stays scope-wide.
      expect(dto!.periods.map((period) => period.meanRating)).toEqual([5, 4]);
      expect(dto!.periods.map((period) => period.ratingCount)).toEqual([1, 1]);
      expect(dto!.periods.map((period) => period.submittedResponseCount)).toEqual([1, 1]);
      expect(dto!.periods.map((period) => period.evaluationOpportunityCount)).toEqual([1, 1]);
      expect(dto!.periods.map((period) => period.responseRate)).toEqual([1, 1]);
      expect(dto!.periods[0].outcomeCodes).toEqual([ILO_COMMUNICATION.code]);
      expect(dto!.periods[1].comparableWithPrevious).toBe(true);
    });
  });

  it("compares a course against its previous period only when the evidence matches", async () => {
    // Each resolved period reads its own scope, so the evidence mock answers per
    // term instance instead of replaying one scope.
    mockEvidenceByTermInstance([
      { termInstanceId: TERM_1, ratings: [[3, "r1"]], responses: ["r1"], respondents: ["u1"] },
      { termInstanceId: TERM_2, ratings: [[5, "r2"]], responses: ["r2"], respondents: ["u2"] },
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockImplementation(
      (args: { where: { course_bound_evaluation_id: { in: string[] } } }) =>
        Promise.resolve(
          args.where.course_bound_evaluation_id.in.map((evaluationId) =>
            bindingRow({ evaluationId, itemKey: "q1" })
          )
        )
    );
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
    ]);
    mockTermInstances([
      {
        id: TERM_1,
        semester: "FIRST",
        term: "FIRST_TERM",
        school_year: { id: "sy-1", code: "2025-2026" },
      },
      {
        id: TERM_2,
        semester: "SECOND",
        term: "FIRST_TERM",
        school_year: { id: "sy-1", code: "2025-2026" },
      },
    ]);
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      { term_instance_id: TERM_1 },
      { term_instance_id: TERM_2 },
    ]);

    const dto = await getGeneralEducationCourses({
      tab: "courses",
      termInstanceId: TERM_2,
    });
    const ethics = dto!.rows.find((row) => row.courseId === ETHICS.id)!;
    expect(ethics.meanRating).toBe(5);
    expect(ethics.previousComparable).toEqual({
      periodLabel: "2025-2026 · 1st Semester · 1st Term",
      meanRating: 3,
      change: 2,
    });
  });

  it("withholds a course delta when the previous period measured different evidence", async () => {
    mockEvidenceByTermInstance([
      {
        termInstanceId: TERM_1,
        ratings: [[3, "r1"]],
        responses: ["r1"],
        respondents: ["u1"],
      },
      {
        termInstanceId: TERM_2,
        ratings: [[5, "r2"]],
        responses: ["r2"],
        respondents: ["u2"],
        course: HISTORY,
        instrumentVersionId: "iv-history",
        program: BSIT,
        facultyName: "Prof. Santos",
        yearLevel: "SECOND_YEAR",
        section: "AFTERNOON",
      },
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      {
        id: "iv-ethics",
        structure_snapshot: ETHICS_INSTRUMENT,
        version_number: 1,
        template: { name: "GE Ethics" },
      },
      {
        id: "iv-history",
        structure_snapshot: HISTORY_INSTRUMENT,
        version_number: 1,
        template: { name: "GE History" },
      },
    ]);
    mockTermInstances([
      {
        id: TERM_1,
        semester: "FIRST",
        term: "FIRST_TERM",
        school_year: { id: "sy-1", code: "2025-2026" },
      },
      {
        id: TERM_2,
        semester: "SECOND",
        term: "FIRST_TERM",
        school_year: { id: "sy-1", code: "2025-2026" },
      },
    ]);
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      { term_instance_id: TERM_1 },
      { term_instance_id: TERM_2 },
    ]);

    // In the selected period only History ran, so Ethics is absent from the
    // scope entirely rather than reported with a borrowed delta.
    const dto = await getGeneralEducationCourses({ tab: "courses", termInstanceId: TERM_2 });
    expect(dto!.rows.map((row) => row.courseId)).toEqual([HISTORY.id]);
    expect(dto!.rows[0].previousComparable).toBeNull();
  });

  it("labels a single selected term instance with its full period label", async () => {
    const termId = "11111111-2222-4333-8444-555555555555";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      {
        id: termId,
        semester: "SECOND",
        term: "SECOND_TERM",
        school_year: { id: "sy-1", code: "2026-2027" },
      },
    ]);
    const frame = await getGeneralEducationAnalyticsFrame({
      tab: "outcomes",
      termInstanceId: termId,
    });
    expect(frame!.scope.periodLabel).toBe("2026-2027 · 2nd Semester · 2nd Term");
  });

  it("publishes aggregate-only qualitative evidence without comment text or singletons", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      {
        text_content:
          "The linked list exercises were great and effective for solidifying the reasoning.",
        section_key: "cilo",
        prompt_key: "open",
        response: {
          id: "r1",
          assignment: {
            course_bound: {
              id: "eval-1",
              deployment_name: "Ethics Post-Term",
              instrument: {
                id: "iv-ethics",
                version_number: 1,
                template: { name: "GE Ethics" },
                structure_snapshot: ETHICS_INSTRUMENT,
              },
            },
          },
        },
      },
      {
        text_content: "Great course.",
        section_key: "cilo",
        prompt_key: "open",
        response: {
          id: "r2",
          assignment: {
            course_bound: {
              id: "eval-1",
              deployment_name: "Ethics Post-Term",
              instrument: {
                id: "iv-ethics",
                version_number: 1,
                template: { name: "GE Ethics" },
                structure_snapshot: ETHICS_INSTRUMENT,
              },
            },
          },
        },
      },
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ id: "r1" }),
      responseRow({ id: "r2" }),
    ]);
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([
      assignmentRow({ respondentId: "u1" }),
      assignmentRow({ respondentId: "u2" }),
    ]);

    const dto = await getGeneralEducationFeedback({ tab: "qualitative" });
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("linked list exercises");
    expect(dto!.qualitativeItemCount).toBe(2);
    expect(dto!.qualitativeResponseCount).toBe(2);
    expect(dto!.tone.scoredItemCount).toBe(2);
    expect(dto!.promptCounts).toHaveLength(1);
    expect(dto!.promptCounts[0].promptLabel).toBe("Remarks");
    expect(dto!.promptCounts[0].instrumentLabel).toBe("GE Ethics v1");
    expect(dto!.evidenceEvaluations).toEqual([
      { evaluationId: "eval-1", deploymentName: "Ethics Post-Term" },
    ]);
    // Only repeated identifier-redacted terms reach the browser.
    for (const group of [dto!.tokens, dto!.promptCounts[0].terms]) {
      for (const token of group) expect(token.value).toBeGreaterThan(1);
      for (const token of group) expect(token.text).toMatch(/^[a-z][a-z-]*$/);
    }
  });
});
