import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TriangleAlert } from "lucide-react";
import { RolloverRunner } from "@/features/academic-calendar/components/rollover-runner";
import {
  previewTermRolloverAction,
  runTermRolloverAction,
} from "@/lib/actions/admin-rollover-actions";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

export const metadata = {
  title: "Term Rollover — Admin | CLOIE",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TermRolloverPage({ params }: PageProps) {
  const { id: schoolYearId } = await params;

  // 1. Verify admin access
  const authSession = await resolveAuthSession();

  if (!authSession?.roles?.includes(ROLES.SECRETARY)) {
    redirect("/unauthorized");
  }

  // 2. Load school year with term instances
  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    include: {
      term_instances: {
        orderBy: [{ semester: "asc" }, { term: "asc" }],
      },
    },
  });

  if (!schoolYear) {
    notFound();
  }

  // 3. Map to TermInstanceItem format
  const termInstances: TermInstanceItem[] = schoolYear.term_instances.map((ti) => ({
    id: ti.id,
    schoolYearId: ti.school_year_id,
    schoolYearCode: schoolYear.code,
    semester: ti.semester,
    term: ti.term ?? null,
    startDate: ti.start_date ?? null,
    endDate: ti.end_date ?? null,
    status: ti.status,
    createdAt: ti.created_at,
    updatedAt: ti.updated_at,
  }));

  // 4. Find active term (source) and next term (target)
  const activeTermIndex = termInstances.findIndex((ti) => ti.status === "ACTIVE");
  const sourceTerm = activeTermIndex >= 0 ? termInstances[activeTermIndex] : null;
  const targetTerm = activeTermIndex >= 0 ? termInstances[activeTermIndex + 1] : null;

  // 5. Check if rollover is possible
  const canRollover = sourceTerm && targetTerm;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/secretary/school-years" className="hover:text-foreground">
          School Years
        </Link>
        <span>›</span>
        <Link href={`/secretary/school-years/${schoolYearId}`} className="hover:text-foreground">
          {schoolYear.code}
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">Term Rollover</span>
      </nav>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Term Rollover</h1>
        <p className="text-muted-foreground">
          Roll over student enrollments from one term to the next within{" "}
          <span className="font-semibold">{schoolYear.code}</span>.
        </p>
      </div>

      {/* Term Instances Summary */}
      <div className="bg-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Available Terms</h2>
        <div className="mt-2 space-y-1">
          {termInstances.map((ti) => (
            <div
              key={ti.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                ti.status === "ACTIVE" ? "bg-success-soft" : "bg-muted"
              }`}
            >
              <span>
                {getSemesterLabel(ti.semester)}
                {ti.term ? ` — ${getTermLabel(ti.term)}` : ""}
              </span>
              {ti.status === "ACTIVE" && (
                <span className="text-success text-xs font-medium">Active</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rollover Runner or Error */}
      {canRollover ? (
        <RolloverRunner
          sourceTerm={sourceTerm}
          targetTerm={targetTerm}
          previewAction={previewTermRolloverAction}
          runAction={runTermRolloverAction}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>Rollover Not Available</EmptyTitle>
            <EmptyDescription>
              {!sourceTerm
                ? "There is no active term in this school year. Please set an active term first."
                : "There is no next term to roll over to. This appears to be the last term in the school year."}
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href={`/secretary/school-years/${schoolYearId}`}
            className="text-link text-sm font-medium hover:underline"
          >
            Manage Terms →
          </Link>
        </Empty>
      )}
    </div>
  );
}
