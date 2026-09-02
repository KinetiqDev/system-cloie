"use server";

import { SystemRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  createBaselineTemplateWithStructureSchema,
  updateBaselineTemplateWithStructureSchema,
} from "@/features/instruments/schemas/template";
import {
  createBaselineTemplateWithStructure,
  updateBaselineTemplateWithStructure,
  toggleBaselineTemplateActive,
  duplicateBaselineTemplate,
  deleteBaselineTemplate,
} from "@/features/instruments/services/manage-instruments";

type ActionResult = { success: true; data?: { id: string } } | { success: false; error: string };

function revalidateDeanTools() {
  revalidatePath("/dean/academic-structure/instruments");
}

export async function createDeanTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure: JSON.parse((formData.get("structure") as string) || "[]"),
  };

  const nameStr = typeof raw.name === "string" ? raw.name.trim() : "";
  const code =
    nameStr
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50) || "TEMPLATE";

  const parsed = createBaselineTemplateWithStructureSchema.safeParse({
    ...raw,
    code,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await createBaselineTemplateWithStructure(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateDeanTools();
  return { success: true, data: result.data };
}

export async function updateDeanTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    structure: JSON.parse((formData.get("structure") as string) || "[]"),
  };

  const nameStr = typeof raw.name === "string" ? raw.name.trim() : "";
  const code =
    nameStr
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50) || "TEMPLATE";

  const parsed = updateBaselineTemplateWithStructureSchema.safeParse({
    ...raw,
    code,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await updateBaselineTemplateWithStructure(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateDeanTools();
  return { success: true, data: { id: parsed.data.id } };
}

export async function toggleDeanTemplateActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const result = await toggleBaselineTemplateActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateDeanTools();
  return { success: true };
}

export async function duplicateDeanTemplateAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  const result = await duplicateBaselineTemplate(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateDeanTools();
  return { success: true };
}

export async function deleteDeanTemplateAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { success: false, error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { success: false, error: "Insufficient permissions." };
  }
  const result = await deleteBaselineTemplate(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateDeanTools();
  return { success: true };
}
