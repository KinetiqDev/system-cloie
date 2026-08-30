import { redirect } from "next/navigation";

export default function SecretaryCreateCoursePage() {
  // Course creation moved into a modal on the course catalog page.
  redirect("/secretary/courses");
}
