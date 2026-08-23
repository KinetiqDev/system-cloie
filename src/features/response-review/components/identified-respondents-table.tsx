import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMean } from "./format";
import type { ProgramHeadRespondentRow } from "../types";

type IdentifiedRespondentsTableProps = {
  respondents: ProgramHeadRespondentRow[];
  /** Build the response-detail path for one submitted response. */
  responseHref: (responseId: string) => string;
};

export function IdentifiedRespondentsTable({
  respondents,
  responseHref,
}: IdentifiedRespondentsTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Submitted Respondents</h2>
        <p className="text-text-muted text-sm">
          Program Heads can inspect identified submitted responses and term-specific academic context.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Respondent</TableHead>
            <TableHead>Major</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Response mean</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {respondents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-text-muted text-center">
                No submitted evidence yet.
              </TableCell>
            </TableRow>
          ) : (
            respondents.map((row) => (
              <TableRow key={row.responseId}>
                <TableCell>
                  <Link
                    href={responseHref(row.responseId)}
                    className="text-link underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>{row.majorLabel ?? "—"}</TableCell>
                <TableCell>{row.yearLevel ?? "—"}</TableCell>
                <TableCell>{row.section ?? "—"}</TableCell>
                <TableCell>{row.submittedAt.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMean(row.quantitativeMean)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}