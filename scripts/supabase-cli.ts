import { resolveLocalBin } from "./resolve-local-bin";

export function getSupabaseCommand() {
  return resolveLocalBin("supabase");
}

export function withPlaintextSslmode(directUrl: string): string {
  const queryIndex = directUrl.indexOf("?");
  if (queryIndex === -1) {
    return `${directUrl}?sslmode=disable`;
  }
  for (const pair of directUrl.slice(queryIndex + 1).split("&")) {
    const [rawName = ""] = pair.split("=");
    try {
      if (decodeURIComponent(rawName.replace(/\+/g, " ")) === "sslmode") {
        return directUrl;
      }
    } catch {
      if (rawName === "sslmode") {
        return directUrl;
      }
    }
  }
  return `${directUrl}${queryIndex === directUrl.length - 1 ? "" : "&"}sslmode=disable`;
}

export function requireDirectUrl(): string {
  const value = process.env.DIRECT_URL;

  if (!value) {
    throw new Error(
      "DIRECT_URL is required for remote Supabase commands. " +
        "Set DIRECT_URL to the direct PostgreSQL connection string of the self-hosted Supabase target."
    );
  }

  return withPlaintextSslmode(value);
}
