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

export type BaselineTemplateActionResult =
  | { success: true; data?: { id: string } }
  | { success: false; error: string };

async function authorizeBaselineManagement(): Promise<{ error: string } | null> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required." };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions." };
  }
  return null;
}

function buildCodeFromName(name: FormDataEntryValue | null): string {
  const nameStr = typeof name === "string" ? name.trim() : "";
  return (
    nameStr
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50) || "TEMPLATE"
  );
}

function readTemplateFormFields(formData: FormData) {
  const name = formData.get("name");
  return {
    name,
    description: formData.get("description"),
    template_type: formData.get("template_type"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
    is_active: formData.get("is_active"),
    structure: JSON.parse((formData.get("structure") as string) || "[]"),
    code: buildCodeFromName(name),
  };
}

export async function runCreateBaselineTemplate(
  formData: FormData,
  toolsPath: string
): Promise<BaselineTemplateActionResult> {
  const denied = await authorizeBaselineManagement();
  if (denied) {
    return { success: false, error: denied.error };
  }

  const parsed = createBaselineTemplateWithStructureSchema.safeParse(
    readTemplateFormFields(formData)
  );

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createBaselineTemplateWithStructure(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(toolsPath);
  return { success: true, data: result.data };
}

export async function runUpdateBaselineTemplate(
  formData: FormData,
  toolsPath: string
): Promise<BaselineTemplateActionResult> {
  const denied = await authorizeBaselineManagement();
  if (denied) {
    return { success: false, error: denied.error };
  }

  const parsed = updateBaselineTemplateWithStructureSchema.safeParse({
    id: formData.get("id"),
    ...readTemplateFormFields(formData),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await updateBaselineTemplateWithStructure(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(toolsPath);
  return { success: true, data: { id: parsed.data.id } };
}

export async function runToggleBaselineTemplateActive(
  id: string,
  is_active: boolean,
  toolsPath: string
): Promise<BaselineTemplateActionResult> {
  const result = await toggleBaselineTemplateActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(toolsPath);
  return { success: true };
}

export async function runDuplicateBaselineTemplate(
  id: string,
  toolsPath: string
): Promise<BaselineTemplateActionResult> {
  const denied = await authorizeBaselineManagement();
  if (denied) {
    return { success: false, error: denied.error };
  }

  const result = await duplicateBaselineTemplate(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(toolsPath);
  return { success: true };
}

export async function runDeleteBaselineTemplate(
  id: string,
  toolsPath: string
): Promise<BaselineTemplateActionResult> {
  const denied = await authorizeBaselineManagement();
  if (denied) {
    return { success: false, error: denied.error };
  }

  const result = await deleteBaselineTemplate(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(toolsPath);
  return { success: true };
}
