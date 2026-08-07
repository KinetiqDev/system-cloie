"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Edit, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { duplicateFacultyTemplateAction } from "@/lib/actions/faculty-template-actions";
import type { FacultyTemplateItem } from "../services/list-faculty-templates";

type TemplatesGridProps = {
  program: { code: string; id: string; name: string };
  templates: FacultyTemplateItem[];
};

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(templateId: string) {
    startTransition(async () => {
      const result = await duplicateFacultyTemplateAction(templateId);

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      showToast("Template duplicated successfully.");
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="text-muted-foreground mx-auto mb-4 size-10" />
          <p className="text-muted-foreground text-sm">
            No templates with faculty access are available yet. Contact your Program Head to enable
            faculty access on evaluation templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const isOwned = Boolean(template.facultyOwnerId);

        return (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="line-clamp-2 text-base font-bold">
                      {template.name}
                    </CardTitle>
                  </div>
                  <Badge variant={isOwned ? "outline" : "default"} className="shrink-0">
                    {isOwned ? "My Copy" : "Shared"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.description && (
                <p className="text-muted-foreground line-clamp-2 text-sm">{template.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {template.programCode
                    ? `${template.programCode} - Program-owned`
                    : "Institutional baseline"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {template.versionCount} version
                  {template.versionCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  render={<Link href={`/faculty/tools/${template.id}/edit`} />}
                >
                  <Edit className="mr-2 size-4" />
                  Edit Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => handleDuplicate(template.id)}
                >
                  <Copy className="mr-2 size-4" />
                  Duplicate
                </Button>
                {isOwned && (
                  <Button
                    size="sm"
                    className="w-full"
                    render={
                      <Link href={`/faculty/cilo-evaluations/new?templateId=${template.id}`} />
                    }
                  >
                    <Send className="mr-2 size-4" />
                    Publish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
