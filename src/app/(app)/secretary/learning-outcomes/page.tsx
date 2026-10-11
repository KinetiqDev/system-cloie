import { LearningOutcomesPage } from "@/features/dean/components/learning-outcomes-page";
import { COLLEGE_OVERSIGHT_ROUTES } from "@/lib/constants/college-oversight";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Learning Outcomes", "Secretary") };

export default function SecretaryLearningOutcomesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <LearningOutcomesPage searchParams={searchParams} routes={COLLEGE_OVERSIGHT_ROUTES.SECRETARY} />
  );
}
