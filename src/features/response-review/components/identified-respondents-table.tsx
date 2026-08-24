import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
    <Card>
      <CardHeader>
        <CardTitle>Submitted respondents</CardTitle>
        <CardDescription>
          Identified submitted responses and term-specific academic context. Program Head access
          only.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  No submitted evidence yet.
                </TableCell>
              </TableRow>
            ) : (
              respondents.map((row) => (
                <TableRow key={row.responseId}>
                  <TableCell>
                    <Link
                      href={responseHref(row.responseId)}
                      className="text-link font-semibold underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.majorLabel ?? "—"}</TableCell>
                  <TableCell>{row.yearLevel ?? "—"}</TableCell>
                  <TableCell>{row.section ?? "—"}</TableCell>
                  <TableCell>{dateTimeFormatter.format(row.submittedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMean(row.quantitativeMean)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
