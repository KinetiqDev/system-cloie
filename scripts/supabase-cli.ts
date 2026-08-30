import { resolveLocalBin } from "./resolve-local-bin";

export function getSupabaseCommand() {
  return resolveLocalBin("supabase");
}

export function requireDirectUrl(): string {
  const value = process.env.DIRECT_URL;

  if (!value) {
    throw new Error(
      "DIRECT_URL is required for remote Supabase commands. " +
        "Set DIRECT_URL to the direct PostgreSQL connection string of the self-hosted Supabase target."
    );
  }

  return value;
}
