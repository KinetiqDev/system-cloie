export function getProjectRefFromDatabaseUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const { hostname, username } = new URL(value);
    const poolerMatch = hostname.match(/^[a-z0-9-]+\.pooler\.supabase\.com$/i);
    const directMatch = hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    const [user, projectRef] = username.split(".");

    if (poolerMatch && user === "postgres" && projectRef) {
      return projectRef;
    }

    if (directMatch && username === "postgres") {
      return directMatch[1] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getProjectRefFromSupabaseUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const hostname = new URL(value).hostname;
    return hostname.endsWith(".supabase.co") ? (hostname.split(".")[0] ?? null) : null;
  } catch {
    return null;
  }
}
