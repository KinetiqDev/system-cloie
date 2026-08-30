import { redirect } from "next/navigation";

export default function DeanCreateCoursePage() {
  // Route kept so bookmarked /new links land on the catalog; creation now lives in a dialog.
  redirect("/dean/academic-structure/courses");
}
