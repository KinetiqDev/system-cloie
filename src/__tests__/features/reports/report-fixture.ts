import { ResponseStatus, TargetStakeholder } from "@prisma/client";
import { PO_CLASSIFICATION_LABELS } from "@/features/outcomes/po-classification";
import type {
  ReportCentralGroup,
  ReportCiloMapping,
  ReportCourseGroup,
  ReportEvidence,
} from "@/features/reports/types";

// ---------------------------------------------------------------------------
// Deterministic report-export fixture
//
// One Program (BSIT) with a second Program (BSBA) that must never appear in an
// export, three Professional Course class groups across two courses, two
// faculty members and two sections of the same course, two instrument versions
// with incompatible scales, a required question nobody answered, an optional
// question, an out-of-scale rating, two respondents sharing one name, one
// blank account name, CILOs mapping to several Program Outcomes, a live direct
// question binding and a frozen-snapshot direct binding, three Central
// deployments for three respondent categories, and legacy GO-era PO codes.
//
// Every expected number in the export tests is hand-computed from these literals
// and documented beside the expectation, never derived from the aggregators
// under test.
// ---------------------------------------------------------------------------

export const PROGRAMS = {
  bsit: { id: "prog-bsit", code: "BSIT", name: "Bachelor of Science in Information Technology" },
  bsba: { id: "prog-bsba", code: "BSBA", name: "Bachelor of Science in Business Administration" },
} as const;

export const TERM = {
  termInstanceId: "term-bsit-2026-1",
  schoolYearCode: "2026-2027",
  semester: "FIRST" as const,
  semesterLabel: "1st Semester",
  term: "FIRST_TERM" as const,
  termLabel: "1st Term",
  label: "2026-2027 · 1st Semester · 1st Term",
};

/** BSIT catalog. `BSIT-GO1` and `BSIT-GO2` are persisted legacy GO-era codes. */
export const POS = [
  {
    id: "po-1",
    code: "BSIT-GO1",
    description: "Explain technical concepts to non-specialists",
    classification: "CORE" as const,
    isActive: true,
    order: 1,
  },
  {
    id: "po-2",
    code: "BSIT-GO2",
    description: "Apply computing principles to unfamiliar problems",
    classification: "PROFESSIONAL" as const,
    isActive: true,
    order: 2,
  },
  {
    id: "po-3",
    code: "BSIT-GO3",
    description: "Work ethically within an organization",
    classification: "COMMON" as const,
    isActive: true,
    order: 3,
  },
  {
    id: "po-4",
    code: "BSIT-GO4",
    description: "Demonstrate continuous professional learning",
    classification: "UNCLASSIFIED" as const,
    isActive: false,
    order: 4,
  },
] as const;

export const CILO_MAPPINGS: ReportCiloMapping[] = [
  {
    poId: "po-1",
    poCode: "BSIT-GO1",
    poDescription: "Explain technical concepts to non-specialists",
    manifestation: "LEARNING",
    classification: "CORE",
    classificationLabel: PO_CLASSIFICATION_LABELS.CORE,
  },
  {
    poId: "po-2",
    poCode: "BSIT-GO2",
    poDescription: "Apply computing principles to unfamiliar problems",
    manifestation: "PRACTICE",
    classification: "PROFESSIONAL",
    classificationLabel: PO_CLASSIFICATION_LABELS.PROFESSIONAL,
  },
  {
    poId: "po-3",
    poCode: "BSIT-GO3",
    poDescription: "Work ethically within an organization",
    manifestation: null,
    classification: "COMMON",
    classificationLabel: PO_CLASSIFICATION_LABELS.COMMON,
  },
  {
    poId: "po-4",
    poCode: "BSIT-GO4",
    poDescription: "Demonstrate continuous professional learning",
    manifestation: "OPPORTUNITY",
    classification: "UNCLASSIFIED",
    classificationLabel: PO_CLASSIFICATION_LABELS.UNCLASSIFIED,
  },
];

