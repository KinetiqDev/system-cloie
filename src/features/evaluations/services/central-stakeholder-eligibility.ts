import { TargetStakeholder, type Prisma } from "@prisma/client";

export type CentralStakeholderStore = {
  alumniProfile: Pick<Prisma.TransactionClient["alumniProfile"], "findMany">;
  centralDeployment: Pick<Prisma.TransactionClient["centralDeployment"], "findMany">;
  evaluationAssignment: Pick<
    Prisma.TransactionClient["evaluationAssignment"],
    "findMany" | "createMany"
  >;
  industryPartnerProfile: Pick<Prisma.TransactionClient["industryPartnerProfile"], "findMany">;
  industryPartnerProgramAffiliation: Pick<
    Prisma.TransactionClient["industryPartnerProgramAffiliation"],
    "findMany"
  >;
};

export type EligibleStakeholder = {
  email: string;
  majorName: string | null;
  name: string;
  programCode: string | null;
  userId: string;
};

type ProgramScope = {
  majorId?: string | null;
  programId: string;
};

/**
 * Alumni eligible for a program-wide deployment: a live alumni profile scoped
 * to the program on an active account. Rejected verifications are excluded;
 * pending and approved profiles both count so newly registered alumni are
 * visible before and after secretary confirmation. Self-registered and
 * secretary-created alumni live only in alumni_profile — external stakeholder
 * invites are not consulted.
 */
export async function listEligibleAlumni(
  client: CentralStakeholderStore,
  scope: ProgramScope
): Promise<EligibleStakeholder[]> {
  const profiles = await client.alumniProfile.findMany({
    where: {
      program_id: scope.programId,
      verification_status: { not: "REJECTED" },
      ...(scope.majorId ? { major_id: scope.majorId } : {}),
      user: { is_active: true },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      program: { select: { code: true } },
      major: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return profiles.map((profile) => ({
    email: profile.user.email,
    majorName: profile.major?.name ?? null,
    name: profile.user.name,
    programCode: profile.program.code,
    userId: profile.user.id,
  }));
}

/**
 * Industry partners eligible for a program-wide deployment: live profiles
 * scoped to the program via the legacy program link or a program affiliation,
 * on active accounts. Rejected verifications are excluded.
 */
export async function listEligibleIndustryPartners(
  client: CentralStakeholderStore,
  scope: ProgramScope
): Promise<EligibleStakeholder[]> {
  const [legacyProfiles, affiliations] = await Promise.all([
    client.industryPartnerProfile.findMany({
      where: {
        program_id: scope.programId,
        verification_status: { not: "REJECTED" },
        user: { is_active: true },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        program: { select: { code: true } },
      },
    }),
    client.industryPartnerProgramAffiliation.findMany({
      where: {
        program_id: scope.programId,
        industryPartner: {
          is_active: true,
          industry_partner_profile: { verification_status: { not: "REJECTED" } },
        },
      },
      include: {
        industryPartner: { select: { id: true, email: true, name: true } },
        program: { select: { code: true } },
      },
    }),
  ]);

  const seen = new Set<string>();
  const respondents: EligibleStakeholder[] = [];
  for (const profile of legacyProfiles) {
    if (seen.has(profile.user.id)) continue;
    seen.add(profile.user.id);
    respondents.push({
      email: profile.user.email,
      majorName: null,
      name: profile.user.name,
      programCode: profile.program?.code ?? null,
      userId: profile.user.id,
    });
  }
  for (const affiliation of affiliations) {
    if (seen.has(affiliation.industryPartner.id)) continue;
    seen.add(affiliation.industryPartner.id);
    respondents.push({
      email: affiliation.industryPartner.email,
      majorName: null,
      name: affiliation.industryPartner.name,
      programCode: affiliation.program?.code ?? null,
      userId: affiliation.industryPartner.id,
    });
  }
  respondents.sort((a, b) => a.name.localeCompare(b.name));
  return respondents;
}

export async function listEligibleStakeholderIds(
  client: CentralStakeholderStore,
  input: ProgramScope & { targetStakeholder: TargetStakeholder }
): Promise<string[]> {
  const eligible =
    input.targetStakeholder === TargetStakeholder.ALUMNI
      ? await listEligibleAlumni(client, input)
      : await listEligibleIndustryPartners(client, input);
  return [...new Set(eligible.map((respondent) => respondent.userId))];
}

/**
 * Creates missing assignments so stakeholders who become eligible after a
 * program-wide deployment publishes (new approval, new confirmed profile, or a
 * scope move into the program) see it while the deployment window is open.
 * Mirrors the course-bound late-inclusion pattern. Only stakeholders missing
 * an assignment are added, so publish-time respondent selections stay intact.
 */
export async function backfillCentralAssignmentsForUsers(
  client: CentralStakeholderStore,
  input: ProgramScope & {
    majorId?: string | null;
    targetStakeholder: "ALUMNI" | "INDUSTRY_PARTNER";
    userIds: string[];
    now?: Date;
  }
): Promise<{ assignmentCount: number }> {
  if (input.userIds.length === 0) return { assignmentCount: 0 };
  const now = input.now ?? new Date();

  const deployments = await client.centralDeployment.findMany({
    where: {
      program_id: input.programId,
      target_stakeholder: input.targetStakeholder,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      AND: [
        { OR: [{ deadline_at: null }, { deadline_at: { gt: now } }] },
        ...(input.targetStakeholder === TargetStakeholder.ALUMNI
          ? [{ OR: [{ major_id: null }, ...(input.majorId ? [{ major_id: input.majorId }] : [])] }]
          : []),
      ],
    },
    select: { id: true },
  });

  if (deployments.length === 0) return { assignmentCount: 0 };

  const deploymentIds = deployments.map((deployment) => deployment.id);
  const existing = await client.evaluationAssignment.findMany({
    where: {
      central_deployment_id: { in: deploymentIds },
      respondent_id: { in: input.userIds },
    },
    select: { central_deployment_id: true, respondent_id: true },
  });
  const assigned = new Set(
    existing.map((row) => `${row.central_deployment_id}:${row.respondent_id}`)
  );

  const missing = deploymentIds.flatMap((deploymentId) =>
    input.userIds
      .filter((userId) => !assigned.has(`${deploymentId}:${userId}`))
      .map((respondent_id) => ({ central_deployment_id: deploymentId, respondent_id }))
  );

  if (missing.length > 0) {
    await client.evaluationAssignment.createMany({ data: missing });
  }

  return { assignmentCount: missing.length };
}
