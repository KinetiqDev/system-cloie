import Link from "next/link";
import { Calendar, Eye, FileText } from "lucide-react";
import { TargetStakeholder } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listStakeholderEvaluations } from "@/features/responses/services/list-stakeholder-evaluations";

export default async function IndustryPartnerHistoryPage() {
  const { submitted } = await listStakeholderEvaluations(
    TargetStakeholder.INDUSTRY_PARTNER,
    "/industry-partner"
  );

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-6 motion-safe:duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-xl text-foreground text-pretty">Submission History</h1>
        <p className="text-body-sm text-muted-foreground">
          A permanent record of all your completed evaluation forms.
        </p>
      </div>

      <div className="border-border bg-surface hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-surface-muted/50">
            <TableRow>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Evaluation Form
              </TableHead>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Submission Date
              </TableHead>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Status
              </TableHead>
              <TableHead className="text-label-sm text-right font-bold tracking-wider uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submitted.map((sub) => (
              <TableRow
                key={sub.assignmentId}
                className="hover:bg-surface-muted/30 transition-colors"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-text-primary font-bold">{sub.evaluationTitle}</span>
                    <span className="text-text-muted text-xs">{sub.programLabel}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {sub.session.submittedAt ? formatDate(sub.session.submittedAt) : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant="success" className="uppercase">
                    Completed
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="View Answers"
                      disabled={!sub.href}
                      render={sub.href ? <Link href={sub.href} /> : undefined}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {submitted.map((sub) => (
          <Card
            key={sub.assignmentId}
            className="border-border shadow-sm transition-transform active:scale-[0.98]"
          >
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-text-primary mb-1 leading-tight font-bold">
                    {sub.evaluationTitle}
                  </h3>
                  <p className="text-text-muted text-xs font-medium">{sub.programLabel}</p>
                </div>
                <Badge variant="success" className="shrink-0 uppercase">
                  Completed
                </Badge>
              </div>

              <div className="border-border/50 border-y py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-text-muted size-3.5" />
                  <div className="flex flex-col">
                    <span className="text-text-muted text-label-sm font-black tracking-tighter uppercase">
                      Date
                    </span>
                    <span className="text-xs font-bold">
                      {sub.session.submittedAt ? formatDate(sub.session.submittedAt) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 gap-2 text-xs font-bold"
                  disabled={!sub.href}
                  render={sub.href ? <Link href={sub.href} /> : undefined}
                >
                  <Eye className="size-3.5" /> View Answers
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {submitted.length === 0 && (
        <div className="border-border bg-surface rounded-xl border border-dashed py-12 text-center">
          <FileText className="text-text-muted/20 mx-auto mb-4 size-12" />
          <p className="text-text-muted font-medium">No submissions recorded yet.</p>
        </div>
      )}
    </div>
  );
}
