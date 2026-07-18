import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "Course Assignments — Dean | CLOIE",
};

export default function DeanCourseAssignmentsPage() {
  permanentRedirect("/dean/academic-structure/course-assignments");
}
