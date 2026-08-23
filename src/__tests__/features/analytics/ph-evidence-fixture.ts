import type { LikertDescriptor } from "@/features/analytics/aggregators/scale-identity";
import type { OutcomeItemRatingRow } from "@/features/analytics/aggregators/cilo";
import type { CentralPloRatingRow } from "@/features/analytics/aggregators/plo";
import type { ParticipationRow } from "@/features/analytics/aggregators/participation";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";

// ---------------------------------------------------------------------------
// Deterministic analytics fixture (spec §53)
//
// One reference dataset covering: two Programs (one with Majors, one
// without), multiple Program Heads, multiple Faculty teaching the same
// Course, multiple Sections, students across Majors, course evaluations in
// two academic periods with an incompatible scale, a program-wide student
// evaluation with direct PLO snapshot bindings (one question covering two
// PLOs), an alumni and an industry evaluation, submitted / in-progress /
// unstarted assignments, and one zero-response evaluation. Manifestations
// LEARNING, PRACTICE, and OPPORTUNITY all appear; one CILO maps to several
// PLOs and several CILOs map to one PLO.
//
// Every expected number used in tests is hand-computed from these literals,
// never derived from the aggregators under test.
// ---------------------------------------------------------------------------

export const PROGRAMS = {
  beed: { id: "prog-beed", code: "BEED", name: "Bachelor of Elementary Education" },
  bshm: { id: "prog-bshm", code: "BSHM", name: "Bachelor of Science in Hospitality Management" },
} as const;

/** BEED has Majors; BSHM deliberately has none. */
export const MAJORS = {
  math: { id: "major-math", label: "Mathematics" },
  sci: { id: "major-sci", label: "Science" },
} as const;

export const TERMS = {
  ti1: { id: "term-ti1", label: "1st Semester 2026-2027" },
  ti2: { id: "term-ti2", label: "2nd Semester 2026-2027" },
} as const;

export const USERS = {
  phBeed: { id: "user-ph-beed" },
  phBshm: { id: "user-ph-bshm" },
  f1: { id: "user-f1", name: "Faculty One" },
  f2: { id: "user-f2", name: "Faculty Two" },
  s1: { id: "user-s1", major: MAJORS.math.id },
  s2: { id: "user-s2", major: MAJORS.math.id },
  s3: { id: "user-s3", major: MAJORS.sci.id },
  s4: { id: "user-s4", major: MAJORS.sci.id },
  s5: { id: "user-s5", major: null },
  s6: { id: "user-s6", major: null },
  alum1: { id: "user-alum1" },
  ind1: { id: "user-ind1" },
} as const;

export const COURSES = {
  it101: { id: "course-it101", code: "IT101", title: "Introduction to Computing" },
  hr101: { id: "course-hr101", code: "HR101", title: "Housekeeping Fundamentals" },
} as const;

/** Same course IT101 taught by two Faculty in two periods and sections. */
export const COURSE_ASSIGNMENTS = {
  it101f1: { id: "ca-it101-f1", course: COURSES.it101.id, faculty: USERS.f1.id, term: TERMS.ti1.id, section: "MORNING" },
  it101f2: { id: "ca-it101-f2", course: COURSES.it101.id, faculty: USERS.f2.id, term: TERMS.ti2.id, section: "AFTERNOON" },
  hr101: { id: "ca-hr101", course: COURSES.hr101.id, faculty: USERS.f1.id, term: TERMS.ti2.id, section: "MORNING" },
} as const;

// -- Scales -----------------------------------------------------------------

/** 1–5 attainment scale used by course evaluation version 1. */
export const SCALE5: LikertDescriptor[] = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];

/**
 * 1–4 scale with different labels and range: incompatible with SCALE5 under
 * §9 (numeric ranges alone do not define compatibility).
 */
export const SCALE4: LikertDescriptor[] = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Excellent" },
];

/**
 * 1–5 agreement scale: SAME numeric range as SCALE5 but different labels, so
 * it is also incompatible with SCALE5 (§9 explicitly rejects range-only
 * compatibility).
 */
