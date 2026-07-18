import { permanentRedirect } from "next/navigation";

interface DeanEditCoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function DeanEditCoursePage({ params }: DeanEditCoursePageProps) {
  permanentRedirect(`/dean/academic-structure/courses/${(await params).id}/edit`);
}
