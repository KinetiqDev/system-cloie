import type { AcademicSemester, AcademicTerm, YearLevel } from "@prisma/client";

export type CourseScheduleDefaults = {
  default_year_level: YearLevel | null;
  default_semester: AcademicSemester | null;
  default_term: AcademicTerm | null;
};
