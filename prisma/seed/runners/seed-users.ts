import { InviteStatus } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import { U } from "../constants/ids";
import {
  allUsers,
  externalProfiles,
  facultyAffiliations,
  industryProfiles,
  inviteDefinitions,
  programHeadAssignments,
  studentDefinitions,
} from "../fixtures/users";
import type { FoundationContext } from "../types";

type ProgramMap = FoundationContext["pMap"];
type MajorMap = FoundationContext["mMap"];

async function seedUserAccounts(): Promise<void> {
  for (const u of allUsers) {
    const authUserId = "authUserId" in u ? u.authUserId : undefined;
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, is_active: true, auth_user_id: authUserId },
      create: { id: u.id, email: u.email, name: u.name, is_active: true, auth_user_id: authUserId },
    });
    await prisma.userRole.upsert({
      where: { user_id_role: { user_id: u.id, role: u.role } },
      update: { role: u.role },
      create: { user_id: u.id, role: u.role },
    });
  }
  // Deactivate the intentionally inactive fixture (alumni-inactive)
  await prisma.user.updateMany({
    where: { id: U.ALU_INACTIVE },
    data: { is_active: false },
  });
}

async function seedStudentProfiles(
  pMap: ProgramMap,
  mMap: MajorMap,
  termInstanceId: string
): Promise<void> {
  const students = studentDefinitions.map((student) => ({
    uid: student.uid,
    pid: pMap.get(student.program)!.id,
    mid: student.major ? (mMap.get(student.major)?.id ?? null) : null,
    ylid: student.yearLevel,
    sec: student.section,
  }));
  for (const s of students) {
    await prisma.studentAcademicProfile.upsert({
      where: { user_id: s.uid },
      update: { program_id: s.pid, major_id: s.mid },
      create: { user_id: s.uid, program_id: s.pid, major_id: s.mid },
    });
    await prisma.studentEnrollment.upsert({
      where: {
        student_user_id_term_instance_id: {
          student_user_id: s.uid,
          term_instance_id: termInstanceId,
        },
      },
      update: {
        program_id: s.pid,
        major_id: s.mid,
        year_level: s.ylid,
        section: s.sec,
        is_active: true,
        source: "SECRETARY",
      },
      create: {
        student_user_id: s.uid,
        term_instance_id: termInstanceId,
        program_id: s.pid,
        major_id: s.mid,
        year_level: s.ylid,
        section: s.sec,
        is_active: true,
        source: "SECRETARY",
      },
    });
  }
}

async function seedFacultyAffiliations(pMap: ProgramMap): Promise<void> {
  for (const affiliation of facultyAffiliations) {
    const programId = pMap.get(affiliation.program)!.id;
    await prisma.facultyProgramAffiliation.upsert({
      where: {
        faculty_id_program_id: { faculty_id: affiliation.facultyId, program_id: programId },
      },
      update: { is_active: true, is_primary: true },
      create: {
        faculty_id: affiliation.facultyId,
        program_id: programId,
        is_active: true,
        is_primary: true,
      },
    });
  }
}

async function seedProgramHeadAssignments(pMap: ProgramMap): Promise<void> {
  for (const assignment of programHeadAssignments) {
    const programId = pMap.get(assignment.program)!.id;
    await prisma.programHeadAssignment.upsert({
      where: {
        program_head_id_program_id: {
          program_head_id: assignment.programHeadId,
          program_id: programId,
        },
      },
      update: { is_active: true },
      create: { program_head_id: assignment.programHeadId, program_id: programId, is_active: true },
    });
  }
}

async function seedAlumniProfiles(pMap: ProgramMap): Promise<void> {
  for (const profile of externalProfiles) {
    await prisma.alumniProfile.upsert({
      where: { user_id: profile.userId },
      update: {
        graduation_year: profile.graduationYear,
        program_id: pMap.get(profile.program)!.id,
        verification_status: profile.status,
      },
      create: {
        user_id: profile.userId,
        graduation_year: profile.graduationYear,
        program_id: pMap.get(profile.program)!.id,
        verification_status: profile.status,
      },
    });
  }
}

async function seedIndustryPartnerProfiles(pMap: ProgramMap): Promise<void> {
  for (const profile of industryProfiles) {
    await prisma.industryPartnerProfile.upsert({
      where: { user_id: profile.userId },
      update: {
        company_name: profile.company,
        position: profile.position,
        program_id: pMap.get(profile.program)!.id,
        verification_status: profile.status,
      },
      create: {
        user_id: profile.userId,
        company_name: profile.company,
        position: profile.position,
        program_id: pMap.get(profile.program)!.id,
        verification_status: profile.status,
      },
    });
  }
}

async function seedIndustryPartnerAffiliations(pMap: ProgramMap): Promise<void> {
  for (const profile of industryProfiles) {
    const programId = pMap.get(profile.program)!.id;
    await prisma.industryPartnerProgramAffiliation.upsert({
      where: {
        industry_partner_id_program_id: {
          industry_partner_id: profile.userId,
          program_id: programId,
        },
      },
      update: {},
      create: {
        industry_partner_id: profile.userId,
        program_id: programId,
      },
    });
  }
}

async function seedExternalInvites(pMap: ProgramMap): Promise<void> {
  for (const invite of inviteDefinitions) {
    const programId = pMap.get(invite.program)!.id;
    await prisma.externalStakeholderInvite.upsert({
      where: {
        email_role_program_id: { email: invite.email, role: invite.role, program_id: programId },
      },
      update: {
        invitee_name: invite.name,
        company_name: invite.company,
        invited_by: U.ADMIN,
        note: "Seeded invite for MVP demo.",
        status: InviteStatus.ACCEPTED,
        sent_at: new Date("2026-04-05T09:00:00Z"),
        accepted_at: new Date("2026-04-10T09:00:00Z"),
      },
      create: {
        email: invite.email,
        role: invite.role,
        program_id: programId,
        invitee_name: invite.name,
        company_name: invite.company,
        invited_by: U.ADMIN,
        note: "Seeded invite for MVP demo.",
        status: InviteStatus.ACCEPTED,
        sent_at: new Date("2026-04-05T09:00:00Z"),
        accepted_at: new Date("2026-04-10T09:00:00Z"),
      },
    });
  }
}

export async function seedUsers(
  { pMap, mMap }: Pick<FoundationContext, "pMap" | "mMap">,
  termInstanceId: string
) {
  console.log("  → Users & roles...");
  await seedUserAccounts();
  console.log("  → Student profiles...");
  await seedStudentProfiles(pMap, mMap, termInstanceId);
  console.log("  → Faculty affiliations...");
  await seedFacultyAffiliations(pMap);
  console.log("  → Program head assignments...");
  await seedProgramHeadAssignments(pMap);
  console.log("  → Alumni profiles...");
  await seedAlumniProfiles(pMap);
  console.log("  → Industry partner profiles...");
  await seedIndustryPartnerProfiles(pMap);
  console.log("  → Industry partner program affiliations...");
  await seedIndustryPartnerAffiliations(pMap);
  console.log("  → External stakeholder invites...");
  await seedExternalInvites(pMap);
}
