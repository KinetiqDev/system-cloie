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
  "DeploymentStatus",
  "DeploymentType",
  "EnrollmentSource",
  "EvaluationTemplateType",
  "FacultyApprovalStatus",
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
  "CentralDeploymentPoSnapshot",
  "Course",
  "CourseAssignment",
  "CourseAssignmentMembership",
  "CourseBoundCiloQuestionBinding",
  "CourseBoundPoQuestionBinding",
  "CourseBoundEvaluation",
  "CourseBoundEvaluationExclusion",
  "CourseBoundEvaluationTarget",
  "EvaluationAssignment",
  "ExternalStakeholderInvite",
  "FacultyAccessRequest",
  "FacultyProgramAffiliation",
  "PO",
  "IndustryPartnerProfile",
  "IndustryPartnerProgramAffiliation",
  "InstitutionalOutcome",
  "InstrumentTemplate",
  "InstrumentTemplateCiloQuestionBinding",
  "InstrumentTemplatePoQuestionBinding",
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
    expect(model).toContain("@@unique([cilo_id, po_id])");
    expect(model).toContain('@@map("cilo_mappings")');
  });

  it("keeps the typed General Education mapping relation with provenance", () => {
    const source = readFileSync(join(prismaModelsDir, "outcomes.prisma"), "utf8");
    const match = source.match(/model CILOInstitutionalOutcomeMapping \{[\s\S]*?\n\}/);

    expect(match).not.toBeNull();
    const model = match![0];

    expect(model).toContain("cilo_id");
    expect(model).toContain("institutional_outcome_id");
    expect(model).toContain("manifestation");
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

  // A stale @map on a Program Outcome field makes every read through that model
  // throw P2022 "The column `...` does not exist in the current database" at
  // runtime, long after the schema itself still parses. These pins name the
  // physical columns the deployed database actually exposes.
  it("maps every Program Outcome field to the deployed physical column", () => {
    const outcomesSource = readFileSync(join(prismaModelsDir, "outcomes.prisma"), "utf8");
    const instrumentsSource = readFileSync(join(prismaModelsDir, "instruments.prisma"), "utf8");
    const deploymentsSource = readFileSync(
      join(prismaModelsDir, "evaluations-deployments.prisma"),
      "utf8"
    );

    const ciloMapping = outcomesSource.match(/model CILOMapping \{[\s\S]*?\n\}/)![0];
    expect(ciloMapping).toContain('po_id         String                    @map("po_id")');
    expect(ciloMapping).toContain('@@map("cilo_mappings")');
    expect(outcomesSource.match(/model PO \{[\s\S]*?\n\}/)![0]).toContain('@@map("gos")');

    const templateBinding = instrumentsSource.match(
      /model InstrumentTemplatePoQuestionBinding \{[\s\S]*?\n\}/
    )![0];
    expect(templateBinding).toContain('po_id                   String?  @map("plo_id")');
    expect(templateBinding).toContain('po_code_snapshot        String   @map("plo_code_snapshot")');

    const courseBinding = deploymentsSource.match(
      /model CourseBoundPoQuestionBinding \{[\s\S]*?\n\}/
    )![0];
    expect(courseBinding).toContain('po_id                    String?  @map("plo_id")');
    expect(courseBinding).toContain(
      'po_description_snapshot  String   @map("plo_description_snapshot")'
    );

    const centralSnapshot = deploymentsSource.match(
      /model CentralDeploymentPoSnapshot \{[\s\S]*?\n\}/
    )![0];
    expect(centralSnapshot).toContain('po_id                   String?  @map("plo_id")');
  });
});
