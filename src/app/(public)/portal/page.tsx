import { redirect } from "next/navigation";

/**
 * Retired entry (issue #649): the shared role-selection portal is replaced by
 * the scoped entrances (/login/student, /login/staff, /login/external and
 * /register/*). This redirect keeps one supported flow and preserves old links.
 */
export default function PortalRedirectPage() {
  redirect("/");
}
