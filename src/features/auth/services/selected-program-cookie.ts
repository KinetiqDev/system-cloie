import { cookies } from "next/headers";

export const SELECTED_PROGRAM_COOKIE_NAME = "cloie_ph_selected_program";

export function getSelectedProgramCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readSelectedProgramCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SELECTED_PROGRAM_COOKIE_NAME)?.value ?? null;
}

/**
 * Server-side writers for the selected-Program cookie. The proxy sets the
 * cookie on program-scoped navigation; these remain the canonical writers for
 * future server-action-driven program switches (issue fb0ce73 context).
 */
// fallow-ignore-next-line unused-export
export async function setSelectedProgramCookie(programId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PROGRAM_COOKIE_NAME, programId, getSelectedProgramCookieOptions());
}

// fallow-ignore-next-line unused-export
export async function clearSelectedProgramCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_PROGRAM_COOKIE_NAME);
}
