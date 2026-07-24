import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const prismaDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "prisma"
);
const prismaModelsDir = join(prismaDir, "models");
const prismaEntrypoint = join(prismaDir, "schema.prisma");

const expectedFiles = [
  "academic-calendar.prisma",
  "academic-structure.prisma",
  "course-assignments.prisma",
  "evaluations-deployments.prisma",
  "identity-access.prisma",
  "instruments.prisma",
  "outcomes.prisma",
  "responses.prisma",
];

const expectedEnums = [
  "AcademicPeriodStatus",
  "AcademicSemester",
  "AcademicTerm",
  "CourseBoundEvaluationExclusionCategory",
  "CourseBoundEvaluationExclusionReversalCategory",
  "CourseScope",
  "DeploymentStatus",
  "DeploymentType",
  "EnrollmentSource",
  "EvaluationTemplateType",
  "InviteStatus",
  "ResponseStatus",
  "StudentSection",
  "SystemRole",
  "TargetStakeholder",
  "VerificationStatus",
  "YearLevel",
];

const expectedModels = [
  "AcademicPeriodReadinessSnapshot",
  "AcademicTermInstance",
  "AlumniProfile",
  "CILO",
  "CILOMapping",
  "CentralDeployment",
  "Course",
  "CourseAssignment",
  "CourseAssignmentMembership",
  "CourseBoundCiloQuestionBinding",
  "CourseBoundEvaluation",
  "CourseBoundEvaluationExclusion",
  "CourseBoundEvaluationTarget",
  "EvaluationAssignment",
  "ExternalStakeholderInvite",
  "FacultyProgramAffiliation",
  "GO",
  "IndustryPartnerProfile",
  "InstrumentTemplate",
  "InstrumentTemplateCiloQuestionBinding",
  "InstrumentVersion",
  "Major",
  "Program",
  "ProgramHeadAssignment",
  "QualitativeResponseItem",
  "QuantitativeResponseItem",
  "Response",
  "SchoolYear",
  "StudentAcademicProfile",
  "StudentEnrollment",
  "User",
  "UserRole",
];

describe("Prisma schema structure", () => {
  it("keeps model and enum definitions out of the schema entrypoint", () => {
    const source = readFileSync(prismaEntrypoint, "utf8");

    expect([...source.matchAll(/^\s*(model|enum)\s+(\w+)/gm)]).toHaveLength(0);
  });

  it("keeps every domain fragment and definition uniquely represented", () => {
    const files = readdirSync(prismaModelsDir)
      .filter((file) => file.endsWith(".prisma"))
      .sort();
    const definitions = files.flatMap((file) => {
      const source = readFileSync(join(prismaModelsDir, file), "utf8");
      return [...source.matchAll(/^\s*(model|enum)\s+(\w+)/gm)].map(
        ([, kind, name]) => `${kind}:${name}`
      );
    });

    expect(files).toEqual(expectedFiles);
    expect(
      definitions
        .filter((definition) => definition.startsWith("enum:"))
        .sort()
    ).toEqual(expectedEnums.map((name) => `enum:${name}`).sort());
    expect(
      definitions
        .filter((definition) => definition.startsWith("model:"))
        .sort()
    ).toEqual(expectedModels.map((name) => `model:${name}`).sort());
  });
});
