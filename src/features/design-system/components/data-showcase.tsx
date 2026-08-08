"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressListReference } from "./progress-reference";
import {
  SHOWCASE_KPIS,
  SHOWCASE_PROGRAMS,
  SHOWCASE_PROGRESS_ITEMS,
  SHOWCASE_TAB_CONTENT,
  type ShowcaseStatus,
} from "@/features/design-system/data/showcase-fixtures";

const STATUS_ICON: Record<ShowcaseStatus, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  information: Info,
};

const STATUS_BADGE_VARIANT: Record<ShowcaseStatus, "success" | "warning" | "destructive" | "information"> = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  information: "information",
};

export function DataShowcase() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Statistic cards</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {SHOWCASE_KPIS.map((kpi) => (
            <Card key={kpi.id} className="w-full">
              <CardHeader>
                <CardTitle className="text-title-sm">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <span className="font-heading text-heading-xl text-foreground">{kpi.value}</span>
                <CardDescription>{kpi.change}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Table with status badges</h3>
        <div className="rounded-lg border border-border bg-card">
          <Table className="[&_tr]:last:border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SHOWCASE_PROGRAMS.map((program) => {
                const StatusIcon = STATUS_ICON[program.status];
                return (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell className="font-mono text-xs">{program.code}</TableCell>
                    <TableCell>{program.courseCount}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[program.status]} className="gap-1">
                        <StatusIcon aria-hidden className="size-3.5" />
                        {program.statusLabel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Tabs</h3>
        <div className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-caption text-muted-foreground font-medium uppercase">
              Segmented · default
            </p>
            <Tabs defaultValue={SHOWCASE_TAB_CONTENT[0].id} className="w-full">
              <TabsList>
                {SHOWCASE_TAB_CONTENT.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.heading}
                  </TabsTrigger>
                ))}
              </TabsList>
              {SHOWCASE_TAB_CONTENT.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <p className="text-body-sm text-muted-foreground">{tab.body}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-caption text-muted-foreground font-medium uppercase">Pill</p>
            <Tabs defaultValue={SHOWCASE_TAB_CONTENT[0].id} className="w-full">
              <TabsList variant="pill">
                {SHOWCASE_TAB_CONTENT.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.heading}
                  </TabsTrigger>
                ))}
              </TabsList>
              {SHOWCASE_TAB_CONTENT.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <p className="text-body-sm text-muted-foreground">{tab.body}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-caption text-muted-foreground font-medium uppercase">Line</p>
            <Tabs defaultValue={SHOWCASE_TAB_CONTENT[0].id} className="w-full">
              <TabsList variant="line" className="h-auto gap-4">
                {SHOWCASE_TAB_CONTENT.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-1 py-2.5">
                    {tab.heading}
                  </TabsTrigger>
                ))}
              </TabsList>
              {SHOWCASE_TAB_CONTENT.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <p className="text-body-sm text-muted-foreground">{tab.body}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Progress</h3>
        <div className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <ProgressListReference items={SHOWCASE_PROGRESS_ITEMS} />
        </div>
      </section>
    </div>
  );
}
