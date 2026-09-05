import { YearLevel } from "@prisma/client";
import { U } from "../constants/ids";

export const courseAssignmentDefinitions = [
  {
    courseCode: "ITRES1",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "ITRES1",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON",
  },
  {
    courseCode: "IT201",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.SECOND_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "GESTECH",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FIRST_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "GESTECH",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON",
  },
  {
    courseCode: "GESTECH",
    programCode: "BSBA",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FIRST_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "GESTECH",
    programCode: "BSBA",
    facultyId: U.FAC_BSBA,
    yearLevel: YearLevel.FIRST_YEAR,
    section: "AFTERNOON",
  },
  // Publication-slice target (issue #546): owned by FAC_BSIT, unpublished,
  // with a roster the e2e publishes and then verifies is locked.
  {
    courseCode: "GESTECH",
    programCode: "BSBA",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FIRST_YEAR,
    section: "EVENING",
  },
  {
    courseCode: "MM201",
    programCode: "BSBA",
    facultyId: U.FAC_BSBA,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "FM200",
    programCode: "BSBA",
    facultyId: U.FAC_BSBA,
    yearLevel: YearLevel.SECOND_YEAR,
    section: "AFTERNOON",
  },
  {
    courseCode: "ENG2",
    programCode: "BSED",
    facultyId: U.FAC_BSED,
    yearLevel: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "ENG201",
    programCode: "BEED",
    facultyId: U.FAC_BSED,
    yearLevel: YearLevel.SECOND_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "EDUC11E",
    programCode: "BEED",
    facultyId: U.FAC_BSED,
    yearLevel: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
  {
    courseCode: "HTC401",
    programCode: "BSHM",
    facultyId: U.FAC_BSHM,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "EVENING",
  },
  {
    courseCode: "GEETHICS",
    programCode: "BSIT",
    facultyId: U.FAC_BSIT,
    yearLevel: YearLevel.FIRST_YEAR,
    section: "AFTERNOON",
  },
  {
    courseCode: "SW312",
    programCode: "BSSW",
    facultyId: U.FAC_BSED,
    yearLevel: YearLevel.THIRD_YEAR,
    section: "MORNING",
  },
] as const;

export const membershipDefinitions = [
  {
    course: "ITRES1",
    program: "BSIT",
    year: YearLevel.FOURTH_YEAR,
    section: "MORNING",
    students: [U.STU_BSIT, U.GRAD_BSIT],
  },
  {
    course: "IT201",
    program: "BSIT",
    year: YearLevel.SECOND_YEAR,
    section: "MORNING",
    students: [U.STU_BSIT, U.GRAD_BSIT],
  },
  {
    course: "GESTECH",
    program: "BSIT",
    year: YearLevel.FIRST_YEAR,
    section: "MORNING",
    students: [U.STU_BSIT],
  },
  {
    course: "GESTECH",
    program: "BSBA",
    year: YearLevel.FIRST_YEAR,
    section: "MORNING",
    students: [U.STU_BSBA, U.STU_BSBA_G],
  },
  {
    course: "GESTECH",
    program: "BSIT",
    year: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON",
    students: [U.GRAD_BSIT],
  },
  {
    course: "MM201",
    program: "BSBA",
    year: YearLevel.FOURTH_YEAR,
    section: "MORNING",
    students: [U.STU_BSBA, U.STU_BSBA_G],
  },
  {
    course: "FM200",
    program: "BSBA",
    year: YearLevel.SECOND_YEAR,
    section: "AFTERNOON",
    students: [U.STU_BSBA, U.STU_BSBA_G],
  },
  {
    course: "ENG2",
    program: "BSED",
    year: YearLevel.THIRD_YEAR,
    section: "MORNING",
    students: [U.STU_BSED],
  },
  {
    course: "EDUC11E",
    program: "BEED",
    year: YearLevel.THIRD_YEAR,
    section: "MORNING",
    students: [U.STU_BEED],
  },
  {
    course: "HTC401",
    program: "BSHM",
    year: YearLevel.FOURTH_YEAR,
    section: "EVENING",
    students: [U.STU_BSHM, U.STU_BSHM_G],
  },
  // Publication-slice roster (issue #546): Juan Dela Cruz + Daniel Tan. These
  // two Students are unused by every other e2e journey and have no active
  // GESTECH+BSBA+term membership, so the active-scope constraint accepts
  // them and no merged roster journey's name resolution changes.
  {
    course: "GESTECH",
    program: "BSBA",
    year: YearLevel.FIRST_YEAR,
    section: "EVENING",
    students: [U.STU_BSED, U.STU_BSHM],
  },
  // GE analytics fixture: GEETHICS (General Education) carries the only
  // seeded Course-bound GE responses with qualitative items, so the Gen Ed
  // Coordinator analytics workspace renders its evidence state. Rostered
  // BEED first-year students are unused by every other journey.
  {
    course: "GEETHICS",
    program: "BSIT",
    year: YearLevel.FIRST_YEAR,
    section: "AFTERNOON",
    students: [U.STU_BEED, U.STU_BSED],
  },
] as const;
