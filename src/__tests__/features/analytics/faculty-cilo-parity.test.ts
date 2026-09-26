import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCiloMetrics,
  buildQuestionMetrics,
  type OutcomeItemRatingRow,
} from "@/features/analytics/aggregators/cilo";
import { getFacultyAnalyticsDataAction } from "@/lib/actions/faculty-analytics-actions";
import { ROLES } from "@/lib/constants/roles";

/**
 * Faculty and canonical metric boundaries (issue #645).
 *
 * The two builders already share their quantitative arithmetic: both filter to
 * valid raw ratings and call `groupRatingsByScale`, which pools raw values
 * rather than averaging question means. What they do not share is the grouping
 * unit and the presentation projection, and the cases below pin those
 * differences so a future attempt to swap the Faculty builders for the
 * canonical aggregators fails here instead of silently re-partitioning,
 * dropping unrated questions, or discarding archived bindings.
 */

const { courseBoundEvaluationFindManyMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  courseBoundEvaluationFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { courseBoundEvaluation: { findMany: courseBoundEvaluationFindManyMock } },
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const SCALE_5 = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];
const SCALE_4 = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Excellent" },
];

type Rating = { responseId: string; sectionKey: string; itemKey: string; value: number };

/** Which binding each rated question carries, mirroring the published snapshot. */
const BINDING_ID_BY_ITEM: Record<string, string> = {
  first: "binding-1",
  second: "binding-2",
  archived: "binding-archived",
};

/**
 * One evaluation whose two Likert questions carry different scales, plus a
 * binding whose CILO row is gone.
 */
