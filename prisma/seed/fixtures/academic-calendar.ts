import { AcademicPeriodStatus, AcademicSemester, AcademicTerm } from "@prisma/client";
import { D } from "../constants/ids";

export const managedTermInstanceIds = [
  D.TI_2026_2027_1ST,
  D.TI_2026_2027_2ND,
  D.TI_2027_2028_1ST,
  D.TI_2027_2028_2ND_CANCELLED,
];

export const academicTermDefinitions = [
  {
    id: D.TI_2026_2027_1ST,
    schoolYear: "2026-2027",
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
    startDate: "2026-08-01",
    endDate: "2026-12-15",
    status: AcademicPeriodStatus.COMPLETED,
  },
  {
    id: D.TI_2026_2027_2ND,
    schoolYear: "2026-2027",
    semester: AcademicSemester.SECOND,
    term: AcademicTerm.SECOND_TERM,
    startDate: "2027-01-15",
    endDate: "2027-05-31",
    status: AcademicPeriodStatus.ACTIVE,
  },
  {
    id: D.TI_2027_2028_1ST,
    schoolYear: "2027-2028",
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
    startDate: "2027-08-01",
    endDate: "2027-12-15",
    status: AcademicPeriodStatus.PLANNED,
  },
  {
    id: D.TI_2027_2028_2ND_CANCELLED,
    schoolYear: "2027-2028",
    semester: AcademicSemester.SECOND,
    term: AcademicTerm.SECOND_TERM,
    startDate: "2028-01-15",
    endDate: "2028-05-31",
    status: AcademicPeriodStatus.CANCELLED,
  },
] as const;
