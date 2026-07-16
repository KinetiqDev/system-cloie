import { notFound } from "next/navigation";

export default async function DeanCiloResponsePage({
  params,
}: {
  params: Promise<{ evaluationId: string; responseId: string }>;
}) {
  void params;
  notFound();
}
