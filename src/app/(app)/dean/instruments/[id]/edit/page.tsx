import { permanentRedirect } from "next/navigation";

interface DeanEditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function DeanEditTemplatePage({ params }: DeanEditTemplatePageProps) {
  permanentRedirect(`/dean/academic-structure/instruments/${(await params).id}/edit`);
}
