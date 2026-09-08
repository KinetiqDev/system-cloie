export const SITE_NAME = "System CLOIE";

export function buildPageTitle(...segments: Array<string | undefined>): string {
  return segments
    .map((segment) => segment?.trim())
    .filter((segment): segment is string => Boolean(segment))
    .join(" | ");
}
