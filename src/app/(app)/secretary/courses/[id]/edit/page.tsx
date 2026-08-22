import { redirect } from "next/navigation";

export default function SecretaryCourseEditPage() {
  // Course editing moved into a modal on the course catalog page.
  redirect("/secretary/courses");
}
