import { permanentRedirect } from "next/navigation";

export default async function DeanProgramsPage() {
  permanentRedirect("/dean/academic-structure/programs");
}
