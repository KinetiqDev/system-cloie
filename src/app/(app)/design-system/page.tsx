import type { Metadata } from "next";
import { DesignSystemShowcasePage } from "@/features/design-system/components/design-system-showcase-page";

export const metadata: Metadata = {
  title: "Design System | CLOIE",
};

export default function DesignSystemPage() {
  return <DesignSystemShowcasePage />;
}
