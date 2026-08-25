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

  /** Deterministic deployment identifiers reused from the Prisma seed. */
  deployments: {
    courseEvaluation: { id: D.CB_BSIT_IT201, title: "IT201 Post-Term CILO Evaluation" },
    bottomUpEvaluation: { id: D.CB_BSIT_ITRES1, title: "ITRES1 Post-Term CILO Evaluation" },
    centralEvaluation: { id: D.BSIT_ALUMNI, title: "BSIT Alumni Evaluation" },
  },

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
};

