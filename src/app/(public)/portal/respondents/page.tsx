import { redirect } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Respondent Portal"),
  description: "Sign in as a Student, Alumni, or Industry Partner",
};

/**
 * Retired entry (issue #649): the mixed respondent portal is replaced by the
 * dedicated Student entrance and the external Alumni/partner entrance.
 */
export default async function RespondentPortalPage() {
  redirect("/");
}
