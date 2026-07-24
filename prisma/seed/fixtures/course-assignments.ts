import { YearLevel } from "@prisma/client";
import { U } from "../constants/ids";

export const courseAssignmentDefinitions = [
  { courseCode: "IT-OD-401", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FOURTH_YEAR, section: "MORNING" },
  { courseCode: "IT-OD-401", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FOURTH_YEAR, section: "AFTERNOON" },
  { courseCode: "IT201", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.SECOND_YEAR, section: "MORNING" },
  { courseCode: "GEGS101", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FIRST_YEAR, section: "MORNING" },
  { courseCode: "GEGS101", programCode: "BSBA", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FIRST_YEAR, section: "MORNING" },
  { courseCode: "MKT301", programCode: "BSBA", facultyId: U.FAC_BSBA, yearLevel: YearLevel.FOURTH_YEAR, section: "MORNING" },
  { courseCode: "FIN101", programCode: "BSBA", facultyId: U.FAC_BSBA, yearLevel: YearLevel.SECOND_YEAR, section: "AFTERNOON" },
  { courseCode: "EDUC301", programCode: "BSED", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },
  { courseCode: "ENG201", programCode: "BSED", facultyId: U.FAC_BSED, yearLevel: YearLevel.SECOND_YEAR, section: "MORNING" },
  { courseCode: "BEED301", programCode: "BEED", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },
  { courseCode: "HM401", programCode: "BSHM", facultyId: U.FAC_BSHM, yearLevel: YearLevel.FOURTH_YEAR, section: "EVENING" },
  { courseCode: "SW301", programCode: "BSSW", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },
] as const;

export const membershipDefinitions = [
  { course: "IT-OD-401", program: "BSIT", year: YearLevel.FOURTH_YEAR, section: "MORNING", students: [U.STU_BSIT, U.GRAD_BSIT] },
  { course: "IT201", program: "BSIT", year: YearLevel.SECOND_YEAR, section: "MORNING", students: [U.STU_BSIT, U.GRAD_BSIT] },
  { course: "GEGS101", program: "BSIT", year: YearLevel.FIRST_YEAR, section: "MORNING", students: [U.STU_BSIT] },
  { course: "GEGS101", program: "BSBA", year: YearLevel.FIRST_YEAR, section: "MORNING", students: [U.STU_BSBA, U.STU_BSBA_G] },
  { course: "MKT301", program: "BSBA", year: YearLevel.FOURTH_YEAR, section: "MORNING", students: [U.STU_BSBA, U.STU_BSBA_G] },
  { course: "FIN101", program: "BSBA", year: YearLevel.SECOND_YEAR, section: "AFTERNOON", students: [U.STU_BSBA, U.STU_BSBA_G] },
  { course: "EDUC301", program: "BSED", year: YearLevel.THIRD_YEAR, section: "MORNING", students: [U.STU_BSED] },
  { course: "BEED301", program: "BEED", year: YearLevel.THIRD_YEAR, section: "MORNING", students: [U.STU_BEED] },
  { course: "HM401", program: "BSHM", year: YearLevel.FOURTH_YEAR, section: "EVENING", students: [U.STU_BSHM, U.STU_BSHM_G] },
] as const;