export const CILO_MAPPINGS_BY_CILO: Map<string, ReportCiloMapping[]> = new Map([
  ["cilo-1", [CILO_MAPPINGS[0]]],
  ["cilo-2", [CILO_MAPPINGS[1]]],
  ["cilo-3", [CILO_MAPPINGS[0], CILO_MAPPINGS[1]]],
]);

/**
 * Approved five-point descriptor sets from the canonical policy. Course
 * instruments publish `likertDescriptors`, so a live scale identity carries the
 * labels the policy classifies; the legacy unlabeled numeric scale in IT102 does
 * not, and stays unclassified.
 */
export const ATTAINMENT_DESCRIPTORS = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];

/** Same numeric range, different wording: incompatible with the attainment set. */
export const AGREEMENT_DESCRIPTORS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

export const INSTRUMENT_V1_SNAPSHOT = [
  {
    key: "cilo-items",
    title: "CILO Results",
    questions: [
      {
        key: "cilo-1-q1",
        type: "likert",
        order: 1,
        prompt: "I explained technical ideas clearly.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
      {
        key: "cilo-1-q2",
        type: "likert",
        order: 2,
        prompt: "I worked effectively with my group.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
      {
        key: "cilo-1-q3",
        type: "likert",
        order: 3,
        prompt: "I can evaluate my own learning in this course.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
      {
        key: "cilo-2-q1",
        type: "likert",
        order: 4,
        prompt: "I applied course principles to unfamiliar problems.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
      {
        key: "general-q1",
        type: "likert",
        order: 5,
        prompt: "The course materials were clear.",
        required: false,
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
    ],
  },
];

/** Instrument version 2 republishes the same item keys on an agreement scale. */
export const INSTRUMENT_V2_SNAPSHOT = [
  {
    key: "cilo-items",
    title: "CILO Results",
    questions: [
      {
        key: "cilo-1-q1",
        type: "likert",
        order: 1,
        prompt: "I explained technical ideas clearly.",
        likertDescriptors: AGREEMENT_DESCRIPTORS,
      },
      {
        key: "cilo-2-q1",
        type: "likert",
        order: 2,
        prompt: "I applied course principles to unfamiliar problems.",
        likertDescriptors: AGREEMENT_DESCRIPTORS,
      },
    ],
  },
];

/**
 * IT102 publishes instrument version 3. Its directly bound question keeps the
 * legacy unlabeled numeric scale, which the canonical policy does not classify.
 */
export const IT102_SNAPSHOT = [
  {
    key: "cilo-items",
    title: "CILO Results",
    questions: [
      {
        key: "cilo-3-q1",
        type: "likert",
        order: 1,
        prompt: "I modelled a small information system.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
    ],
  },
  {
    key: "po-items",
    title: "Program Outcome Items",
    items: [
      {
        key: "po-direct-1",
        kind: "quantitative",
        prompt: "I keep my professional knowledge up to date.",
        scale: [1, 2, 3, 4, 5],
      },
    ],
  },
];

export const CENTRAL_STUDENT_SNAPSHOT = [
  {
    key: "program-outcomes",
    title: "Program Outcomes",
    questions: [
      {
        key: "po-q1",
        type: "likert",
        order: 1,
        prompt: "The program prepared me for work.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
      {
        key: "general-q2",
        type: "likert",
        order: 2,
        prompt: "I would recommend this program.",
        likertDescriptors: ATTAINMENT_DESCRIPTORS,
      },
    ],
  },
];

function answer(sectionKey: string, itemKey: string, ratingValue: number) {
  return { sectionKey, itemKey, ratingValue };
}

/**
 * IT101 morning class, faculty Dela Cruz, instrument version 1.
 *
 * Ratings — hand-computed expectations:
 * - cilo-1-q1: 4, 5, 3, 4 → n=3:1, n=4:2, n=5:1, valid 4, sum 16, mean 4.00
 * - cilo-1-q2: 5 → valid 1, sum 5, mean 5.00, 3 missing
 * - cilo-1-q3: nobody answered → valid 0, 4 missing, no evidence
 * - cilo-2-q1: 2, 9 (out of scale), 2, 5 → valid 3, excluded 1, sum 9, mean 3.00
 * - general-q1: 3 → valid 1, optional so no missing count
 * - CILO 1 pools cilo-1-q1 and cilo-1-q2: 5 ratings, sum 21, mean 4.20,
 *   four distinct responses. A mean of question means would be 4.50.
 */
export const GROUP_IT101_MORNING: ReportCourseGroup = {
  courseId: "course-it101",
  courseCode: "IT101",
  courseTitle: "Introduction to Computing",
  courseAssignmentId: "ca-it101-dela-cruz",
  facultyId: "user-dela-cruz",
  facultyName: "Dela Cruz, Ana",
  section: "MORNING",
  yearLevel: "FIRST_YEAR",
  yearLevelLabel: "1st Year",
  evaluationId: "eval-it101-morning",
  evaluationName: "IT101 First Term CILO Evaluation",
  evaluationStatus: "CLOSED",
  termInstance: TERM,
  instrumentId: "iv-cilo-v1",
  instrumentLabel: "CILO Evaluation v1",
  structureSnapshot: INSTRUMENT_V1_SNAPSHOT,
  cilosSnapshot: [
    { id: "cilo-1", label: "CILO 1", description: "Explain technical ideas", order: 1 },
    { id: "cilo-2", label: "CILO 2", description: "Apply principles", order: 2 },
  ],
  ciloBindings: [
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-1-q1",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      ciloDescription: "Explain technical ideas",
      questionPrompt: "I explained technical ideas clearly.",
    },
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-1-q2",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      ciloDescription: "Explain technical ideas",
      questionPrompt: "I worked effectively with my group.",
    },
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-1-q3",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      ciloDescription: "Explain technical ideas",
      questionPrompt: "I can evaluate my own learning in this course.",
    },
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-2-q1",
      ciloId: "cilo-2",
      ciloLabel: "CILO 2",
      ciloDescription: "Apply principles",
      questionPrompt: "I applied course principles to unfamiliar problems.",
    },
  ],
  directPoBindings: [
    {
      sectionKey: "cilo-items",
      itemKey: "general-q1",
      poId: "po-1",
      poCode: "BSIT-GO1",
      poDescription: "Explain technical concepts to non-specialists",
      questionPrompt: "The course materials were clear.",
    },
  ],
  assignedRespondentCount: 6,
  submissions: [
    { respondentId: "user-ann", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-ben-1", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-ben-2", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-no-name", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-ina", responseStatus: ResponseStatus.IN_PROGRESS },
    { respondentId: "user-oscar", responseStatus: null },
  ],
  responses: [
    {
      responseId: "resp-it101-ann",
      respondentId: "user-ann",
      respondentName: "Alpha, Ann",
      submittedAt: new Date("2026-01-12T09:15:00.000Z"),
      answers: [
        answer("cilo-items", "cilo-1-q1", 4),
        answer("cilo-items", "cilo-1-q2", 5),
        answer("cilo-items", "cilo-2-q1", 2),
        answer("cilo-items", "general-q1", 3),
      ],
    },
    {
      responseId: "resp-it101-ben-1",
      respondentId: "user-ben-1",
      respondentName: "Bravo, Ben",
      submittedAt: new Date("2026-01-12T09:20:00.000Z"),
      answers: [
        answer("cilo-items", "cilo-1-q1", 5),
        // Out of scale on purpose: excluded from every aggregate.
        answer("cilo-items", "cilo-2-q1", 9),
      ],
    },
    {
      responseId: "resp-it101-ben-2",
      respondentId: "user-ben-2",
      respondentName: "Bravo, Ben",
      submittedAt: new Date("2026-01-12T09:22:00.000Z"),
      answers: [answer("cilo-items", "cilo-1-q1", 3), answer("cilo-items", "cilo-2-q1", 2)],
    },
    {
      responseId: "resp-it101-noname",
      respondentId: "user-no-name",
      respondentName: null,
      submittedAt: new Date("2026-01-12T09:25:00.000Z"),
      answers: [answer("cilo-items", "cilo-1-q1", 4), answer("cilo-items", "cilo-2-q1", 5)],
    },
  ],
};

/**
 * IT101 afternoon class, faculty Santos, instrument version 2.
 *
 * cilo-1-q1: 4 (agree), 2 (disagree) → n=2:1, n=4:1, valid 2, mean 3.00 on the
 * five-point agreement identity: classified, but indirect stakeholder
 * perception rather than demonstrated competency.
 */
export const GROUP_IT101_AFTERNOON: ReportCourseGroup = {
  courseId: "course-it101",
  courseCode: "IT101",
  courseTitle: "Introduction to Computing",
  courseAssignmentId: "ca-it101-santos",
  facultyId: "user-santos",
  facultyName: "Santos, Ben",
  section: "AFTERNOON",
  yearLevel: "FIRST_YEAR",
  yearLevelLabel: "1st Year",
  evaluationId: "eval-it101-afternoon",
  evaluationName: "IT101 Second Term CILO Evaluation",
  evaluationStatus: "ACTIVE",
  termInstance: TERM,
  instrumentId: "iv-cilo-v2",
  instrumentLabel: "CILO Evaluation v2",
  structureSnapshot: INSTRUMENT_V2_SNAPSHOT,
  cilosSnapshot: [
    { id: "cilo-1", label: "CILO 1", description: "Explain technical ideas", order: 1 },
    { id: "cilo-2", label: "CILO 2", description: "Apply principles", order: 2 },
  ],
  ciloBindings: [
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-1-q1",
      ciloId: "cilo-1",
      ciloLabel: "CILO 1",
      ciloDescription: "Explain technical ideas",
      questionPrompt: "I explained technical ideas clearly.",
    },
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-2-q1",
      ciloId: "cilo-2",
      ciloLabel: "CILO 2",
      ciloDescription: "Apply principles",
      questionPrompt: "I applied course principles to unfamiliar problems.",
    },
  ],
  directPoBindings: [
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-2-q1",
      poId: null,
      poCode: "BSIT-GO4",
      poDescription: "Demonstrate continuous professional learning",
      questionPrompt: "I applied course principles to unfamiliar problems.",
    },
  ],
  assignedRespondentCount: 2,
  submissions: [
    { respondentId: "user-ann", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-dan", responseStatus: ResponseStatus.SUBMITTED },
  ],
  responses: [
    {
      responseId: "resp-it101-pm-ann",
      respondentId: "user-ann",
      respondentName: "Alpha, Ann",
      submittedAt: new Date("2026-01-20T13:05:00.000Z"),
      answers: [answer("cilo-items", "cilo-1-q1", 4)],
    },
    {
      responseId: "resp-it101-pm-dan",
      respondentId: "user-dan",
      respondentName: "Delta, Dan",
      submittedAt: new Date("2026-01-20T13:07:00.000Z"),
      answers: [answer("cilo-items", "cilo-1-q1", 2)],
    },
  ],
};

/**
 * IT102 second-year class. CILO 3 maps to two Program Outcomes, and the
 * `po-direct-1` question carries a frozen publication snapshot binding to a PO
 * whose live record no longer exists (`po_id = null`).
 *
 * cilo-3-q1: 5, 5 → valid 2, mean 5.00. po-direct-1: 4, 5 → valid 2, mean 4.50.
 */
export const GROUP_IT102: ReportCourseGroup = {
  courseId: "course-it102",
  courseCode: "IT102",
  courseTitle: "Programming Fundamentals 2",
  courseAssignmentId: "ca-it102-dela-cruz",
  facultyId: "user-dela-cruz",
  facultyName: "Dela Cruz, Ana",
  section: "MORNING",
  yearLevel: "SECOND_YEAR",
  yearLevelLabel: "2nd Year",
  evaluationId: "eval-it102",
  evaluationName: "IT102 CILO Evaluation",
  evaluationStatus: "CLOSED",
  termInstance: TERM,
  instrumentId: "iv-cilo-v3",
  instrumentLabel: "CILO Evaluation v3",
  structureSnapshot: IT102_SNAPSHOT,
  cilosSnapshot: [
    { id: "cilo-3", label: "CILO 1", description: "Model an information system", order: 1 },
  ],
  ciloBindings: [
    {
      sectionKey: "cilo-items",
      itemKey: "cilo-3-q1",
      ciloId: "cilo-3",
      ciloLabel: "CILO 1",
      ciloDescription: "Model an information system",
      questionPrompt: "I modelled a small information system.",
    },
  ],
  directPoBindings: [
    {
      sectionKey: "po-items",
      itemKey: "po-direct-1",
      poId: null,
      poCode: "BSIT-GO4",
      poDescription: "Demonstrate continuous professional learning",
      questionPrompt: "I keep my professional knowledge up to date.",
    },
  ],
  assignedRespondentCount: 3,
  submissions: [
    { respondentId: "user-eda", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-fay", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-gil", responseStatus: ResponseStatus.IN_PROGRESS },
  ],
  responses: [
    {
      responseId: "resp-it102-eda",
      respondentId: "user-eda",
      respondentName: "Echo, Eda",
      submittedAt: new Date("2026-01-14T08:00:00.000Z"),
      answers: [answer("cilo-items", "cilo-3-q1", 5), answer("po-items", "po-direct-1", 4)],
    },
    {
      responseId: "resp-it102-fay",
      respondentId: "user-fay",
      respondentName: "Foxtrot, Fay",
      submittedAt: new Date("2026-01-14T08:04:00.000Z"),
      answers: [answer("cilo-items", "cilo-3-q1", 5), answer("po-items", "po-direct-1", 5)],
    },
  ],
};

/**
 * Program-wide student deployment whose `po-q1` question is published against
 * two Program Outcomes, so both receive the same two ratings.
 */
export const CENTRAL_STUDENT: ReportCentralGroup = {
  deploymentId: "dep-pw-student",
  deploymentName: "Program-wide Student Evaluation v2",
  deploymentStatus: "CLOSED",
  targetStakeholder: TargetStakeholder.STUDENT,
  majorLabel: null,
  yearLevel: null,
  termInstance: TERM,
  instrumentId: "iv-pw-v2",
  instrumentLabel: "Program-wide Student v2",
  structureSnapshot: CENTRAL_STUDENT_SNAPSHOT,
  poBindings: [
    {
      sectionKey: "program-outcomes",
      itemKey: "po-q1",
      poId: "po-1",
      poCode: "BSIT-GO1",
      poDescription: "Explain technical concepts to non-specialists",
      questionPrompt: "The program prepared me for work.",
    },
    {
      sectionKey: "program-outcomes",
      itemKey: "po-q1",
      poId: "po-3",
      poCode: "BSIT-GO3",
      poDescription: "Work ethically within an organization",
      questionPrompt: "The program prepared me for work.",
    },
  ],
  assignedRespondentCount: 2,
  submissions: [
    { respondentId: "user-ann", responseStatus: ResponseStatus.SUBMITTED },
    { respondentId: "user-dan", responseStatus: ResponseStatus.SUBMITTED },
  ],
  responses: [
    {
      responseId: "resp-pw-ann",
      respondentId: "user-ann",
      respondentName: "Alpha, Ann",
      submittedAt: new Date("2026-01-25T10:00:00.000Z"),
      answers: [
        answer("program-outcomes", "po-q1", 4),
        answer("program-outcomes", "general-q2", 5),
      ],
    },
    {
      responseId: "resp-pw-dan",
      respondentId: "user-dan",
      respondentName: "Delta, Dan",
      submittedAt: new Date("2026-01-25T10:02:00.000Z"),
      answers: [
        answer("program-outcomes", "po-q1", 3),
        answer("program-outcomes", "general-q2", 2),
      ],
    },
  ],
};

export const CENTRAL_ALUMNI: ReportCentralGroup = {
  ...CENTRAL_STUDENT,
  deploymentId: "dep-alumni",
  deploymentName: "Alumni Exit Survey v1",
  deploymentStatus: "CLOSED",
  targetStakeholder: TargetStakeholder.ALUMNI,
  instrumentId: "iv-alumni-v1",
  instrumentLabel: "Alumni Exit v1",
  poBindings: [
    {
      sectionKey: "program-outcomes",
      itemKey: "po-q1",
      poId: "po-1",
      poCode: "BSIT-GO1",
      poDescription: "Explain technical concepts to non-specialists",
      questionPrompt: "The program prepared me for work.",
    },
  ],
  assignedRespondentCount: 1,
  submissions: [{ respondentId: "user-gia", responseStatus: ResponseStatus.SUBMITTED }],
  responses: [
    {
      responseId: "resp-alumni-gia",
      respondentId: "user-gia",
      respondentName: "Golf, Gia",
      submittedAt: new Date("2026-01-26T11:00:00.000Z"),
      answers: [answer("program-outcomes", "po-q1", 5)],
    },
  ],
};

export const CENTRAL_INDUSTRY: ReportCentralGroup = {
  ...CENTRAL_STUDENT,
  deploymentId: "dep-industry",
  deploymentName: "Industry Partner Survey v1",
  deploymentStatus: "CLOSED",
  targetStakeholder: TargetStakeholder.INDUSTRY_PARTNER,
  majorLabel: "IT Services",
  instrumentId: "iv-industry-v1",
  instrumentLabel: "Industry Partner v1",
  poBindings: [
    {
      sectionKey: "program-outcomes",
      itemKey: "po-q1",
      poId: "po-2",
      poCode: "BSIT-GO2",
      poDescription: "Apply computing principles to unfamiliar problems",
      questionPrompt: "The program prepared me for work.",
    },
  ],
  assignedRespondentCount: 1,
  submissions: [{ respondentId: "user-hali", responseStatus: ResponseStatus.SUBMITTED }],
  responses: [
    {
      responseId: "resp-industry-hali",
      respondentId: "user-hali",
      respondentName: "Hotel, Hali",
      submittedAt: new Date("2026-01-27T11:00:00.000Z"),
      answers: [answer("program-outcomes", "po-q1", 4)],
    },
  ],
};

/** The complete authorized evidence read behind one export. */
export function reportEvidenceFixture(): ReportEvidence {
  return {
    programId: PROGRAMS.bsit.id,
    programCode: PROGRAMS.bsit.code,
    programName: PROGRAMS.bsit.name,
    period: {
      schoolYearId: "sy-2026",
      schoolYearCode: TERM.schoolYearCode,
      semester: TERM.semester,
      semesterLabel: TERM.semesterLabel,
      termInstanceId: TERM.termInstanceId,
      termLabel: TERM.termLabel,
      label: TERM.label,
    },
    yearLevel: null,
    yearLevelLabel: "All year levels",
    outcomes: POS.map((po) => ({
      id: po.id,
      code: po.code,
      description: po.description,
      classification: po.classification,
      classificationLabel: PO_CLASSIFICATION_LABELS[po.classification],
      isActive: po.isActive,
      order: po.order,
    })),
    ciloMappings: CILO_MAPPINGS_BY_CILO,
    courseGroups: [GROUP_IT101_MORNING, GROUP_IT101_AFTERNOON, GROUP_IT102],
    centralGroups: [CENTRAL_STUDENT, CENTRAL_ALUMNI, CENTRAL_INDUSTRY],
  };
}

/**
 * Hand-computed course-bound PO evidence for the fixture scope.
 *
 * - BSIT-GO1: CILO 1 on the morning attainment scale (21 over 5 ratings) + CILO
 *   1 on the afternoon agreement scale (6 over 2 ratings) + CILO 3 (10 over 2
 *   ratings) + the direct binding on `general-q1` (3) = 40 over 10 ratings →
 *   mean 4.00. Two incompatible scale identities contribute, so the canonical
 *   policy leaves the row unclassified.
 * - BSIT-GO2: CILO 2 (9 over 3 ratings; the 9 is excluded) + CILO 3 (10 over 2
 *   ratings) = 19 over 5 ratings → mean 3.80 → Attained.
 * - BSIT-GO4: the frozen direct binding (4 + 5) = 9 over 2 ratings → mean 4.50
 *   on an unlabeled numeric scale, which the policy does not classify.
 */
export const EXPECTED_COURSE_PO = [
  { code: "BSIT-GO1", ratingCount: 10, mean: 4, status: "mixed-scales", classification: "Core" },
  {
    code: "BSIT-GO2",
    ratingCount: 5,
    mean: 3.8,
    status: "classified",
    classification: "Professional",
  },
  {
    code: "BSIT-GO4",
    ratingCount: 2,
    mean: 4.5,
    status: "unsupported-scale",
    classification: "Needs classification",
  },
] as const;

// ---------------------------------------------------------------------------
// Multi-binding and mixed-scale fixtures (added after review)
// ---------------------------------------------------------------------------

/**
 * One published question bound directly to two Program Outcomes. Analytics
 * credits the answer to both; an export that keeps only the last binding
 * silently drops one Program Outcome's evidence.
 */
export function groupWithTwoDirectPoBindings(): ReportCourseGroup {
  return {
    ...GROUP_IT102,
    evaluationId: "eval-it102-multi-po",
    evaluationName: "IT102 Multi-PO CILO Evaluation",
    structureSnapshot: IT102_SNAPSHOT,
    ciloBindings: [],
    directPoBindings: [
      {
        sectionKey: "po-items",
        itemKey: "po-direct-1",
        poId: "po-4",
        poCode: "BSIT-GO4",
        poDescription: "Demonstrate continuous professional learning",
        questionPrompt: "I keep my professional knowledge up to date.",
      },
      {
        sectionKey: "po-items",
        itemKey: "po-direct-1",
        poId: "po-2",
        poCode: "BSIT-GO2",
        poDescription: "Apply computing principles to unfamiliar problems",
        questionPrompt: "I keep my professional knowledge up to date.",
      },
    ],
    assignedRespondentCount: 2,
    submissions: [
      { respondentId: "user-eda", responseStatus: "SUBMITTED" as const },
      { respondentId: "user-fay", responseStatus: "SUBMITTED" as const },
    ],
    responses: [
      {
        responseId: "resp-multi-1",
        respondentId: "user-eda",
        respondentName: "Echo, Eda",
        submittedAt: new Date("2026-01-14T08:00:00.000Z"),
        answers: [answer("po-items", "po-direct-1", 4)],
      },
      {
        responseId: "resp-multi-2",
        respondentId: "user-fay",
        respondentName: "Foxtrot, Fay",
        submittedAt: new Date("2026-01-14T08:04:00.000Z"),
        answers: [answer("po-items", "po-direct-1", 5)],
      },
    ],
  };
}

/**
 * A class group holding one question on the approved 1–5 attainment scale and
 * one general question on an unrelated 1–10 scale, so the printed option
 * columns must cover both identities.
 */
export function groupWithTenPointGeneralQuestion(): ReportCourseGroup {
  const base = GROUP_IT101_MORNING;
  return {
    ...base,
    evaluationId: "eval-it101-ten-point",
    evaluationName: "IT101 Ten-Point CILO Evaluation",
    structureSnapshot: [
      {
        key: "cilo-items",
        title: "CILO Results",
        questions: [
          {
            key: "cilo-1-q1",
            type: "likert",
            order: 1,
            prompt: "I explained technical ideas clearly.",
            likertDescriptors: ATTAINMENT_DESCRIPTORS,
          },
          {
            key: "general-10",
            type: "likert",
            order: 2,
            prompt: "How satisfied were you with the facilities?",
            likertDescriptors: Array.from({ length: 10 }, (_, index) => ({
              value: index + 1,
              label: `Level ${index + 1}`,
            })),
          },
        ],
      },
    ],
    ciloBindings: [
      {
        sectionKey: "cilo-items",
        itemKey: "cilo-1-q1",
        ciloId: "cilo-1",
        ciloLabel: "CILO 1",
        ciloDescription: "Explain technical ideas",
        questionPrompt: "I explained technical ideas clearly.",
      },
    ],
    directPoBindings: [],
    assignedRespondentCount: 2,
    submissions: [
      { respondentId: "user-ann", responseStatus: "SUBMITTED" as const },
      { respondentId: "user-ben-1", responseStatus: "SUBMITTED" as const },
    ],
    responses: [
      {
        responseId: "resp-ten-ann",
        respondentId: "user-ann",
        respondentName: "Alpha, Ann",
        submittedAt: new Date("2026-01-12T09:15:00.000Z"),
        answers: [answer("cilo-items", "cilo-1-q1", 4), answer("cilo-items", "general-10", 8)],
      },
      {
        responseId: "resp-ten-ben",
        respondentId: "user-ben-1",
        respondentName: "Bravo, Ben",
        submittedAt: new Date("2026-01-12T09:20:00.000Z"),
        answers: [answer("cilo-items", "general-10", 10)],
      },
    ],
  };
}

/**
 * One CILO whose two questions sit on incompatible scales, answered by the
 * same two people, so per-scale response counts overlap and only the canonical
 * count is correct.
 */
export function groupWithMixedScaleCilo(): ReportCourseGroup {
  return {
    ...GROUP_IT101_MORNING,
    evaluationId: "eval-it101-mixed-scale",
    evaluationName: "IT101 Mixed-Scale CILO Evaluation",
    structureSnapshot: [
      {
        key: "cilo-items",
        title: "CILO Results",
        questions: [
          {
            key: "cilo-1-attainment",
            type: "likert",
            order: 1,
            prompt: "I achieved the outcome.",
            likertDescriptors: ATTAINMENT_DESCRIPTORS,
          },
          {
            key: "cilo-1-agreement",
            type: "likert",
            order: 2,
            prompt: "I agree the outcome was achieved.",
            likertDescriptors: AGREEMENT_DESCRIPTORS,
          },
        ],
      },
    ],
    ciloBindings: [
      {
        sectionKey: "cilo-items",
        itemKey: "cilo-1-attainment",
        ciloId: "cilo-1",
        ciloLabel: "CILO 1",
        ciloDescription: "Explain technical ideas",
        questionPrompt: "I achieved the outcome.",
      },
      {
        sectionKey: "cilo-items",
        itemKey: "cilo-1-agreement",
        ciloId: "cilo-1",
        ciloLabel: "CILO 1",
        ciloDescription: "Explain technical ideas",
        questionPrompt: "I agree the outcome was achieved.",
      },
    ],
    directPoBindings: [],
    assignedRespondentCount: 3,
    submissions: [
      { respondentId: "user-ann", responseStatus: "SUBMITTED" as const },
      { respondentId: "user-ben-1", responseStatus: "SUBMITTED" as const },
      { respondentId: "user-ben-2", responseStatus: "SUBMITTED" as const },
    ],
    responses: [
      {
        responseId: "resp-mixed-1",
        respondentId: "user-ann",
        respondentName: "Alpha, Ann",
        submittedAt: new Date("2026-01-12T09:15:00.000Z"),
        answers: [
          answer("cilo-items", "cilo-1-attainment", 5),
          answer("cilo-items", "cilo-1-agreement", 4),
        ],
      },
      {
        responseId: "resp-mixed-2",
        respondentId: "user-ben-1",
        respondentName: "Bravo, Ben",
        submittedAt: new Date("2026-01-12T09:20:00.000Z"),
        answers: [answer("cilo-items", "cilo-1-attainment", 4)],
      },
      {
        responseId: "resp-mixed-3",
        respondentId: "user-ben-2",
        respondentName: "Bravo, Ben",
        submittedAt: new Date("2026-01-12T09:22:00.000Z"),
        answers: [answer("cilo-items", "cilo-1-agreement", 2)],
      },
    ],
  };
}
