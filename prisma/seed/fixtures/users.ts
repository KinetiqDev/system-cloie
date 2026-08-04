import { SystemRole, VerificationStatus, YearLevel } from "@prisma/client";
import { U } from "../constants/ids";

export const allUsers = [
  { id: U.ADMIN, email: "demo-secretary@cloie.test", fn: "Demo", ln: "Admin", role: SystemRole.SECRETARY },
  { id: U.DEAN, email: "demo-dean@cloie.test", fn: "Demo", ln: "Dean", role: SystemRole.DEAN },
  { id: U.PH_BSIT, email: "demo-ph@cloie.test", fn: "Demo", ln: "Program Head", role: SystemRole.PROGRAM_HEAD },
  { id: U.FAC_BSIT, email: "demo-faculty@cloie.test", fn: "Demo", ln: "Faculty", role: SystemRole.FACULTY },
  { id: U.STU_BSIT, email: "demo-student@cloie.test", fn: "Demo", ln: "Student", role: SystemRole.STUDENT },
  { id: U.GRAD_BSIT, email: "demo-grad@cloie.test", fn: "Demo", ln: "Graduate", role: SystemRole.STUDENT },
  { id: U.ALU_BSIT, email: "demo-alumni@cloie.test", fn: "Demo", ln: "Alumni", role: SystemRole.ALUMNI },
  { id: U.IND_BSIT, email: "demo-industry@cloie.test", fn: "Demo", ln: "Industry", role: SystemRole.INDUSTRY_PARTNER },
  { id: U.PH_BEED, email: "ph-beed@cloie.test", fn: "Maria", ln: "Santos", role: SystemRole.PROGRAM_HEAD },
  { id: U.PH_BSED, email: "ph-bsed@cloie.test", fn: "Jose", ln: "Reyes", role: SystemRole.PROGRAM_HEAD },
  { id: U.PH_BSSW, email: "ph-bssw@cloie.test", fn: "Ana", ln: "Cruz", role: SystemRole.PROGRAM_HEAD },
  { id: U.PH_BSBA, email: "ph-bsba@cloie.test", fn: "Roberto", ln: "Lim", role: SystemRole.PROGRAM_HEAD },
  { id: U.PH_BSHM, email: "ph-bshm@cloie.test", fn: "Carmen", ln: "Flores", role: SystemRole.PROGRAM_HEAD },
  { id: U.PH_MULTI, email: "ph-multi@cloie.test", fn: "Daniel", ln: "Garcia", role: SystemRole.PROGRAM_HEAD },
  { id: U.FAC_BSED, email: "faculty-bsed@cloie.test", fn: "Elena", ln: "Torres", role: SystemRole.FACULTY },
  { id: U.FAC_BSBA, email: "faculty-bsba@cloie.test", fn: "Marco", ln: "Villanueva", role: SystemRole.FACULTY },
  { id: U.FAC_BSHM, email: "faculty-bshm@cloie.test", fn: "Lisa", ln: "Mendoza", role: SystemRole.FACULTY },
  { id: U.STU_BSED, email: "student-bsed@cloie.test", fn: "Juan", ln: "Dela Cruz", role: SystemRole.STUDENT },
  { id: U.STU_BSBA, email: "student-bsba@cloie.test", fn: "Angela", ln: "Reyes", role: SystemRole.STUDENT },
  { id: U.STU_BSBA_G, email: "student-bsba-grad@cloie.test", fn: "Carlos", ln: "Santos", role: SystemRole.STUDENT },
  { id: U.STU_BEED, email: "student-beed@cloie.test", fn: "Patricia", ln: "Luna", role: SystemRole.STUDENT },
  { id: U.STU_BSHM, email: "student-bshm@cloie.test", fn: "Daniel", ln: "Tan", role: SystemRole.STUDENT },
  { id: U.STU_BSHM_G, email: "student-bshm-grad@cloie.test", fn: "Grace", ln: "Aquino", role: SystemRole.STUDENT },
  { id: U.ALU_BSBA, email: "alumni-bsba@cloie.test", fn: "Miguel", ln: "Ong", role: SystemRole.ALUMNI },
  { id: U.IND_BSHM, email: "industry-bshm@cloie.test", fn: "Karen", ln: "Sy", role: SystemRole.INDUSTRY_PARTNER },
] as const;

