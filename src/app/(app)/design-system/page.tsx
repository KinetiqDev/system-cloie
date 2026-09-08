import type { Metadata } from "next";
import { DesignSystemShowcasePage } from "@/features/design-system/components/design-system-showcase-page";
import { buildPageTitle } from "@/lib/page-title";

export const metadata: Metadata = {
  title: buildPageTitle("Design System"),
};

export default function DesignSystemPage() {
  return <DesignSystemShowcasePage />;
}
