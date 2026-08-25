import Link from "next/link";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SecretaryDashboard } from "@/features/secretary/components/secretary-dashboard";
import type { SecretaryDashboardData } from "@/features/secretary/services/read-secretary-dashboard";
import { readSecretaryDashboard } from "@/features/secretary/services/read-secretary-dashboard";
import { cn } from "@/lib/utils";
import Loading from "./loading";

export default function SecretaryDashboardPage() {
  const dashboardPromise = readSecretaryDashboard();
  void dashboardPromise.catch(() => undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-heading-lg text-pretty">Secretary Dashboard</h1>
          <p className="text-body-md text-text-secondary max-w-3xl text-pretty">
            Manage the Academic Calendar, accounts, and institutional catalogs.
          </p>
        </div>
        <Link
          href="/secretary/users/new"
          className={cn(buttonVariants(), "hidden sm:inline-flex")}
        >
          <UserPlus aria-hidden="true" data-icon="inline-start" />
          Add User
        </Link>
      </div>

      <Suspense fallback={<Loading showHeader={false} />}>
        <SecretaryDashboardContent dashboardPromise={dashboardPromise} />
      </Suspense>
    </div>
  );
}

async function SecretaryDashboardContent({
  dashboardPromise,
}: {
  dashboardPromise: Promise<SecretaryDashboardData>;
}) {
  return <SecretaryDashboard data={await dashboardPromise} />;
}
