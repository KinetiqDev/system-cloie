import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramHeadResponsesFilters } from "./program-head-responses-filters";
import { ProgramHeadResponsesPagination } from "./program-head-responses-pagination";
import type { ResponseDeploymentList } from "@/features/analytics/services/list-program-head-response-deployments";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import { buildProgramHeadResponsesTabUrl } from "@/features/analytics/services/program-head-responses-state";

import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
export function ProgramHeadResponsesLanding({ programId, program, state, data }: { programId: string; program: { code: string; name: string }; state: ProgramHeadResponsesFilterState; data: ResponseDeploymentList }) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const isCourse = state.tab === "course";
  return <div className="flex flex-col gap-6">
    <header className="space-y-1"><h1 className="text-heading-lg">Responses</h1><p className="text-body-md text-text-secondary">{program.code} — {program.name} · Browse evaluation evidence and submitted responses.</p></header>
    <nav aria-label="Response views" className="flex gap-1 overflow-x-auto"><Tab href={buildProgramHeadResponsesTabUrl(programId, "course", state)} active={isCourse}>Course evaluations</Tab><Tab href={buildProgramHeadResponsesTabUrl(programId, "program-wide", state)} active={!isCourse}>Program-wide evaluations</Tab></nav>
    <ProgramHeadResponsesFilters programId={programId} state={state} options={data.options} />
    <Card><CardHeader><CardTitle>{isCourse ? "Course evaluations" : "Program-wide evaluations"}</CardTitle></CardHeader><CardContent>
      {data.items.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-body-md text-muted-foreground">No {isCourse ? "Course" : "Program-wide"} evaluations match the selected filters.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead><tr className="border-b border-border text-label-md text-muted-foreground">{(isCourse ? ["Evaluation", "Class", "Faculty", "Period", "Status", "Responses", "Evaluation quantitative mean"] : ["Evaluation", "Stakeholder", "Target", "Period", "Status", "Responses", "Evaluation quantitative mean"]).map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>)}</tr></thead><tbody>{data.items.map((item) => <tr key={item.id} className="border-b border-border align-top"><td className="px-3 py-3"><Link className="font-semibold text-link hover:underline" href={isCourse ? buildProgramHeadResponsesCourseEvaluationPath(programId, item.id) : buildProgramHeadResponsesProgramWideDeploymentPath(programId, item.id)}>{item.title}</Link>{isCourse && item.course ? <span className="block text-muted-foreground">{item.course.code} · {item.course.title}</span> : null}</td>{isCourse ? <><td className="whitespace-nowrap px-3 py-3">{item.yearLevel?.replace("_", " ")} · {item.section}</td><td className="whitespace-nowrap px-3 py-3">{item.faculty}</td></> : <><td className="whitespace-nowrap px-3 py-3">{item.stakeholder?.replace("_", " ")}</td><td className="px-3 py-3">{item.target}</td></>}<td className="whitespace-nowrap px-3 py-3">{item.period}</td><td className="px-3 py-3"><Badge variant="outline">{item.status}</Badge></td><td className="whitespace-nowrap px-3 py-3">{item.submitted} / {item.assigned}{item.submitted === 0 ? <span className="block text-muted-foreground">No responses yet</span> : null}</td><td className="px-3 py-3">{item.mean === null ? "—" : item.mean.toFixed(2)}</td></tr>)}</tbody></table></div>}
      {data.total > data.pageSize ? <div className="mt-4"><ProgramHeadResponsesPagination programId={programId} state={state} totalPages={totalPages} /></div> : null}
    </CardContent></Card>
  </div>;
}
function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-2 text-label-md ${active ? "bg-primary-soft text-selected-fg" : "text-muted-foreground hover:text-foreground"}`}>{children}</Link>; }
