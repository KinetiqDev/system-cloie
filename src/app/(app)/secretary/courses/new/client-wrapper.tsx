"use client";

import { useRouter } from "next/navigation";
import { CourseForm } from "@/features/academic-structure/components/course-form";

type ProgramOption = {
  id: string;
  code: string;
  name: string;
};

type MajorOption = {
  id: string;
  name: string;
  program_id: string;
  program_code: string;
};

type CreateCourseClientWrapperProps = {
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  programs: ProgramOption[];
  majors: MajorOption[];
};

export function CreateCourseClientWrapper({
  action,
  programs,
  majors,
}: CreateCourseClientWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    const message = "Course created successfully!";
    router.push(`/secretary/courses?toast=${encodeURIComponent(message)}`);
  };

  return (
    <CourseForm
      action={action}
      programs={programs}
      majors={majors}
      submitLabel="Create Course"
      onSuccess={handleSuccess}
    />
  );
}
