import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const prismaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prisma");
const prismaModelsDir = join(prismaDir, "models");
const prismaEntrypoint = join(prismaDir, "schema.prisma");

const expectedFiles = [
  "academic-calendar.prisma",
  "academic-structure.prisma",
  "course-assignments.prisma",
  "curriculum.prisma",
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
  "CILOMappingManifestation",
  "CourseBoundEvaluationExclusionCategory",
  "CourseBoundEvaluationExclusionReversalCategory",
  "CourseScope",
  "CurriculumVersionStatus",
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
  "CILOInstitutionalOutcomeMapping",
  "CILOMapping",
  "CentralDeployment",
  "Course",
  "CourseAssignment",
  "CourseAssignmentMembership",
  "CourseBoundCiloQuestionBinding",
  "CourseBoundEvaluation",
  "CourseBoundEvaluationExclusion",
  "CourseBoundEvaluationTarget",
  "CurriculumCourse",
  "CurriculumVersion",
  "EvaluationAssignment",
  "ExternalStakeholderInvite",
  "FacultyProgramAffiliation",
  "GO",
  "IndustryPartnerProfile",
  "InstitutionalOutcome",
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
    expect(definitions.filter((definition) => definition.startsWith("enum:")).sort()).toEqual(
      expectedEnums.map((name) => `enum:${name}`).sort()
    );
    expect(definitions.filter((definition) => definition.startsWith("model:")).sort()).toEqual(
      expectedModels.map((name) => `model:${name}`).sort()
    );
  });

  it("keeps the Institutional Outcome catalog model", () => {
    const source = readFileSync(join(prismaModelsDir, "outcomes.prisma"), "utf8");
    const match = source.match(/model InstitutionalOutcome \{[\s\S]*?\n\}/);

    expect(match).not.toBeNull();
    const model = match![0];

    expect(model).toContain("code");
    expect(model).toContain("@unique");
    expect(model).toContain("description");
    expect(model).toContain("order");
    expect(model).toContain("is_active");
    expect(model).toContain("created_at");
    expect(model).toContain("updated_at");
    expect(model).toContain('@@map("institutional_outcomes")');
  });

  it("keeps the Program-specific mapping relation with actor provenance", () => {
    const source = readFileSync(join(prismaModelsDir, "outcomes.prisma"), "utf8");
    const match = source.match(/model CILOMapping \{[\s\S]*?\n\}/);

    expect(match).not.toBeNull();
    const model = match![0];

    expect(model).toContain("created_by");
    expect(model).toContain("updated_by");
    expect(model).toContain('@relation("CILOMappingCreator", fields: [created_by]');
    expect(model).toContain('@relation("CILOMappingUpdater", fields: [updated_by]');
    expect(model).toContain("@@unique([cilo_id, go_id])");
    expect(model).toContain('@@map("cilo_mappings")');
  });

  it("keeps the typed General Education mapping relation with provenance", () => {
    const source = readFileSync(join(prismaModelsDir, "outcomes.prisma"), "utf8");
    const match = source.match(/model CILOInstitutionalOutcomeMapping \{[\s\S]*?\n\}/);

    expect(match).not.toBeNull();
    const model = match![0];

    expect(model).toContain("cilo_id");
    expect(model).toContain("institutional_outcome_id");
    expect(model).toContain("created_by");
    expect(model).toContain("updated_by");
    expect(model).toContain("created_at");
    expect(model).toContain("updated_at");
    expect(model).toContain("@relation(fields: [cilo_id], references: [id], onDelete: Cascade)");
    expect(model).toContain(
      "@relation(fields: [institutional_outcome_id], references: [id], onDelete: Restrict)"
    );
    expect(model).toContain("@@unique([cilo_id, institutional_outcome_id])");
    expect(model).toContain("@@index([cilo_id])");
    expect(model).toContain("@@index([institutional_outcome_id])");
    expect(model).toContain('@@map("cilo_institutional_outcome_mappings")');
  });
});
