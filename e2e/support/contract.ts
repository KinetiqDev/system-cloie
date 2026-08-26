import { D, U } from "../../prisma/seed/constants/ids";

/**
 * Reviewed, deterministic Playwright fixture contract (issue #538, §61).
 *
 * Every value below is a HUMAN-REVIEWED expectation, not a value read from the
 * database under test. The deterministic Prisma seed (`prisma/seed`) is the
 * source of these SystemRole identities and deployment identifiers; the
 * response values (ratings, qualitative answers, CILO→PLO evidence links) are
 * reviewed against the seed fixtures and pinned here. If a seed row or a
 * query-under-test drifts, the contract check in `global-setup` (or a journey
 * assertion) fails before the browser journey completes, naming the affected
 * record.
 *
 * Runtime navigation handles that the app generates (program and response
 * UUIDs) are NOT part of this contract — `global-setup` discovers and merges
 * them separately because they are not identifiers under test.
 */
export const E2E_CONTRACT = {
  /** Deterministic SystemRole identities reused from the Prisma seed. */
  demoPh: { id: U.PH_BSIT, email: "demo-ph@cloie.test", name: "Demo Program Head" },
  beedPh: { id: U.PH_BEED, email: "ph-beed@cloie.test", name: "Maria Santos" },
  demoFaculty: { id: U.FAC_BSIT, email: "demo-faculty@cloie.test", name: "Demo Faculty" },
  /** Secretary and Dean identities for the setup → oversight chain (issue #549). */
  demoSecretary: { id: U.ADMIN, email: "demo-secretary@cloie.test", name: "Demo Secretary" },
  demoDean: { id: U.DEAN, email: "demo-dean@cloie.test", name: "Demo Dean" },
  /** General Education Coordinator identity (issue #547) — no Program assignment. */
  demoGenEd: { id: U.GENED, email: "demo-gened@cloie.test", name: "Gen Ed Coordinator" },
  /**
   * Deterministic Course Assignment roster-mutation fixtures (issue #545).
   * Course assignments are located by their seed definition (course code,
   * program code, year level, section) inside the ACTIVE academic period;
   * the runtime assignment id is discovered in `global-setup`.
   */
  rosterAssignments: {
    /** GESTECH BSBA MORNING: owned by the demo Faculty, active, no published evaluation (mutable). */
    gestechBsba: {
      courseCode: "GESTECH",
      programCode: "BSBA",
      yearLevel: "FIRST_YEAR",
      section: "MORNING",
    },
    /** GESTECH BSIT MORNING: owned by the demo Faculty but locked by a published evaluation. */
    gestechBsit: {
      courseCode: "GESTECH",
      programCode: "BSIT",
      yearLevel: "FIRST_YEAR",
      section: "MORNING",
    },
    /** ITRES1 BSIT AFTERNOON: owned by the demo Faculty, active, no published evaluation. */
    itres1Afternoon: {
      courseCode: "ITRES1",
      programCode: "BSIT",
      yearLevel: "FOURTH_YEAR",
      section: "AFTERNOON",
    },
    /** MM201 BSBA MORNING: owned by a different Faculty (not-found for the demo Faculty). */
    mm201: {
      courseCode: "MM201",
      programCode: "BSBA",
      yearLevel: "FOURTH_YEAR",
      section: "MORNING",
    },
  },

  /** Deterministic roster-mutation Student identities (issue #545). */
  rosterStudents: {
    /** Eligible, not a member of GESTECH BSBA MORNING → CREATED through scoped search. */
    addable: { id: U.GRAD_BSIT, name: "Demo Graduate", email: "demo-grad@cloie.test" },
    /** Active member of GESTECH BSBA MORNING → ALREADY_ACTIVE. */
    alreadyActive: { id: U.STU_BSBA, name: "Angela Reyes", email: "student-bsba@cloie.test" },
    /** Eligible, not a member of GESTECH BSBA MORNING → CREATED through CSV reconciliation. */
    csvAdd: { id: U.STU_BSIT, name: "Demo Student", email: "demo-student@cloie.test" },
    /** Active member of GESTECH BSBA MORNING; "… Jr." upload resolves as SUGGESTED_MATCH. */
    suggested: { id: U.STU_BSBA_G, name: "Carlos Santos", email: "student-bsba-grad@cloie.test" },
    /** BSBA Student whose profile mismatches the BSIT ITRES1 assignment → out of scope, not disclosed. */
    outOfScope: { name: "Angela Reyes", email: "student-bsba@cloie.test" },
    /** BEED Student eligible for a General Education roster; used in the axe review-phase
     *  scan via "Patricia Luna Jr." (suggested match → READY_CREATE, no write). */
    axeSuggested: { id: U.STU_BEED, name: "Patricia Luna", email: "student-beed@cloie.test" },
  },

  /**
   * Course-bound publication fixtures (issue #546): a Faculty-owned template
   * for the demo Faculty bound to GESTECH, and a published-evaluation-free
   * owned active assignment (GESTECH BSBA EVENING) whose roster carries two
   * students. The publication journey publishes through the real service and
   * then proves the roster lock and the Student's fresh browser read.
   */
  facultyPublicationTemplate: {
    code: "FAC_GESTECH",
    name: "GESTECH Faculty CILO Evaluation",
    ciloCount: 3,
  },
  publicationTarget: {
    courseCode: "GESTECH",
    programCode: "BSBA",
    yearLevel: "FIRST_YEAR",
    section: "EVENING",
  },
  /** Students on the publication-target roster (issue #546). */
  publicationStudents: [
    { id: U.STU_BSED, name: "Juan Dela Cruz", email: "student-bsed@cloie.test" },
    { id: U.STU_BSHM, name: "Daniel Tan", email: "student-bshm@cloie.test" },
  ],
  /** Distinct deployment name the publication journey writes; must not collide with the seeded GESTECH deployments. */
  publicationDeploymentName: "GESTECH BSBA EVENING Post-Term CILO Evaluation",
  /** Student identities for the lifecycle journey (issue #544). */
  demoStudent: { id: U.STU_BSIT, email: "demo-student@cloie.test", name: "Demo Student" },
  mobileStudent: { id: U.GRAD_BSIT, email: "demo-grad@cloie.test", name: "Demo Graduate" },

  /** Deterministic Academic Period fixtures for the Secretary → Dean chain (issue #549). */
  academicPeriods: {
    /** The currently ACTIVE period (2026-2027 Second Second → status ACTIVE). */
    active: {
      schoolYearCode: "2026-2027",
      semester: "SECOND",
      term: "SECOND_TERM",
      status: "ACTIVE" as const,
    },
    /** A PLANNED period eligible for activation (2027-2028 First First → PLANNED). */
    planned: {
      schoolYearCode: "2027-2028",
      semester: "FIRST",
      term: "FIRST_TERM",
      status: "PLANNED" as const,
    },
    /** A COMPLETED period for historical oversight (2026-2027 First First → COMPLETED). */
    completed: {
      schoolYearCode: "2026-2027",
      semester: "FIRST",
      term: "FIRST_TERM",
      status: "COMPLETED" as const,
    },
  },

  /** Deterministic deployment identifiers reused from the Prisma seed. */
  deployments: {
    courseEvaluation: { id: D.CB_BSIT_IT201, title: "IT201 Post-Term CILO Evaluation" },
    bottomUpEvaluation: { id: D.CB_BSIT_ITRES1, title: "ITRES1 Post-Term CILO Evaluation" },
    centralEvaluation: { id: D.BSIT_ALUMNI, title: "BSIT Alumni Evaluation" },
  },

  /** The GESTECH zero-response evaluation used for the Student lifecycle journey (issue #544). */
  gestechEval: { id: D.CB_BSIT_GESTECH, title: "GESTECH Post-Term CILO Evaluation" },
  gestechMobileEval: { id: D.CB_BSIT_GESTECH_MOBILE },

  /** Reviewed expectations for the IT201 course-bound SUBMITTED response (journey A). */
  courseResponse: {
    respondentName: "Demo Student",
    quantitative: [
      {
        prompt: "I achieved the first course intended learning outcome.",
        rating: 5,
      },
    ],
    qualitative: [
      {
        text: "The hands-on coding exercises for linked lists and trees were very effective in solidifying CILO 1.",
      },
    ],
  },

  /** Reviewed expectations for the ITRES1 response and its bottom-up PLO evidence link (journey B). */
  bottomUpResponse: {
    respondentName: "Demo Student",
    ploLinks: [
      {
        ploCode: "BSIT-GO1",
        ciloLabel: "Defend the proposed capstone scope and methodology.",
      },
    ],
  },
} as const;

