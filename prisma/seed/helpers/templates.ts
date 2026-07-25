import { EvaluationTemplateType, Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";
import type { TemplateStructure } from "../types";

export async function upsertTemplate(
  code: string,
  name: string,
  desc: string,
  structure: TemplateStructure,
  templateType: EvaluationTemplateType,
  facAccess = false
) {
  const json = structure as unknown as Prisma.InputJsonValue;
  const t = await prisma.instrumentTemplate.upsert({
    where: { code },
    update: {
      name,
      description: desc,
      structure: json,
      is_active: true,
      is_faculty_accessible: templateType === EvaluationTemplateType.COURSE_BOUND && facAccess,
      program_id: null,
      template_type: templateType,
    },
    create: {
      code,
      name,
      description: desc,
      structure: json,
      is_active: true,
      is_faculty_accessible: templateType === EvaluationTemplateType.COURSE_BOUND && facAccess,
      program_id: null,
      template_type: templateType,
    },
  });
  await prisma.instrumentVersion.upsert({
    where: { template_id_version_number: { template_id: t.id, version_number: 1 } },
    update: { is_active: true, structure_snapshot: json },
    create: { template_id: t.id, version_number: 1, is_active: true, structure_snapshot: json },
  });
  return t;
}
