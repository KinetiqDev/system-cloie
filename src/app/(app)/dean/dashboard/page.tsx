import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, Gauge, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GET as getDashboard } from "@/app/api/dean/dashboard/route";
import type { DeanDashboardData, DeanReadState } from "@/features/dean/services/read-dean-oversight";
import { fetchDeanRead } from "@/features/dean/services/fetch-dean-read";

const risks = [
  {
    key: "missing-cilos",
    label: "Missing CILOs",
    description: "Contexts without active Course Intended Learning Outcomes.",
    dataKey: "missingCilos" as const,
  },
  {
    key: "incomplete-mappings",
    label: "Incomplete CILO-to-GO mappings",
    description: "Contexts with CILOs that have no active Graduate Outcome mapping.",
    dataKey: "incompleteMappings" as const,
  },
  {
    key: "not-ready",
    label: "Not ready",
    description: "Contexts with either readiness gap.",
    dataKey: "notReady" as const,
  },
] as const;

function percentage(ready: number, active: number) {
  return active === 0 ? 0 : Math.round((ready / active) * 100);
}

export default async function DeanDashboardPage() {
  const result = await fetchDeanRead<DeanReadState<DeanDashboardData>>(
    getDashboard,
    "/api/dean/dashboard"
  );

  if (result.state === "no-eligible-period") {
    return (
      <div className="flex flex-col gap-6">
        <PageIntro />
        <Card>
          <CardHeader>
            <h2 className="font-heading text-base leading-snug font-medium">
              No active Academic Period
            </h2>
            <CardDescription>
              Dashboard readiness appears when Secretary activates an Academic Period.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { activePeriod, kpis, risks: riskCounts, programs } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <PageIntro />
      <div className="text-text-secondary flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-primary font-medium">Active Academic Period</span>
        <Badge variant="outline">{activePeriod.label}</Badge>
      </div>

      <section aria-labelledby="dashboard-kpis" className="flex flex-col gap-3">
        <div>
          <h2 id="dashboard-kpis" className="text-heading-md">
            Readiness at a glance
          </h2>
          <p className="text-body-sm text-text-secondary">
            Unique Course and Academic Program contexts in active period.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Active contexts"
            value={kpis.activeContexts}
            detail="Course + Academic Program"
            icon={Layers3}
          />
          <KpiCard
            label="Ready contexts"
            value={kpis.readyContexts}
            detail="All active CILOs mapped"
            icon={CheckCircle2}
          />
          <KpiCard
            label="Missing CILOs"
            value={kpis.missingCiloContexts}
            detail="Readiness gap"
            icon={CircleAlert}
          />
          <KpiCard
            label="Incomplete mappings"
            value={kpis.incompleteMappingContexts}
            detail="CILO-to-GO gap"
            icon={Gauge}
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-risks" className="flex flex-col gap-3">
        <div>
          <h2 id="dashboard-risks" className="text-heading-md">
            Risks to inspect
          </h2>
          <p className="text-body-sm text-text-secondary">
            Counts only. Open a risk to filter same-period Learning Outcomes.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {risks.map((risk) => (
            <Link
              key={risk.key}
              href={`/dean/college-oversight/learning-outcomes?period=${encodeURIComponent(activePeriod.id)}&risk=${risk.key}`}
              className="group ring-foreground/10 hover:bg-muted/50 focus-visible:ring-ring rounded-xl ring-1 transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <Card className="h-full ring-0 transition-transform group-active:translate-y-px">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{risk.label}</CardTitle>
                    <ArrowUpRight aria-hidden="true" className="text-text-secondary size-4" />
                  </div>
                  <CardDescription>{risk.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">{riskCounts[risk.dataKey]}</p>
                  <span className="sr-only">Open filtered Learning Outcomes for {risk.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="coverage-matrix" className="flex flex-col gap-3">
        <div>
          <h2 id="coverage-matrix" className="text-heading-md">
            Program readiness matrix
          </h2>
          <p className="text-body-sm text-text-secondary">
            Variant A compares active contexts and outcome coverage by Academic Program.
          </p>
        </div>
        {programs.length === 0 ? (
          <Card>
            <CardContent className="text-text-secondary py-6 text-sm">
              No active Course and Academic Program contexts in this period.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <MatrixTable programs={programs} periodId={activePeriod.id} />
            </div>
            <div className="flex flex-col gap-3 p-3 md:hidden">
              {programs.map((program) => (
                <MatrixCard key={program.id} program={program} periodId={activePeriod.id} />
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function PageIntro() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-heading-lg">Dean Dashboard</h1>
      <p className="text-body-md text-text-secondary max-w-2xl">
        College-wide academic readiness at a glance.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Layers3;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="text-text-secondary flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4" />
          <CardTitle className="text-sm">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="text-text-secondary mt-1 text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
}

type MatrixProgram = {
  id: string;
  name: string;
  activeContexts: number;
  readyContexts: number;
  missingCiloContexts: number;
  incompleteMappingContexts: number;
};

function MatrixTable({ programs, periodId }: { programs: MatrixProgram[]; periodId: string }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-muted/40 text-text-secondary border-b text-xs">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">
            Academic Program
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Active contexts
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Ready contexts
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Coverage
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {programs.map((program) => (
          <MatrixRow key={program.id} program={program} periodId={periodId} />
        ))}
      </tbody>
    </table>
  );
}

function MatrixRow({ program, periodId }: { program: MatrixProgram; periodId: string }) {
  const rate = percentage(program.readyContexts, program.activeContexts);
  const notReady = program.activeContexts - program.readyContexts;
  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <th scope="row" className="px-4 py-4 font-medium">
        <Link
          className="focus-visible:ring-ring rounded-md underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
          href={`/dean/college-oversight/learning-outcomes?period=${encodeURIComponent(periodId)}&program=${encodeURIComponent(program.id)}`}
        >
          {program.name}
        </Link>
      </th>
      <td className="px-4 py-4 tabular-nums">{program.activeContexts}</td>
      <td className="px-4 py-4 tabular-nums">{program.readyContexts}</td>
      <td className="min-w-48 px-4 py-4">
        <Coverage rate={rate} ready={program.readyContexts} active={program.activeContexts} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge notReady={notReady} />
      </td>
    </tr>
  );
}

function MatrixCard({ program, periodId }: { program: MatrixProgram; periodId: string }) {
  const rate = percentage(program.readyContexts, program.activeContexts);
  return (
    <details className="rounded-lg border">
      <summary className="focus-visible:ring-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 outline-none marker:hidden focus-visible:ring-3">
        <span className="min-w-0 truncate font-medium">{program.name}</span>
        <StatusBadge notReady={program.activeContexts - program.readyContexts} />
      </summary>
      <div className="border-t p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Active contexts" value={program.activeContexts} />
          <Metric label="Ready contexts" value={program.readyContexts} />
        </div>
        <div className="mt-4">
          <Coverage rate={rate} ready={program.readyContexts} active={program.activeContexts} />
        </div>
        <Link
          href={`/dean/college-oversight/learning-outcomes?period=${encodeURIComponent(periodId)}&program=${encodeURIComponent(program.id)}`}
          className="focus-visible:ring-ring text-primary mt-4 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          View {program.name} Learning Outcomes
        </Link>
      </div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-text-secondary text-xs">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Coverage({ rate, ready, active }: { rate: number; ready: number; active: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-xs">
        <span>{rate}% coverage</span>
        <span className="text-text-secondary">
          {ready}/{active}
        </span>
      </div>
      <Progress value={rate} aria-label={`${rate}% readiness coverage`} />
    </div>
  );
}

function StatusBadge({ notReady }: { notReady: number }) {
  return (
    <Badge variant={notReady === 0 ? "secondary" : "destructive"}>
      {notReady === 0 ? "Ready" : "Needs attention"}
    </Badge>
  );
}