/** The complete fixture: deterministic contract merged with runtime-discovered navigation handles. */
export type FixtureData = {
  demoPh: { id: string; email: string };
  beedPh: { id: string; email: string };
  demoFaculty: { id: string; email: string };
  demoSecretary: { id: string; email: string };
  demoDean: { id: string; email: string };
  demoGenEd: { id: string; email: string; name: string };
  academicPeriods: {
    active: { id: string; schoolYearId: string; status: string };
    planned: { id: string; schoolYearId: string; status: string };
    completed: { id: string; schoolYearId: string; status: string };
  };
  /** Runtime handles for the deterministic Course Assignment definitions above. */
  gestechBsba: { id: string; courseCode: string; programCode: string };
  gestechBsit: { id: string; courseCode: string; programCode: string };
  itres1Afternoon: { id: string; courseCode: string; programCode: string };
  mm201: { id: string; courseCode: string; programCode: string };
  rosterStudents: {
    addable: { id: string; name: string; email: string };
    alreadyActive: { id: string; name: string; email: string };
    csvAdd: { id: string; name: string; email: string };
    suggested: { id: string; name: string; email: string };
    outOfScope: { name: string; email: string };
    axeSuggested: { id: string; name: string; email: string };
  };
  demoStudent: { id: string; email: string; name: string };
  mobileStudent: { id: string; email: string; name: string };
  bsit: { id: string; code: string };
  beed: { id: string; code: string };
  courseEvaluation: { id: string; title: string };
  courseResponse: {
    id: string;
    respondentName: string;
    quantitative: Array<{ prompt: string; rating: number }>;
    qualitative: Array<{ text: string }>;
  };
  centralEvaluation: { id: string; title: string };
  bottomUpEvaluation: { id: string; title: string };
  bottomUpResponse: {
    id: string;
    respondentName: string;
    ploLinks: Array<{ ploId: string; ploCode: string; ciloLabel: string }>;
  };
  gestechEval: { id: string; title: string };
  gestechAssignment: { id: string };
  gestechMobileAssignment: { id: string };
  /** Issue #546 publication fixtures. */
  publicationTemplate: { id: string; code: string; name: string };
  publicationTarget: { id: string; courseCode: string; programCode: string };
  publicationDeploymentName: string;
  publicationStudents: Array<{ id: string; name: string; email: string }>;
};
