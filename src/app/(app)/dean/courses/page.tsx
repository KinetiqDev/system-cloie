import { permanentRedirect } from "next/navigation";

export default async function DeanCoursesPage() {
  permanentRedirect("/dean/academic-structure/courses");
}
