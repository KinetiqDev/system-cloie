import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Analytics", "Dean") };

export default function DeanAnalyticsPage() {
  notFound();
}