function evaluationFixture(ratings: Rating[]) {
  const likert = (key: string, prompt: string, descriptors: typeof SCALE_5) => ({
    key,
    kind: "quantitative" as const,
    prompt,
    likertDescriptors: descriptors,
  });
  return {
    id: "evaluation-1",
    deployment_name: "End-of-term evaluation",
    status: "CLOSED",
    course_assignment_id: "11111111-1111-4111-8111-111111111111",
    term_instance_id: "22222222-2222-4222-8222-222222222222",
    course_info_snapshot: {},
    course_assignment: {
      id: "11111111-1111-4111-8111-111111111111",
      year_level: "SECOND_YEAR",
      section: "MORNING",
      course: { id: "33333333-3333-4333-8333-333333333333", code: "IT 201", title: "SE" },
      program: { id: "44444444-4444-4444-8444-444444444444", code: "BSIT", name: "BSIT" },
    },
    assignments: ratings.map((rating) => ({
      respondent_id: `student-${rating.responseId}`,
      response: {
        id: rating.responseId,
        status: "SUBMITTED",
        quant_items: [
          {
            rating_value: rating.value,
            section_key: rating.sectionKey,
            item_key: rating.itemKey,
            cilo_question_binding_id: BINDING_ID_BY_ITEM[rating.itemKey] ?? null,
          },
        ],
        qual_items: [],
      },
    })),
    cilos_snapshot: [{ description: "Apply methods", id: "cilo-1", label: "CILO 1" }],
    cilo_question_bindings: [
      {
        id: "binding-1",
        cilo_id: "cilo-1",
        cilo_description_snapshot: "Apply methods",
        question_prompt_snapshot: "Question one",
        section_key: "outcomes",
        item_key: "first",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
      {
        id: "binding-2",
        cilo_id: "cilo-1",
        cilo_description_snapshot: "Apply methods",
        question_prompt_snapshot: "Question two",
        section_key: "outcomes",
        item_key: "second",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
      {
        id: "binding-archived",
        cilo_id: null,
        cilo_description_snapshot: "Archived description",
        question_prompt_snapshot: "Question archived",
        section_key: "outcomes",
        item_key: "archived",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
    ],
    instrument: {
      id: "instrument-1",
      version_number: 2,
      template: { name: "IT201 Course Evaluation" },
      structure_snapshot: [
        {
          key: "outcomes",
          title: "Learning outcomes",
          items: [
            likert("first", "Question one", SCALE_5),
            likert("second", "Question two", SCALE_4),
            likert("archived", "Question archived", SCALE_5),
          ],
        },
      ],
    },
    term_instance: {
      id: "22222222-2222-4222-8222-222222222222",
      semester: "FIRST",
      term: null,
      start_date: new Date("2026-08-01"),
      school_year: { code: "2026-2027" },
    },
    _count: { assignments: ratings.length },
  };
}

/** The same ratings as canonical rows under one evaluation and CILO. */
function canonicalRows(ratings: Rating[], evaluationId: string, ciloId: string | null) {
  return ratings.map<OutcomeItemRatingRow>((rating) => ({
    sectionKey: rating.sectionKey,
    itemKey: rating.itemKey,
    prompt: rating.itemKey,
    ratingValue: rating.value,
    responseId: rating.responseId,
    scale:
      rating.itemKey === "second"
        ? { key: "scale4", descriptors: SCALE_4, min: 1, max: 4 }
        : { key: "scale5", descriptors: SCALE_5, min: 1, max: 5 },
    cilo: ciloId ? { id: ciloId, label: "CILO 1", description: "Apply methods" } : null,
    evaluationId,
    goMappings: [],
  }));
}

describe("Faculty and canonical metric boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, userId: "faculty-1" });
  });

  it("pools raw ratings across a CILO's questions and separates their incompatible scales", async () => {
    // Question one is rated 5 and 4 on the 1-5 scale; question two is rated 2
    // on the 1-4 scale. Pooling every raw rating into one mean would give
    // (5 + 4 + 2) / 3 = 3.67 across two incompatible scales.
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluationFixture([
        { responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 },
        { responseId: "r2", sectionKey: "outcomes", itemKey: "first", value: 4 },
        { responseId: "r3", sectionKey: "outcomes", itemKey: "second", value: 2 },
      ]),
    ]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!faculty.success) throw new Error(faculty.error);

    const facultyGroups = faculty.data.ciloMetrics
      .filter((metric) => metric.ciloId === "cilo-1")
      .map((metric) =>
        metric.scaleGroups.map((group) => ({
          scaleLabel: group.scaleLabel,
          mean: group.mean,
          ratingCount: group.ratingCount,
        }))
      );
    expect(facultyGroups).toEqual([
      [
        { scaleLabel: "1–5 (5-point)", mean: 4.5, ratingCount: 2 },
        { scaleLabel: "1–4 (4-point)", mean: 2, ratingCount: 1 },
      ],
    ]);

    // The canonical groups hold the same numbers. Only the order differs: the
    // Faculty projection keeps first-rated scale order, while the canonical
    // aggregator sorts by scale key, so a swap would reorder the rendered rows.
    const canonical = buildCiloMetrics(
      canonicalRows(
        [
          { responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 },
          { responseId: "r2", sectionKey: "outcomes", itemKey: "first", value: 4 },
          { responseId: "r3", sectionKey: "outcomes", itemKey: "second", value: 2 },
        ],
        "evaluation-1",
        "cilo-1"
      )
    );
    expect(
      canonical.flatMap((metric) =>
        metric.scaleGroups.map((group) => ({ mean: group.mean, ratingCount: group.ratingCount }))
      )
    ).toEqual([
      { mean: 2, ratingCount: 1 },
      { mean: 4.5, ratingCount: 2 },
    ]);
  });

  it("groups one CILO per evaluation, which the canonical per-CILO pool would merge", async () => {
    // The same CILO id is bound in two Faculty-owned evaluations of one course.
    const retake = {
      ...evaluationFixture([]),
      id: "evaluation-2",
      deployment_name: "Retake evaluation",
      cilo_question_bindings: [
        {
          ...evaluationFixture([]).cilo_question_bindings[0]!,
          course_bound_evaluation_id: "evaluation-2",
        },
      ],
      term_instance: {
        id: "55555555-5555-4555-8555-555555555555",
        semester: "SECOND",
        term: null,
        start_date: new Date("2027-01-05"),
        school_year: { code: "2026-2027" },
      },
    };
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluationFixture([{ responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 }]),
      {
        ...retake,
        assignments: [
          {
            respondent_id: "student-r2",
            response: {
              id: "r2",
              status: "SUBMITTED",
              quant_items: [
                {
                  rating_value: 1,
                  section_key: "outcomes",
                  item_key: "first",
                  cilo_question_binding_id: "binding-1",
                },
              ],
              qual_items: [],
            },
          },
        ],
      },
    ]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!faculty.success) throw new Error(faculty.error);

    // Each evaluation keeps its own CILO metric, so one term's ratings never
    // pool into another's mean.
    const facultyCiloMetrics = faculty.data.ciloMetrics.filter(
      (metric) => metric.ciloId === "cilo-1"
    );
    expect(
      facultyCiloMetrics.map((metric) => ({
        evaluationId: metric.evaluationId,
        mean: metric.scaleGroups[0]?.mean,
      }))
    ).toEqual([
      { evaluationId: "evaluation-1", mean: 5 },
      { evaluationId: "evaluation-2", mean: 1 },
    ]);
    // The emitted identity stays distinct per evaluation, so two rows naming the
    // same CILO never collide as list keys.
    expect(new Set(facultyCiloMetrics.map((metric) => metric.key)).size).toBe(2);

    // Canonical aggregation is keyed by CILO alone, so both evaluations collapse
    // into one pooled mean of 3 unless the caller partitions by hand.
    const merged = buildCiloMetrics([
      ...canonicalRows(
        [{ responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 }],
        "evaluation-1",
        "cilo-1"
      ),
      ...canonicalRows(
        [{ responseId: "r2", sectionKey: "outcomes", itemKey: "first", value: 1 }],
        "evaluation-2",
        "cilo-1"
      ),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.scaleGroups[0]).toMatchObject({ mean: 3, ratingCount: 2 });
  });

  it("lists unrated questions, which canonical row-driven aggregation cannot enumerate", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluationFixture([{ responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 }]),
    ]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "questions" });
    if (!faculty.success) throw new Error(faculty.error);

    // The question view is enumerated from the frozen structure snapshot, so a
    // question with no ratings still appears for the "unrated" disclosure.
    expect(
      faculty.data.questionMetrics.map((metric) => ({
        prompt: metric.prompt,
        groupCount: metric.scaleGroups.length,
      }))
    ).toEqual([
      { prompt: "Question one", groupCount: 1 },
      { prompt: "Question two", groupCount: 0 },
      { prompt: "Question archived", groupCount: 0 },
    ]);

    // Canonical question metrics are driven by rating rows, so an unrated
    // question has no row to enumerate it from.
    const canonical = buildQuestionMetrics(
      canonicalRows(
        [{ responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 }],
        "evaluation-1",
        "cilo-1"
      )
    );
    expect(canonical.map((metric) => metric.itemKey)).toEqual(["first"]);
  });

  it("keeps a binding whose CILO row is gone, which a null canonical CILO would drop", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluationFixture([
        { responseId: "r1", sectionKey: "outcomes", itemKey: "archived", value: 5 },
      ]),
    ]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!faculty.success) throw new Error(faculty.error);

    // The binding outlives its CILO, so it keeps its own group rather than
    // vanishing, and it never pools under another CILO.
    expect(faculty.data.ciloMetrics.find((metric) => metric.ciloId === null)).toMatchObject({
      label: "Unassigned CILO",
      description: "Archived description",
      scaleGroups: [{ mean: 5, ratingCount: 1 }],
    });

    // A null canonical CILO drops the row entirely: keeping archived evidence
    // needs a synthesized id, as the Program Head read path already does.
    expect(
      buildCiloMetrics(
        canonicalRows(
          [{ responseId: "r1", sectionKey: "outcomes", itemKey: "archived", value: 5 }],
          "evaluation-1",
          null
        )
      )
    ).toEqual([]);
  });

  it("reports the excluded rating on the scope distributions, not the metric groups", async () => {
    // Two in-scale ratings plus one outside the frozen 1-5 scale.
    const fixture = evaluationFixture([
      { responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 },
      { responseId: "r2", sectionKey: "outcomes", itemKey: "first", value: 4 },
    ]);
    fixture.assignments = [
      ...fixture.assignments,
      {
        respondent_id: "student-r3",
        response: {
          id: "r3",
          status: "SUBMITTED",
          quant_items: [
            {
              rating_value: 9,
              section_key: "outcomes",
              item_key: "first",
              cilo_question_binding_id: "binding-1",
            },
          ],
          qual_items: [],
        },
      },
    ];
    courseBoundEvaluationFindManyMock.mockResolvedValue([fixture]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!faculty.success) throw new Error(faculty.error);

    // The out-of-scale rating is excluded from every mean, and the count lands
    // once on the scope-level distribution rather than on each metric group.
    expect(faculty.data.kpi.validRatingCount).toBe(2);
    expect(
      faculty.data.ratingDistributions.map((group) => ({
        mean: group.mean,
        ratingCount: group.ratingCount,
        excludedRatingCount: group.excludedRatingCount,
      }))
    ).toEqual([{ mean: 4.5, ratingCount: 2, excludedRatingCount: 1 }]);
    expect(faculty.data.ciloMetrics.flatMap((metric) => metric.scaleGroups)).toEqual([
      expect.objectContaining({ mean: 4.5, ratingCount: 2, excludedRatingCount: 0 }),
    ]);

    // Canonical groups carry no excluded-count field, so a swap would drop the
    // scope-level diagnostic the top-level distributions still need.
    const canonical = buildCiloMetrics(
      canonicalRows(
        [
          { responseId: "r1", sectionKey: "outcomes", itemKey: "first", value: 5 },
          { responseId: "r2", sectionKey: "outcomes", itemKey: "first", value: 4 },
        ],
        "evaluation-1",
        "cilo-1"
      )
    );
    expect(canonical[0]?.scaleGroups[0]).not.toHaveProperty("excludedRatingCount");
    expect(canonical[0]?.scaleGroups[0]).toMatchObject({ mean: 4.5, ratingCount: 2 });
  });

  it("reports no CILO or question metric when the Faculty scope has no evaluation", async () => {
    // A Faculty member with no published evaluation in scope: the read returns
    // empty evidence rather than failing or inventing a placeholder row.
    courseBoundEvaluationFindManyMock.mockResolvedValue([]);

    const faculty = await getFacultyAnalyticsDataAction({ view: "overview" });
    if (!faculty.success) throw new Error(faculty.error);

    expect(faculty.data.ciloMetrics).toEqual([]);
    expect(faculty.data.questionMetrics).toEqual([]);
    expect(faculty.data.ratingDistributions).toEqual([]);
    expect(faculty.data.kpi).toMatchObject({
      submittedResponseCount: 0,
      validRatingCount: 0,
      overallMean: null,
      responseRate: null,
      spansMultipleScales: false,
    });

    // The canonical builders agree on empty input, so the zero case is not one
    // of the differences a cutover would expose.
    expect(buildCiloMetrics([])).toEqual([]);
    expect(buildQuestionMetrics([])).toEqual([]);
  });
});