export const studentDefinitions = [
  { uid: U.STU_BSIT, program: "BSIT", major: null, yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0001", section: "MORNING" as const },
  { uid: U.GRAD_BSIT, program: "BSIT", major: null, yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0002", section: "AFTERNOON" as const },
  { uid: U.STU_BSED, program: "BSED", major: "BSED:English", yearLevel: YearLevel.THIRD_YEAR, studentNumber: "2026-0003", section: "MORNING" as const },
  { uid: U.STU_BSBA, program: "BSBA", major: "BSBA:Marketing Management", yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0004", section: "MORNING" as const },
  { uid: U.STU_BSBA_G, program: "BSBA", major: "BSBA:Financial Management", yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0005", section: "AFTERNOON" as const },
  { uid: U.STU_BEED, program: "BEED", major: null, yearLevel: YearLevel.SECOND_YEAR, studentNumber: "2026-0006", section: "MORNING" as const },
  { uid: U.STU_BSHM, program: "BSHM", major: null, yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0007", section: "EVENING" as const },
  { uid: U.STU_BSHM_G, program: "BSHM", major: null, yearLevel: YearLevel.FOURTH_YEAR, studentNumber: "2026-0008", section: "AFTERNOON" as const },
] as const;

export const facultyAffiliations = [
  { facultyId: U.FAC_BSIT, program: "BSIT" },
  { facultyId: U.FAC_BSED, program: "BSED" },
  { facultyId: U.FAC_BSBA, program: "BSBA" },
  { facultyId: U.FAC_BSHM, program: "BSHM" },
] as const;

export const programHeadAssignments = [
  { programHeadId: U.PH_BSIT, program: "BSIT" },
  { programHeadId: U.PH_BEED, program: "BEED" },
  { programHeadId: U.PH_BSED, program: "BSED" },
  { programHeadId: U.PH_BSSW, program: "BSSW" },
  { programHeadId: U.PH_BSBA, program: "BSBA" },
  { programHeadId: U.PH_BSHM, program: "BSHM" },
  { programHeadId: U.PH_MULTI, program: "BEED" },
  { programHeadId: U.PH_MULTI, program: "BSED" },
] as const;

export const externalProfiles = [
  { userId: U.ALU_BSIT, graduationYear: 2023, program: "BSIT", status: VerificationStatus.PENDING },
  { userId: U.ALU_BSBA, graduationYear: 2021, program: "BSBA", status: VerificationStatus.APPROVED },
] as const;

export const industryProfiles = [
  { userId: U.IND_BSIT, company: "Demo Industry Partner", position: "HR and Training Lead", program: "BSIT", status: VerificationStatus.PENDING },
  { userId: U.IND_BSHM, company: "Grand Hotel Corp", position: "Operations Manager", program: "BSHM", status: VerificationStatus.APPROVED },
] as const;

export const inviteDefinitions = [
  { email: "demo-alumni@cloie.test", role: SystemRole.ALUMNI, program: "BSIT", name: "Demo Alumni", company: null },
  { email: "demo-industry@cloie.test", role: SystemRole.INDUSTRY_PARTNER, program: "BSIT", name: "Demo Industry Reviewer", company: "Demo Industry Partner" },
  { email: "alumni-bsba@cloie.test", role: SystemRole.ALUMNI, program: "BSBA", name: "Miguel Ong", company: null },
  { email: "industry-bshm@cloie.test", role: SystemRole.INDUSTRY_PARTNER, program: "BSHM", name: "Karen Sy", company: "Grand Hotel Corp" },
] as const;
