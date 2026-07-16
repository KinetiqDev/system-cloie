import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DeanEditProgramPage({ params }: Props) {
  permanentRedirect(`/dean/academic-structure/programs/${(await params).id}/edit`);
}
