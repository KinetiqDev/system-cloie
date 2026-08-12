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

export async function seedUsers({ pMap, mMap }: Pick<FoundationContext, "pMap" | "mMap">, termInstanceId: string) {
  console.log("  → Users & roles...");
  for (const u of allUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, is_active: true },
      create: { id: u.id, email: u.email, name: u.name, is_active: true },
    });
    await prisma.userRole.upsert({
      where: { user_id: u.id },
      update: { role: u.role },
      create: { user_id: u.id, role: u.role },
    });
  }

  const students = studentDefinitions.map((student) => ({
    uid: student.uid,
    pid: pMap.get(student.program)!.id,
    mid: student.major ? (mMap.get(student.major)?.id ?? null) : null,
    ylid: student.yearLevel,
    sn: student.studentNumber,
    sec: student.section,
  }));
  console.log("  → Student profiles...");
  for (const s of students) {
    await prisma.studentAcademicProfile.upsert({
      where: { user_id: s.uid },
      update: { program_id: s.pid, major_id: s.mid, student_id_number: s.sn },
      create: { user_id: s.uid, program_id: s.pid, major_id: s.mid, student_id_number: s.sn },
    });
    await prisma.studentEnrollment.upsert({
      where: { student_user_id_term_instance_id: { student_user_id: s.uid, term_instance_id: termInstanceId } },
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

  console.log("  → Faculty affiliations...");
  for (const affiliation of facultyAffiliations) {
    const programId = pMap.get(affiliation.program)!.id;
    await prisma.facultyProgramAffiliation.upsert({
      where: { faculty_id_program_id: { faculty_id: affiliation.facultyId, program_id: programId } },
      update: { is_active: true },
      create: { faculty_id: affiliation.facultyId, program_id: programId, is_active: true },
    });
  }

  console.log("  → Program head assignments...");
  for (const assignment of programHeadAssignments) {
    const programId = pMap.get(assignment.program)!.id;
    await prisma.programHeadAssignment.upsert({
      where: { program_head_id_program_id: { program_head_id: assignment.programHeadId, program_id: programId } },
      update: { is_active: true },
      create: { program_head_id: assignment.programHeadId, program_id: programId, is_active: true },
    });
  }

  console.log("  → Alumni profiles...");
  for (const profile of externalProfiles) {
    await prisma.alumniProfile.upsert({
      where: { user_id: profile.userId },
      update: { graduation_year: profile.graduationYear, program_id: pMap.get(profile.program)!.id, verification_status: profile.status },
      create: { user_id: profile.userId, graduation_year: profile.graduationYear, program_id: pMap.get(profile.program)!.id, verification_status: profile.status },
    });
  }

  console.log("  → Industry partner profiles...");
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

  console.log("  → External stakeholder invites...");
  for (const invite of inviteDefinitions) {
    const programId = pMap.get(invite.program)!.id;
    await prisma.externalStakeholderInvite.upsert({
      where: { email_role_program_id: { email: invite.email, role: invite.role, program_id: programId } },
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
