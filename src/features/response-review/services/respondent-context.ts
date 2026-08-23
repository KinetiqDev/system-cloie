import { StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Respondent identity contexts (spec §27.1–§27.3)
//
// Student academic context comes from the `StudentEnrollment` row scoped to
// the evaluation's term — never the student's current enrollment (§27.1:
// "Do not use current enrollment for an old response"). Alumni and industry
// context come from the verified profile tables in identity-access.prisma.
// ---------------------------------------------------------------------------

export type RespondentIdentityContext =
  | {
      kind: "STUDENT";
      programId: string;
      programLabel: string;
      majorId: string | null;
      majorLabel: string | null;
      yearLevel: YearLevel;
      section: StudentSection | null;
    }
  | {
      kind: "ALUMNI";
      programLabel: string | null;
      majorLabel: string | null;
      graduationYear: number;
    }
  | {
      kind: "INDUSTRY_PARTNER";
      companyName: string;
      position: string | null;
    };

/**
 * Load identity context for a batch of respondents of one stakeholder kind.
 * Returns a map keyed by respondent user id; absent entries mean no profile
 * or (for STUDENT) no term-scoped enrollment.
 */
export async function loadRespondentIdentityContexts(
  respondentIds: string[],
  stakeholder: TargetStakeholder,
  termInstanceId: string
): Promise<Map<string, RespondentIdentityContext>> {
  const contexts = new Map<string, RespondentIdentityContext>();
  const ids = [...new Set(respondentIds)];

  if (ids.length === 0) {
    return contexts;
  }

  if (stakeholder === TargetStakeholder.STUDENT) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        student_user_id: { in: ids },
        term_instance_id: termInstanceId,
      },
      include: {
        program: { select: { id: true, name: true } },
        major: { select: { id: true, name: true } },
      },
    });

    for (const enrollment of enrollments) {
      contexts.set(enrollment.student_user_id, {
        kind: "STUDENT",
        programId: enrollment.program_id,
        programLabel: enrollment.program.name,
        majorId: enrollment.major_id,
        majorLabel: enrollment.major?.name ?? null,
        yearLevel: enrollment.year_level,
        section: enrollment.section,
      });
    }
    return contexts;
  }

  if (stakeholder === TargetStakeholder.ALUMNI) {
    const profiles = await prisma.alumniProfile.findMany({
      where: { user_id: { in: ids } },
      include: {
        program: { select: { name: true } },
        major: { select: { name: true } },
      },
    });

    for (const profile of profiles) {
      contexts.set(profile.user_id, {
        kind: "ALUMNI",
        programLabel: profile.program?.name ?? null,
        majorLabel: profile.major?.name ?? null,
        graduationYear: profile.graduation_year,
      });
    }
    return contexts;
  }

  const profiles = await prisma.industryPartnerProfile.findMany({
    where: { user_id: { in: ids } },
  });

  for (const profile of profiles) {
    contexts.set(profile.user_id, {
      kind: "INDUSTRY_PARTNER",
      companyName: profile.company_name,
      position: profile.position,
    });
  }
  return contexts;
}
