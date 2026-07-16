import { BookOpen, Building2, Layers3, UsersRound } from "lucide-react";
import { DeanGroupLanding } from "../dean-group-landing";

export default function AcademicStructurePage() {
  return (
    <DeanGroupLanding
      title="Academic Structure"
      purpose="Manage programs, courses, faculty assignments, and institutional instruments across the college."
      tools={[
        { name: "Programs", href: "/dean/academic-structure/programs", description: "Manage academic programs and majors.", icon: Building2 },
        { name: "Courses", href: "/dean/academic-structure/courses", description: "Manage the shared course catalog.", icon: BookOpen },
        { name: "Course Assignments", href: "/dean/academic-structure/course-assignments", description: "Assign faculty to course contexts.", icon: UsersRound },
        { name: "Instruments", href: "/dean/academic-structure/instruments", description: "Manage institutional evaluation instruments.", icon: Layers3 },
      ]}
    />
  );
}
