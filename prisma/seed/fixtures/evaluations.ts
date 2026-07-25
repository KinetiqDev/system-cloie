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
    id: D.CB_BSBA_FIN101,
    courseCode: "FIN101",
    deployName: "FIN101 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSBA",
    progName: "Bachelor of Science in Business Administration",
    ylId: YearLevel.SECOND_YEAR,
    section: "AFTERNOON",
  },
  {
    id: D.CB_BSED_EDUC301,
    courseCode: "EDUC301",
    deployName: "EDUC301 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSED",
    progName: "Bachelor of Secondary Education",
    ylId: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
  {
    id: D.CB_BSHM_HM401,
    courseCode: "HM401",
    deployName: "HM401 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BSHM",
    progName: "Bachelor of Science in Hospitality Management",
    ylId: YearLevel.FOURTH_YEAR,
    section: "EVENING",
  },
  {
    id: D.CB_BEED_BEED301,
    courseCode: "BEED301",
    deployName: "BEED301 Post-Term CILO Evaluation",
    progId: undefined as string | undefined,
    progCode: "BEED",
    progName: "Bachelor of Elementary Education",
    ylId: YearLevel.THIRD_YEAR,
    section: "MORNING",
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
] as const;

export const centralAssignDefs = [
  { depId: D.BSIT_EXIT, respId: "GRAD_BSIT" },
  { depId: D.BSIT_ALUMNI, respId: "ALU_BSIT" },
  { depId: D.BSIT_IND, respId: "IND_BSIT" },
  { depId: D.BSHM_EXIT, respId: "STU_BSHM_G" },
  { depId: D.BSHM_IND, respId: "IND_BSHM" },
] as const;
