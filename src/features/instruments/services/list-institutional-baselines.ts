"use server";

import { prisma } from "@/lib/db/prisma";
import type { TemplateStructure } from "../types";

export type InstitutionalBaselineItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  template_type: "PROGRAM_WIDE" | "COURSE_BOUND";
  is_active: boolean;
  is_faculty_accessible: boolean;
  structure: TemplateStructure;
  created_at: Date;
  updated_at: Date;
};

/**
 * Institutional baselines are institution-owned and offered for copying:
 * no Program, no faculty owner, and active.
 */
const institutionalBaselineWhere = {
  program_id: null,
  faculty_owner_id: null,
  is_active: true,
};

const baselineColumns = {
  id: true,
  code: true,
  name: true,
  description: true,
  template_type: true,
  is_active: true,
  is_faculty_accessible: true,
  structure: true,
  created_at: true,
  updated_at: true,
};

export async function listInstitutionalBaselines(): Promise<InstitutionalBaselineItem[]> {
  const templates = await prisma.instrumentTemplate.findMany({
    where: institutionalBaselineWhere,
    select: baselineColumns,
    orderBy: { name: "asc" },
  });

  return templates.map((t) => ({
    ...t,
    structure: t.structure as unknown as TemplateStructure,
  }));
}

export async function getInstitutionalBaseline(
  baselineId: string
): Promise<InstitutionalBaselineItem | null> {
  const template = await prisma.instrumentTemplate.findFirst({
    where: { ...institutionalBaselineWhere, id: baselineId },
    select: baselineColumns,
  });

  if (!template) return null;

  return {
    ...template,
    structure: template.structure as unknown as TemplateStructure,
  };
}
