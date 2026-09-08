import { notFound } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Reports", "Dean") };

export default function DeanReportsPage() {
  notFound();
}
