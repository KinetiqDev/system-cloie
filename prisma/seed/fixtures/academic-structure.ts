import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";

export const programDefinitions = [
  { code: "BEED", name: "Bachelor of Elementary Education" },
  { code: "BSED", name: "Bachelor of Secondary Education" },
  { code: "BSSW", name: "Bachelor of Science in Social Work" },
  { code: "BSBA", name: "Bachelor of Science in Business Administration" },
  { code: "BSIT", name: "Bachelor of Science in Information Technology" },
  { code: "BSHM", name: "Bachelor of Science in Hospitality Management" },
] as const;

export const majorDefinitions = [
  { pc: "BSED", name: "English" },
  { pc: "BSED", name: "Mathematics" },
  { pc: "BSED", name: "Science" },
  { pc: "BSED", name: "Values Education" },
  { pc: "BSBA", name: "Financial Management" },
  { pc: "BSBA", name: "Human Resource Development Management" },
  { pc: "BSBA", name: "Marketing Management" },
] as const;

export const courseDefinitions: {
  code: string;
  title: string;
  scope: CourseScope;
  pc?: string;
  mk?: string;
  yl?: YearLevel;
  sem?: AcademicSemester;
  trm?: AcademicTerm;
}[] = [
  { code: "GEGS101", title: "General Education Foundations", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "NSTP1", title: "National Service Training Program 1", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT101", title: "Introduction to Computing", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT-OD-401", title: "Outline Defense Demo Course", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "IT301", title: "Web Development and Design", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "EDUC101", title: "Foundations of Teaching and Learning", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "EDUC201", title: "Curriculum Development", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "ENG201", title: "Language Across the Curriculum", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH201", title: "Mathematics in the Modern World", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "BEED101", title: "Child and Adolescent Development", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "BEED201", title: "Inclusive Education", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "BA101", title: "Introduction to Business", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MKT301", title: "Strategic Marketing", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM302", title: "People Development and Training", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "FIN303", title: "Financial Analysis and Planning", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW101", title: "Introduction to Social Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW201", title: "Community Development Practice", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM101", title: "Introduction to Hospitality Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM201", title: "Food and Beverage Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "HM301", title: "Hotel Operations and Front Office", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  // New courses
  { code: "IT201", title: "Data Structures and Algorithms", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT401", title: "Systems Administration and Maintenance", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT-CAP-401", title: "Capstone Project 1", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "FIN101", title: "Financial Accounting", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "HRDM201", title: "Organizational Behavior and Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "EDUC301", title: "Assessment and Evaluation in Education", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI201", title: "Science and Technology in Society", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "HM401", title: "Events Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM302", title: "Tourism and Travel Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "BEED301", title: "Teaching Practicum in Elementary Education", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "BEED201B", title: "Assessment of Student Learning in Elementary Grades", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "BEED102", title: "Educational Psychology and Learning Theories", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "SW301", title: "Social Welfare and Social Work in the Philippines", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW202", title: "Case Work and Social Group Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "SW401", title: "Field Practice in Social Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
];
