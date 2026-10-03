import { redirect } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Staff & Faculty Portal"),
  description: "Sign in as ACD Staff or Faculty Member",
};

/**
 * Retired entry (issue #649): the staff role-card portal is replaced by the
 * single staff sign-in entrance.
 */
export default async function StaffPortalPage() {
  redirect("/login/staff");
}
