"use server";
 
import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createUserBySecretarySchema } from "@/features/users/schemas/create-user";
import { updateUserBySecretarySchema } from "@/features/users/schemas/update-user";
import { createUserBySecretary } from "@/features/users/services/create-user-by-secretary";
import { updateUserBySecretary } from "@/features/users/services/update-user-by-secretary";
 
type ActionResult = { success: true } | { success: false; error: string };
 
async function verifySecretaryAccess(): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session?.roles?.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Secretary access required" };
  }
  return { success: true };
}
 
export async function createUserBySecretaryAction(formData: FormData): Promise<ActionResult> {
  const access = await verifySecretaryAccess();
  if (!access.success) {
    return access;
  }
 
  const raw = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    role: formData.get("role"),
    program_id: formData.get("program_id") || undefined,
  };
 
  const parsed = createUserBySecretarySchema.safeParse(raw);
 
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
 
  const result = await createUserBySecretary(parsed.data);
 
  if (!result.success) {
    return { success: false, error: result.error };
  }
 
  revalidatePath("/secretary/users");
  return { success: true };
}
 
export async function updateUserBySecretaryAction(formData: FormData): Promise<ActionResult> {
  const access = await verifySecretaryAccess();
  if (!access.success) {
    return access;
  }
 
  const raw = {
    id: formData.get("id"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
  };
 
  const parsed = updateUserBySecretarySchema.safeParse(raw);
 
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
 
  const result = await updateUserBySecretary(parsed.data);
 
  if (!result.success) {
    return { success: false, error: result.error };
  }
 
  revalidatePath("/secretary/users");
  return { success: true };
}
