import { TargetStakeholder, YearLevel } from "@prisma/client";
import { D } from "../constants/ids";

export const newCourseBoundDefs = [
  {
    id: D.CB_BSIT_IT201,
    courseCode: "IT201",
    deployName: "IT201 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSIT",
    progName: "Bachelor of Science in Information Technology",
    ylId: YearLevel.SECOND_YEAR,
    section: "MORNING",
  },
  {
    id: D.CB_BSBA_FM200,
    courseCode: "FM200",
    deployName: "FM200 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSBA",
    progName: "Bachelor of Science in Business Administration",
    ylId: YearLevel.SECOND_YEAR,
    section: "AFTERNOON",
  },
  {
    id: D.CB_BSED_ENG2,
    courseCode: "ENG2",
    deployName: "ENG2 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSED",
    progName: "Bachelor of Secondary Education",
    ylId: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
  {
    id: D.CB_BSHM_HTC401,
    courseCode: "HTC401",
    deployName: "HTC401 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSHM",
    progName: "Bachelor of Science in Hospitality Management",
    ylId: YearLevel.FOURTH_YEAR,
    section: "EVENING",
  },
  {
    id: D.CB_BEED_EDUC11E,
    courseCode: "EDUC11E",
    deployName: "EDUC11E Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BEED",
    progName: "Bachelor of Elementary Education",
    ylId: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
  // GE analytics fixture: the only Course-bound GE deployment with seeded
  // submitted qualitative responses. Isolated from the GESTECH cohorts,
  // which stay zero-response for the Student lifecycle journeys.
  {
    id: D.CB_BSIT_GEETHICS,
    courseCode: "GEETHICS",
    deployName: "GEETHICS Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSIT",
    progName: "Bachelor of Science in Information Technology",
    ylId: YearLevel.FIRST_YEAR,
    section: "AFTERNOON",
  },
  // Zero-response evaluation (§53/§61): eligible students exist on the
  // roster, but no response has been submitted — the fixture keeps it that
  // way (no response sequence references GESTECH).
  //
  // GESTECH's availability window is deliberately rolling (relative to seed
  // time) instead of the fixed 2026 window used by the other fixtures: the
  // Student lifecycle browser journey (issue #544) answers GESTECH end to
  // end, and the server-side availability gate (`activation_at <= now <=
  // deadline_at`) must hold whenever the disposable database is seeded in
  // CI. The fixed dates would freeze the journey to a single calendar
  // window. The window stays deterministic in content — only the dates
  // follow the seed run.
  {
    id: D.CB_BSIT_GESTECH,
    courseCode: "GESTECH",
    deployName: "GESTECH Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSIT",
    progName: "Bachelor of Science in Information Technology",
    ylId: YearLevel.FIRST_YEAR,
    section: "MORNING",
  },
  {
    // Isolated BSIT AFTERNOON cohort for the mobile Student lifecycle journey.
    // Demo Graduate's profile and roster membership match this scope, while
    // the desktop journey continues to own the FIRST_YEAR MORNING cohort.
    id: D.CB_BSIT_GESTECH_MOBILE,
    courseCode: "GESTECH",
    deployName: "GESTECH Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSIT",
    progName: "Bachelor of Science in Information Technology",
    ylId: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON",
  },
] as const;

export const centralDeploymentDefs = [
  {
    id: D.BSIT_EXIT,
    name: "BSIT Graduate Exit Evaluation",
    templateCode: "EXIT_SURVEY",
    progCode: "BSIT",
    target: TargetStakeholder.STUDENT,
    ylId: YearLevel.FOURTH_YEAR as YearLevel | null,
  },
  {
    id: D.BSIT_ALUMNI,
    name: "BSIT Alumni Evaluation",
    templateCode: "ALUMNI_EVAL",
    progCode: "BSIT",
    target: TargetStakeholder.ALUMNI,
    ylId: null,
  },
  {
    id: D.BSIT_IND,
    name: "BSIT Industry Partner Evaluation",
    templateCode: "INDUSTRY_EVAL",
    progCode: "BSIT",
    target: TargetStakeholder.INDUSTRY_PARTNER,
    ylId: null,
  },
  {
    id: D.BSHM_EXIT,
    name: "BSHM Graduate Exit Evaluation",
    templateCode: "EXIT_SURVEY",
    progCode: "BSHM",
    target: TargetStakeholder.STUDENT,
    ylId: YearLevel.FOURTH_YEAR,
  },
  {
    id: D.BSHM_IND,
    name: "BSHM Industry Partner Evaluation",
    templateCode: "INDUSTRY_EVAL",
    progCode: "BSHM",
    target: TargetStakeholder.INDUSTRY_PARTNER,
    ylId: null,
  },
  {
    id: D.BSIT_ALUMNI_MOBILE,
    name: "BSIT Alumni Evaluation (Mobile)",
    templateCode: "ALUMNI_EVAL",
    progCode: "BSIT",
    target: TargetStakeholder.ALUMNI,
    ylId: null,
    rollingWindow: true as const,
  },
] as const;

export const centralAssignDefs = [
  { depId: D.BSIT_EXIT, respId: "GRAD_BSIT" },
  { depId: D.BSIT_ALUMNI, respId: "ALU_BSIT" },
  { depId: D.BSIT_IND, respId: "IND_BSIT" },
  { depId: D.BSHM_EXIT, respId: "STU_BSHM_G" },
  { depId: D.BSHM_IND, respId: "IND_BSHM" },
  { depId: D.BSIT_ALUMNI_MOBILE, respId: "ALU_BSIT" },
] as const;
