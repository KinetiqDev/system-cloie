/**
 * Desktop sidebar collapse preference.
 *
 * A UI preference, not domain state: it is a first-party, client-readable
 * cookie so the client toggle can write it without a server round trip while
 * the server shell still renders the first frame in the remembered state.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "cloie-sidebar-collapsed";

/** One year, so the remembered rail survives a working day and a term. */
const SIDEBAR_COLLAPSED_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isSidebarCollapsed(value: string | undefined | null): boolean {
  return value === "1";
}

export function sidebarCollapsedCookieHeader(collapsed: boolean): string {
  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  return [
    `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}`,
    "path=/",
    `max-age=${SIDEBAR_COLLAPSED_MAX_AGE_SECONDS}`,
    "samesite=lax",
    secure,
  ].join("; ");
}
