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

export async function setSelectedProgramCookie(programId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PROGRAM_COOKIE_NAME, programId, getSelectedProgramCookieOptions());
}

export async function clearSelectedProgramCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_PROGRAM_COOKIE_NAME);
}