export const AGREEMENT5: LikertDescriptor[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

function likertSection(key: string, title: string, descriptors: LikertDescriptor[], items: Array<{ key: string; prompt: string }>) {
  return [
    {
      key,
      title,
      items: items.map((item) => ({
        ...item,
        kind: "quantitative" as const,
        likertDescriptors: descriptors,
      })),
    },
  ];
}

export const SNAPSHOTS = {
  /** Course-bound v1: CILO section (SCALE5) plus an unbound general section. */
  cbV1: [
    ...likertSection("cilo-items", "CILO Attainment", SCALE5, [
      { key: "q-cilo-a", prompt: "Outcome A was achieved." },
      { key: "q-cilo-a2", prompt: "Outcome A was applied in practice." },
      { key: "q-cilo-b", prompt: "Outcome B was achieved." },
    ]),
    ...likertSection("general-items", "General Feedback", SCALE5, [
      { key: "q-general", prompt: "The course was well organized." },
    ]),
  ],
  /** Course-bound v2: same item keys on the incompatible 1–4 scale. */
  cbV2: [
    ...likertSection("cilo-items", "CILO Attainment", SCALE4, [
      { key: "q-cilo-a", prompt: "Outcome A was achieved." },
      { key: "q-cilo-a2", prompt: "Outcome A was applied in practice." },
      { key: "q-cilo-b", prompt: "Outcome B was achieved." },
    ]),
    ...likertSection("general-items", "General Feedback", SCALE4, [
      { key: "q-general", prompt: "The course was well organized." },
    ]),
  ],
  /** Central student instrument: agreement scale, direct PLO binding items. */
  centralStudent: likertSection("plo-items", "Program Outcomes", AGREEMENT5, [
    { key: "q-plo-single", prompt: "The program built strong foundations." },
    { key: "q-plo-multi", prompt: "The program prepared me for further study." },
  ]),
  /** Alumni instrument on the 1–4 scale (includes an out-of-scale case). */
  alumni: likertSection("alumni-items", "Alumni Feedback", SCALE4, [
    { key: "q-alumni-prep", prompt: "My studies prepared me for work." },
  ]),
} as const;

// -- Outcomes ---------------------------------------------------------------

export const CILOS = {
  a: { id: "cilo-a", label: "CILO 1", description: "Apply computational thinking." },
  b: { id: "cilo-b", label: "CILO 2", description: "Use productivity tools effectively." },
  h1: { id: "cilo-h1", label: "CILO 1", description: "Maintain housekeeping standards." },
} as const;

/**
 * Many-to-one and one-to-many at once: CILO-a maps to PLO1 (LEARNING) and
 * PLO2 (OPPORTUNITY); CILO-b maps to PLO1 (PRACTICE). Manifestations carry
 * no weight and never filter contributions (§7).
 */
export const CILO_MAPPINGS = {
  a: [
    { ploId: "plo-1", ploCode: "PLO1", ploDescription: "Communicate effectively.", manifestation: "LEARNING" },
    { ploId: "plo-2", ploCode: "PLO2", ploDescription: "Solve problems creatively.", manifestation: "OPPORTUNITY" },
  ],
  b: [{ ploId: "plo-1", ploCode: "PLO1", ploDescription: "Communicate effectively.", manifestation: "PRACTICE" }],
} as const;

/** Direct program-wide bindings published on the central deployment. */
export const CENTRAL_PLO_SNAPSHOTS = {
  single: { sectionKey: "plo-items", itemKey: "q-plo-single", ploId: "plo-1", ploCodeSnapshot: "PLO1", ploDescriptionSnapshot: "Communicate effectively." },
  /** One question covering TWO PLOs (unweighted coverage). */
  multi: [
    { sectionKey: "plo-items", itemKey: "q-plo-multi", ploId: "plo-1", ploCodeSnapshot: "PLO1", ploDescriptionSnapshot: "Communicate effectively." },
    { sectionKey: "plo-items", itemKey: "q-plo-multi", ploId: "plo-2", ploCodeSnapshot: "PLO2", ploDescriptionSnapshot: "Solve problems creatively." },
  ],
} as const;

// -- Evaluations ------------------------------------------------------------

type SeededResponse = {
  status: "SUBMITTED" | "IN_PROGRESS";
  /** sectionKey -> itemKey -> rating value */
  ratings: Record<string, Record<string, number>>;
};

type AssignmentSeed = {
  respondent: keyof typeof USERS;
  response?: SeededResponse;
};

type CourseEvaluationSeed = {
  id: string;
  name: string;
  program: keyof typeof PROGRAMS;
  term: keyof typeof TERMS;
  courseAssignment: keyof typeof COURSE_ASSIGNMENTS;
  snapshot: keyof typeof SNAPSHOTS;
  assignments: AssignmentSeed[];
};

export const EVALUATIONS = {
  /**
   * Period 1, SCALE5. Hand-computed (submitted ratings only):
   * question q-cilo-a: [5,4] mean 4.5; q-cilo-a2: [3] mean 3;
   * q-cilo-b: [3,4] mean 3.5; q-general: [4,1] mean 2.5;
   * evaluation mean 24/7 ≈ 3.428571.
   */
  e1: {
    id: "cb-e1",
    name: "IT101 Post-Term Evaluation AY26 First",
    program: "beed",
    term: "ti1",
    courseAssignment: "it101f1",
    snapshot: "cbV1",
    assignments: [
      { respondent: "s1", response: { status: "SUBMITTED", ratings: { "cilo-items": { "q-cilo-a": 5, "q-cilo-a2": 3, "q-cilo-b": 3 }, "general-items": { "q-general": 4 } } } },
      { respondent: "s2", response: { status: "SUBMITTED", ratings: { "cilo-items": { "q-cilo-a": 4, "q-cilo-b": 4 }, "general-items": { "q-general": 1 } } } },
      { respondent: "s3", response: { status: "IN_PROGRESS", ratings: { "cilo-items": { "q-cilo-a": 3, "q-cilo-b": 2 } } } },
      { respondent: "s4" },
    ],
  } as CourseEvaluationSeed,

  /**
   * Period 2 on the incompatible SCALE4. Submitted: S1 q-cilo-a=2,
   * q-cilo-b=4, q-general=3; S3 unstarted.
   */
  e2: {
    id: "cb-e2",
    name: "IT101 Post-Term Evaluation AY26 Second",
    program: "beed",
    term: "ti2",
    courseAssignment: "it101f2",
    snapshot: "cbV2",
    assignments: [
      { respondent: "s1", response: { status: "SUBMITTED", ratings: { "cilo-items": { "q-cilo-a": 2, "q-cilo-b": 4 }, "general-items": { "q-general": 3 } } } },
      { respondent: "s3" },
    ],
  } as CourseEvaluationSeed,

  /** Zero-response evaluation: assignments exist, nothing was answered. */
  e3: {
    id: "cb-e3",
    name: "HR101 Post-Term Evaluation AY26 Second",
    program: "bshm",
    term: "ti2",
    courseAssignment: "hr101",
    snapshot: "cbV1",
    assignments: [{ respondent: "s5" }, { respondent: "s6" }],
  } as CourseEvaluationSeed,
} as const;

/** Central deployment seeds; target drives stakeholder attribution. */
export const CENTRAL_EVALUATIONS = {
  /**
   * Program-wide student evaluation, period 1. Submitted: S2 with
   * q-plo-single=4 and q-plo-multi=2; S4 unstarted.
   */
  centralStudent: {
    id: "cd-student",
    name: "BSIT Exit Survey AY26 First",
    program: "beed",
    term: "ti1",
    stakeholder: "STUDENT",
    snapshot: "centralStudent",
    assignments: [
      { respondent: "s2", response: { status: "SUBMITTED", ratings: { "plo-items": { "q-plo-single": 4, "q-plo-multi": 2 } } } },
      { respondent: "s4" },
    ],
  },

  /** Alumni evaluation with one out-of-scale submitted value (5 on 1–4). */
  alumni: {
    id: "cd-alumni",
    name: "Alumni Evaluation AY26 Second",
    program: "beed",
    term: "ti2",
    stakeholder: "ALUMNI",
    snapshot: "alumni",
    assignments: [
      { respondent: "alum1", response: { status: "SUBMITTED", ratings: { "alumni-items": { "q-alumni-prep": 3 } } } },
      { respondent: "ind1" },
    ],
  },
} as const;

// -- Row builders ------------------------------------------------------------

function assignmentStakeholder(evaluation: { stakeholder?: string }): "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER" {
  return (evaluation.stakeholder as "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER") ?? "STUDENT";
}

/** All in-scope assignment rows of one evaluation seed for participation. */
export function participationRows(
  evaluation: CourseEvaluationSeed | (typeof CENTRAL_EVALUATIONS.centralStudent | typeof CENTRAL_EVALUATIONS.alumni)
): ParticipationRow[] {
  return evaluation.assignments.map((assignment) => ({
    respondentId: USERS[assignment.respondent].id,
    stakeholder: assignmentStakeholder(evaluation),
    responseStatus: assignment.response?.status ?? null,
  }));
}

type AnyEvaluation =
  | CourseEvaluationSeed
  | typeof CENTRAL_EVALUATIONS.centralStudent
  | typeof CENTRAL_EVALUATIONS.alumni;

function evaluationEntries(evaluation: AnyEvaluation) {
  const snapshot = SNAPSHOTS[evaluation.snapshot];
  return evaluation.assignments.flatMap((assignment) => {
    if (!assignment.response || assignment.response.status !== "SUBMITTED") {
      return [];
    }
    return Object.entries(assignment.response.ratings).flatMap(([sectionKey, items]) =>
      Object.entries(items).map(([itemKey, value]) => ({
        evaluationId: evaluation.id,
        evaluationName: evaluation.name,
        sectionKey,
        itemKey,
        value,
        responseId: `${evaluation.id}:${USERS[assignment.respondent].id}`,
        scale: resolveItemScaleIdentity(snapshot, sectionKey, itemKey),
      }))
    );
  });
}

const CB_CILO_BY_ITEM: Record<string, keyof typeof CILOS> = {
  "q-cilo-a": "a",
  "q-cilo-a2": "a",
  "q-cilo-b": "b",
};

/** Course-bound submitted ratings normalized for CILO/question aggregation. */
export function ciloRows(...evaluationKeys: Array<keyof typeof EVALUATIONS>): OutcomeItemRatingRow[] {
  return evaluationKeys.flatMap((key) => {
    const evaluation = EVALUATIONS[key];
    const snapshot = SNAPSHOTS[evaluation.snapshot];
    return evaluationEntries(evaluation).map((entry) => {
      const ciloKey = CB_CILO_BY_ITEM[entry.itemKey];
      const cilo = ciloKey ? CILOS[ciloKey] : null;
      return {
        sectionKey: entry.sectionKey,
        itemKey: entry.itemKey,
        prompt: entry.itemKey,
        ratingValue: entry.value,
        responseId: entry.responseId,
        scale: entry.scale ?? resolveItemScaleIdentity(snapshot, entry.sectionKey, entry.itemKey),
        cilo: cilo ? { id: cilo.id, label: cilo.label, description: cilo.description } : null,
        ploMappings: ciloKey ? [...CILO_MAPPINGS[ciloKey]] : [],
      };
    });
  });
}

function centralBindings(sectionKey: string, itemKey: string) {
  const matches = [
    ...(CENTRAL_PLO_SNAPSHOTS.single.sectionKey === sectionKey && CENTRAL_PLO_SNAPSHOTS.single.itemKey === itemKey
      ? [CENTRAL_PLO_SNAPSHOTS.single]
      : []),
    ...CENTRAL_PLO_SNAPSHOTS.multi.filter(
      (binding) => binding.sectionKey === sectionKey && binding.itemKey === itemKey
    ),
  ];
  return matches.map((binding) => ({
    ploId: binding.ploId,
    ploCode: binding.ploCodeSnapshot,
    ploDescription: binding.ploDescriptionSnapshot,
  }));
}

/** Central student ratings normalized for program-wide PLO aggregation. */
export function centralPloRows(): CentralPloRatingRow[] {
  const evaluation = CENTRAL_EVALUATIONS.centralStudent;
  const snapshot = SNAPSHOTS[evaluation.snapshot];
  return evaluationEntries(evaluation).map((entry) => ({
    sectionKey: entry.sectionKey,
    itemKey: entry.itemKey,
    ratingValue: entry.value,
    responseId: entry.responseId,
    scale: entry.scale ?? resolveItemScaleIdentity(snapshot, entry.sectionKey, entry.itemKey),
    ploBindings: centralBindings(entry.sectionKey, entry.itemKey),
  }));
}
