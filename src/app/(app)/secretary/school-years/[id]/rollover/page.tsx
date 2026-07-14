import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
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
  const termInstances: TermInstanceItem[] = schoolYear.term_instances.map(
    (ti) => ({
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
    })
  );

  // 4. Find active term (source) and next term (target)
  const activeTermIndex = termInstances.findIndex((ti) => ti.status === "ACTIVE");
  const sourceTerm = activeTermIndex >= 0 ? termInstances[activeTermIndex] : null;
  const targetTerm =
    activeTermIndex >= 0 ? termInstances[activeTermIndex + 1] : null;

  // 5. Check if rollover is possible
  const canRollover = sourceTerm && targetTerm;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-text-secondary flex items-center gap-2 text-sm">
        <Link href="/secretary/school-years" className="hover:text-text-primary">
          School Years
        </Link>
        <span>›</span>
        <Link
          href={`/secretary/school-years/${schoolYearId}`}
          className="hover:text-text-primary"
        >
          {schoolYear.code}
        </Link>
        <span>›</span>
        <span className="text-text-primary font-medium">Term Rollover</span>
      </nav>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Term Rollover</h1>
        <p className="text-text-secondary">
          Roll over student enrollments from one term to the next within{" "}
          <span className="font-semibold">{schoolYear.code}</span>.
        </p>
      </div>

      {/* Term Instances Summary */}
      <div className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Available Terms</h2>
        <div className="mt-2 space-y-1">
          {termInstances.map((ti) => (
            <div
              key={ti.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                ti.status === "ACTIVE" ? "bg-primary/10" : "bg-surface-container-low"
              }`}
            >
              <span>
                {ti.semester}
                {ti.term ? ` — ${ti.term}` : ""}
              </span>
              {ti.status === "ACTIVE" && (
                <span className="text-primary text-xs font-medium">Active</span>
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
        <div className="border-border bg-surface rounded-xl border p-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Rollover Not Available</h3>
            <p className="text-text-muted text-sm">
              {!sourceTerm
                ? "There is no active term in this school year. Please set an active term first."
                : "There is no next term to roll over to. This appears to be the last term in the school year."}
            </p>
            <Link
              href={`/secretary/school-years/${schoolYearId}`}
              className="text-primary inline-block text-sm font-medium hover:underline"
            >
              Manage Terms →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
