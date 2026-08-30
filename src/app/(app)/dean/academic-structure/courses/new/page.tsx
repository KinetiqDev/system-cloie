import { redirect } from "next/navigation";

export default function DeanCreateCoursePage() {
  // Course creation moved into a modal on the course catalog page.
  redirect("/dean/academic-structure/courses");
}
