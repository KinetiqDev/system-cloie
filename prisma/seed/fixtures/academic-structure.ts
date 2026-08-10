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

// Source of truth: docs/acd_programs_demo_seed_recommended_expanded.csv (102 courses).
// Transformations applied when deriving this fixture:
//   1. Course codes are normalized by stripping spaces ("IT 101" -> "IT101").
//   2. Blank term cells are filled with the semester rule (FIRST -> FIRST_TERM,
//      SECOND -> SECOND_TERM); SUMMER courses keep a null term. CSV terms win.
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

  // GE
  { code: "GESTECH", title: "Science, Technology and Society", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "GEETHICS", title: "Ethics", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "GEMATH", title: "Mathematics in the Modern World", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "GEUS", title: "Understanding the Self", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "NSTP1", title: "Civic Welfare Training Service 1", scope: CourseScope.GENERAL_EDUCATION, yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  // BSIT
  { code: "IT101", title: "Introduction to Computing", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT201", title: "Data Structures", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT206", title: "Applications Development and Emerging Technology", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SUMMER },
  { code: "IT306", title: "System Administration and Maintenance", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "ITRES1", title: "Capstone Project 1", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "IT-PRAC", title: "Practicum (486 hrs)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  // BSSW
  { code: "SW101", title: "Knowledge and Philosophical Foundations of Social Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "SW205", title: "Social Work Communication and Documentation", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW312", title: "Social Work Research 1 (Development of a Research Design)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW317B", title: "Social Work Practice with Communities (Community Organizing and Community-Based Social Work Practice) (Laboratory/Application)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "SW423", title: "Field Instruction 1: Agency-Based Placement (500 hours) Social Work Practice with Individuals, Families and Small Groups (semestral)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  // BSHM
  { code: "HTC101", title: "Risk Management as Applied to Safety, Security and Sanitation", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM201", title: "Fundamentals in Food Service Operations", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM302", title: "Applied Business Tools and Technologies in Hospitality", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM-E4", title: "Catering Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HM-PRAC2", title: "Practicum in Hospitality Mgt. (500 Hours)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  // BEED
  { code: "ENG201", title: "Teaching English in the Elementary Grades (Language Arts)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI201", title: "Teaching Science in the Elementary Grades (Bio and Chem)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "MATH202", title: "Teaching Math in the Intermediate Grades", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "EDUCRES1", title: "Research in Education 1 (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "EDUC11E", title: "Teaching Internship (Elementary)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BSED
  { code: "ENG14", title: "Research in Language 1 (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI15", title: "Thermodynamics", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH13", title: "Calculus 2", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "VALED12", title: "Teaching Approaches and Strategies in Values Education", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Values Education", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "EDUC11S", title: "Teaching Internship (Secondary)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BSBA
  { code: "FM201", title: "Financial Analysis and Reporting", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM301", title: "Training and Development", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "MM302", title: "Advertising", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "BUSCOM", title: "Business Communication", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "FS", title: "Feasibility Study", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "PRAC-BA", title: "Practicum", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BSIT
  { code: "IT102", title: "Computer Programming 1", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "IT104", title: "Object Oriented Programming", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "IT106", title: "Human Computer Interaction 1", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "IT203", title: "Fundamentals of Database", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "IT204", title: "Information Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "IT301", title: "Computer Networking 1", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "IT305", title: "Integrative Programming and Technology", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "ITRES2", title: "Capstone Project 2", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSIT", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  // BSSW
  { code: "SW102", title: "Fields of Social Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SW103", title: "The Philippine Social Realities and Social Welfare", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "SW204", title: "Filipino Personality and Social Work", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW208", title: "Social Work Counseling", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SW210A", title: "Social Work Practice with Individuals and Families (Lecture)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SW311", title: "Social Work Statistics", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SW316", title: "Social Work Research 2 (Implementation of a Research Design)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SW425", title: "Field Instruction 2: Community-Based Placement (500 hours) Social Work Practice with Communities in an Urban or Rural Setting (semestral)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSSW", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BSHM
  { code: "HTC102", title: "Macro Perspective of Tourism and Hospitality", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "HTC103", title: "Micro Perspective of Tourism and Hospitality", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HM101", title: "Kitchen Essentials and Basic Food Preparation", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "HTC201", title: "Legal Aspects in Tourism and Hospitality", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "HM202", title: "Fundamentals in Lodging Operations", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "HM301", title: "Research in Hospitality with Thesis (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HTC401", title: "Entrepreneurship in Tourism and Hospitality", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HM-PRAC1", title: "Practicum in Hospitality Mgt. (100 Hours)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSHM", yl: YearLevel.FOURTH_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BEED
  { code: "FIL1", title: "Pagtuturo ng Filipino sa Elementarya 1 (Estruktura at Gamit ng Wikang Filipino)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MUSIC", title: "Teaching Music in the Elementary Grades", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "FIL2", title: "Pagtuturo ng Filipino sa Elementarya 2 (Panitikan ng Pilipinas)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH201", title: "Teaching Math in the Primary Grades", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SOCSTUD1", title: "Teaching Social Studies in the Primary Grades (Philippine History and Government)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MTB-MLE", title: "Content and Pedagogy for the Mother-Tongue", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "ENG301", title: "Teaching English in the Elementary Grades through Literature", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI301", title: "Teaching Science in the Elementary Grades (Physics, Earth & Space Science)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BEED", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  // BSED
  { code: "ENG1", title: "Introduction to Linguistics", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.FIRST_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "ENG2", title: "Principles and Theories of Language Acquisition and Learning", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "ENG7", title: "Structure of English", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "ENG20", title: "Research in Language 2 (Final)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:English", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI1", title: "Cell and Molecular Biology", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI3", title: "The Teaching of Science/Teaching the Specialized Field", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "SCI11", title: "Research in Science 1 (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "SCI17", title: "Research in Science 2 (Final)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Science", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH1", title: "College and Advanced Algebra", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH8", title: "Calculus 1 with Analytic Geometry", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.SECOND_TERM },
  { code: "MATH11", title: "Research in Mathematics 1 (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MATH16", title: "Research in Mathematics 2 (Final)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Mathematics", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "VALED1", title: "Foundation of Values Education", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Values Education", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "VALED6", title: "Filipino Values System", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Values Education", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "VALED13", title: "Research in Values Education 1 (Proposal)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Values Education", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "VALED18", title: "Research in Values Education 2 (Final)", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSED", mk: "BSED:Values Education", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  // BSBA
  { code: "FM200", title: "Financial Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "FM202", title: "Banking and Financial Institutions", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "FM300", title: "Monetary Policy & Central Banking", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "FM302", title: "Investment & Portfolio Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Financial Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDME1", title: "Human Behavior Organization", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM201", title: "Labor Law and Legislation", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM300", title: "Organizational Development", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM303", title: "Compensation Administration", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Human Resource Development Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MM200", title: "Marketing Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MM201", title: "Marketing Research", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "MM300", title: "Pricing Strategy", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "MM303", title: "Distribution Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", mk: "BSBA:Marketing Management", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.SECOND, trm: AcademicTerm.FIRST_TERM },
  { code: "HRDM200", title: "Human Resource Management", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "ACCTG200", title: "Advanced Accounting", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "ECON", title: "Basic Microeconomics", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.SECOND_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.SECOND_TERM },
  { code: "BASOC", title: "Good Governance and Social Responsibility", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
  { code: "BUSRES1", title: "Business Research", scope: CourseScope.PROGRAM_SPECIFIC, pc: "BSBA", yl: YearLevel.THIRD_YEAR, sem: AcademicSemester.FIRST, trm: AcademicTerm.FIRST_TERM },
];

