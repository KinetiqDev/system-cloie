import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProgramHeadDashboardPath } from "@/lib/constants/program-head-routes";

function isReservedProgramHeadPath(path: string[]): boolean {
  const normalizedPath = path.join("/");

  return (
    [
      "course-assignments",
      "tools",
      "tools/new",
      "tools/publish",
      "cilo-reviews",
      "analytics",
      "reports",
    ].includes(normalizedPath) ||
    /^tools\/[^/]+\/edit$/.test(normalizedPath) ||
    /^cilo-reviews\/[^/]+$/.test(normalizedPath) ||
    /^cilo-reviews\/[^/]+\/responses\/[^/]+$/.test(normalizedPath)
  );
}

export default async function SelectedProgramMigrationPage({
  params,
}: {
  params: Promise<{ programId: string; path: string[] }>;
}) {
  const { programId, path } = await params;

  if (!isReservedProgramHeadPath(path)) {
    notFound();
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Program workspace is being migrated</CardTitle>
        <CardDescription>
          This selected Program route is reserved for the next Program Head management slice. No
          cross-Program data is loaded here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={buildProgramHeadDashboardPath(programId)}
          className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <ArrowLeft aria-hidden="true" />
          Return to this Program dashboard
        </Link>
      </CardContent>
    </Card>
  );
}
