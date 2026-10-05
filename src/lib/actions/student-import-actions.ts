"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  commitStudentImport,
  previewStudentImport,
} from "@/features/users/services/student-import";
import { STUDENT_IMPORT_MAX_BYTES } from "@/features/users/services/student-import-csv";

export async function studentImportAction(form: FormData) {
  const session = await resolveAuthSession();
  if (session?.activeRole !== ROLES.SECRETARY)
    return { success: false as const, error: "Secretary access required." };
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".csv") ||
    file.size > STUDENT_IMPORT_MAX_BYTES
  )
    return { success: false as const, error: "Choose a .csv file no larger than 256 KiB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const token = form.get("token");
  const result =
    typeof token === "string" && token
      ? await commitStudentImport(bytes, session.userId, token)
      : await previewStudentImport(bytes, session.userId);
  if (result.success && token) {
    revalidatePath("/secretary/users");
    revalidatePath("/secretary");
  }
  if (!result.success) return result;
  const rows = result.rows.map((row) => ({
    line: row.line,
    input: row.input,
    status: row.status,
    message: row.message,
  }));
  if (!token) {
    const preview = result as Extract<
      Awaited<ReturnType<typeof previewStudentImport>>,
      { success: true }
    >;
    return {
      success: true as const,
      rows,
      token: preview.token,
      termId: preview.termId,
      termLabel: preview.termLabel,
    };
  }
  return { success: true as const, rows };
}
