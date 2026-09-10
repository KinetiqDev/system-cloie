import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("CILO Reviews", "Dean") };

export default async function DeanCiloReviewsPage() {
  notFound();
}
