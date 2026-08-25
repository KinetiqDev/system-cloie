import { SystemRole, VerificationStatus, YearLevel } from "@prisma/client";
import { RLS_AUTH_UUIDS } from "../../../src/lib/db/rls-test-identities";
import { U } from "../constants/ids";

export const allUsers = [
  {
    id: U.ADMIN,
    email: "demo-secretary@cloie.test",
    name: "Demo Admin",
    role: SystemRole.SECRETARY,
    authUserId: RLS_AUTH_UUIDS.SECRETARY,
  },
  { id: U.DEAN, email: "demo-dean@cloie.test", name: "Demo Dean", role: SystemRole.DEAN },
  {
    id: U.PH_BSIT,
    email: "demo-ph@cloie.test",
    name: "Demo Program Head",
    role: SystemRole.PROGRAM_HEAD,
    authUserId: RLS_AUTH_UUIDS.PROGRAM_HEAD_BSIT,
  },
  {
    id: U.FAC_BSIT,
    email: "demo-faculty@cloie.test",
    name: "Demo Faculty",
    role: SystemRole.FACULTY,
    authUserId: RLS_AUTH_UUIDS.FACULTY,
  },
  {
    id: U.STU_BSIT,
    email: "demo-student@cloie.test",
    name: "Demo Student",
    role: SystemRole.STUDENT,
  },
  {
    id: U.GRAD_BSIT,
    email: "demo-grad@cloie.test",
    name: "Demo Graduate",
    role: SystemRole.STUDENT,
  },
  { id: U.ALU_BSIT, email: "demo-alumni@cloie.test", name: "Demo Alumni", role: SystemRole.ALUMNI },
  {
    id: U.IND_BSIT,
    email: "demo-industry@cloie.test",
    name: "Demo Industry",
    role: SystemRole.INDUSTRY_PARTNER,
  },
  {
    id: U.PH_BEED,
    email: "ph-beed@cloie.test",
    name: "Maria Santos",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSED,
    email: "ph-bsed@cloie.test",
    name: "Jose Reyes",
    role: SystemRole.PROGRAM_HEAD,
  },
  { id: U.PH_BSSW, email: "ph-bssw@cloie.test", name: "Ana Cruz", role: SystemRole.PROGRAM_HEAD },
  {
    id: U.PH_BSBA,
    email: "ph-bsba@cloie.test",
    name: "Roberto Lim",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSHM,
    email: "ph-bshm@cloie.test",
    name: "Carmen Flores",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_MULTI,
    email: "ph-multi@cloie.test",
    name: "Daniel Garcia",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.FAC_BSED,
    email: "faculty-bsed@cloie.test",
    name: "Elena Torres",
    role: SystemRole.FACULTY,
  },
  {
    id: U.FAC_BSBA,
    email: "faculty-bsba@cloie.test",
    name: "Marco Villanueva",
    role: SystemRole.FACULTY,
  },
  {
    id: U.FAC_BSHM,
    email: "faculty-bshm@cloie.test",
    name: "Lisa Mendoza",
    role: SystemRole.FACULTY,
  },
  {
    id: U.STU_BSED,
    email: "student-bsed@cloie.test",
    name: "Juan Dela Cruz",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSBA,
    email: "student-bsba@cloie.test",
    name: "Angela Reyes",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSBA_G,
    email: "student-bsba-grad@cloie.test",
    name: "Carlos Santos",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BEED,
    email: "student-beed@cloie.test",
    name: "Patricia Luna",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSHM,
    email: "student-bshm@cloie.test",
    name: "Daniel Tan",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSHM_G,
    email: "student-bshm-grad@cloie.test",
    name: "Grace Aquino",
    role: SystemRole.STUDENT,
  },
  { id: U.ALU_BSBA, email: "alumni-bsba@cloie.test", name: "Miguel Ong", role: SystemRole.ALUMNI },
  {
    id: U.IND_BSHM,
    email: "industry-bshm@cloie.test",
    name: "Karen Sy",
    role: SystemRole.INDUSTRY_PARTNER,
  },
  {
    id: U.GENED,
    email: "demo-gened@cloie.test",
    name: "Gen Ed Coordinator",
    role: SystemRole.GEN_ED_COORDINATOR,
  },
] as const;

export const studentDefinitions = [
  {
    uid: U.STU_BSIT,
    program: "BSIT",
    major: null,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "MORNING" as const,
  },
  {
    uid: U.GRAD_BSIT,
    program: "BSIT",
    major: null,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON" as const,
  },
  {
    uid: U.STU_BSED,
    program: "BSED",
    major: "BSED:English",
    yearLevel: YearLevel.THIRD_YEAR,
    section: "MORNING" as const,
  },
  {
    uid: U.STU_BSBA,
    program: "BSBA",
    major: "BSBA:Marketing Management",
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "MORNING" as const,
  },
  {
    uid: U.STU_BSBA_G,
    program: "BSBA",
    major: "BSBA:Financial Management",
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON" as const,
  },
  {
    uid: U.STU_BEED,
    program: "BEED",
    major: null,
    yearLevel: YearLevel.SECOND_YEAR,
    section: "MORNING" as const,
  },
  {
    uid: U.STU_BSHM,
    program: "BSHM",
    major: null,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "EVENING" as const,
  },
  {
    uid: U.STU_BSHM_G,
    program: "BSHM",
    major: null,
    yearLevel: YearLevel.FOURTH_YEAR,
    section: "AFTERNOON" as const,
  },
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
  {
    userId: U.ALU_BSBA,
    graduationYear: 2021,
    program: "BSBA",
    status: VerificationStatus.APPROVED,
  },
] as const;

export const industryProfiles = [
  {
    userId: U.IND_BSIT,
    company: "Demo Industry Partner",
    position: "HR and Training Lead",
    program: "BSIT",
    status: VerificationStatus.PENDING,
  },
  {
    userId: U.IND_BSHM,
    company: "Grand Hotel Corp",
    position: "Operations Manager",
    program: "BSHM",
    status: VerificationStatus.APPROVED,
  },
] as const;

export const inviteDefinitions = [
  {
    email: "demo-alumni@cloie.test",
    role: SystemRole.ALUMNI,
    program: "BSIT",
    name: "Demo Alumni",
    company: null,
  },
  {
    email: "demo-industry@cloie.test",
    role: SystemRole.INDUSTRY_PARTNER,
    program: "BSIT",
    name: "Demo Industry Reviewer",
    company: "Demo Industry Partner",
  },
  {
    email: "alumni-bsba@cloie.test",
    role: SystemRole.ALUMNI,
    program: "BSBA",
    name: "Miguel Ong",
    company: null,
  },
  {
    email: "industry-bshm@cloie.test",
    role: SystemRole.INDUSTRY_PARTNER,
    program: "BSHM",
    name: "Karen Sy",
    company: "Grand Hotel Corp",
  },
] as const;
